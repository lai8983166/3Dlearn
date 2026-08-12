import { useAppStore, type PbrState, type OpticsState } from '@/store';
import type { Tour, TourStep, NarrationState } from './types';

/**
 * Snapshot of the user-controllable state at the moment a tour starts.
 * Used by the "restore to before tour" affordance.
 */
interface Snapshot {
  pbr: PbrState;
  optics: OpticsState;
}

function takeSnapshot(): Snapshot {
  const { pbr, optics } = useAppStore.getState();
  return {
    pbr: { ...pbr, layers: { ...pbr.layers } },
    optics: { ...optics },
  };
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(t);
        resolve();
      },
      { once: true },
    );
  });
}

/**
 * Tour runner — singleton. Owns the active tour, its animation loop, and
 * the pre-tour snapshot for restore.
 *
 * Cancellation rules:
 *   - User skips → cancel, keep snapshot for restore.
 *   - User manually operates UI (lastUpdater='user') → cancel, keep snapshot.
 *   - Tour completes naturally → cancel(null), keep snapshot.
 *   - Runner starts another tour → cancel previous, replace snapshot.
 *
 * Snapshot lifetime: kept until the user manually acts (any 'user' update)
 * or starts another tour. Restore is offered in the tour dropdown.
 */
class TourRunner {
  private current: Tour | null = null;
  private snapshot: Snapshot | null = null;
  private stepAbort: AbortController | null = null;
  private unsub: (() => void) | null = null;

  constructor() {
    this.unsub = useAppStore.subscribe((state, prevState) => {
      if (!this.current) return;
      // Detect a user-initiated store write while a tour is running.
      // 'system' writes (e.g. HDRI status) don't interrupt.
      if (
        state.lastUpdater === 'user' &&
        prevState.lastUpdater !== 'user'
      ) {
        this.cancel('user-action');
      }
    });
  }

  isActive(): boolean {
    return this.current !== null;
  }

  hasSnapshot(): boolean {
    return this.snapshot !== null;
  }

  start(tour: Tour) {
    if (this.current) this.cancel('replaced');
    this.current = tour;
    this.snapshot = takeSnapshot();
    useAppStore.getState().setActiveInterruption({ kind: 'tour', tourId: tour.id });
    // Switch to the tour's module as a 'tour' update so the activeInterruption
    // state isn't tripped by a 'user'-tagged setModule call.
    useAppStore.setState({
      activeModule: tour.module,
      lastUpdater: 'tour',
    });

    void this.runLoop(tour);
  }

  skip() {
    if (!this.current) return;
    this.cancel('user-skip');
  }

  restore() {
    if (!this.snapshot) return;
    const snap = this.snapshot;
    this.snapshot = null;
    useAppStore.setState({
      pbr: snap.pbr,
      optics: snap.optics,
      lastUpdater: 'tour',
      narration: null,
    });
    useAppStore.getState().setActiveInterruption({ kind: 'none' });
  }

  private async runLoop(tour: Tour) {
    try {
      for (let i = 0; i < tour.steps.length; i++) {
        if (!this.current) return;
        const step = tour.steps[i];

        const narration: NarrationState = {
          tourId: tour.id,
          text: step.narration,
          stepIndex: i,
          stepCount: tour.steps.length,
        };
        useAppStore.setState({ narration });

        this.stepAbort = new AbortController();
        await this.runStep(step, this.stepAbort.signal);
        if (!this.current) return;

        if (step.holdMs) {
          await delay(step.holdMs, this.stepAbort.signal);
          if (!this.current) return;
        }
      }
      // Completed naturally.
      this.cancel('completed');
    } catch (err) {
      console.error('[tour] runner error:', err);
      this.cancel('error');
    }
  }

  private async runStep(step: TourStep, signal: AbortSignal) {
    const applyTarget = () => applyStepToStore(step);

    // For 0-duration steps, jump immediately and return.
    if (step.durationMs <= 0) {
      if (!signal.aborted) applyTarget();
      return;
    }

    // Animate numeric fields; jump non-numeric ones up front.
    const startVals = captureNumericStart(step);
    applyNonNumericTargets(step);

    return new Promise<void>((resolve) => {
      const startTime = performance.now();
      const duration = step.durationMs;
      const tick = () => {
        if (signal.aborted) {
          resolve();
          return;
        }
        const elapsed = performance.now() - startTime;
        const t = Math.min(1, elapsed / duration);
        const eased = easeInOutCubic(t);
        applyNumericInterpolated(step, startVals, eased);
        if (t < 1) {
          requestAnimationFrame(tick);
        } else {
          resolve();
        }
      };
      requestAnimationFrame(tick);
    });
  }

  private cancel(_reason: 'user-skip' | 'user-action' | 'completed' | 'replaced' | 'error' | 'destroyed') {
    if (this.stepAbort) {
      this.stepAbort.abort();
      this.stepAbort = null;
    }
    this.current = null;
    useAppStore.setState({ narration: null });
    // Only release the focus if we still own it. A tour may have been
    // replaced by another tour (which set its own activeInterruption).
    const current = useAppStore.getState().activeInterruption;
    if (current.kind === 'tour') {
      useAppStore.getState().setActiveInterruption({ kind: 'none' });
    }
  }

  destroy() {
    this.cancel('destroyed');
    this.unsub?.();
    this.unsub = null;
  }
}

// ---- step application helpers ----------------------------------------------

type NumericPbrKeys = {
  [K in keyof PbrState]: PbrState[K] extends number ? K : never;
}[keyof PbrState];
type NumericOpticsKeys = {
  [K in keyof OpticsState]: OpticsState[K] extends number ? K : never;
}[keyof OpticsState];

const NUMERIC_PBR_KEYS: ReadonlySet<NumericPbrKeys> = new Set([
  'diffuseIntensity',
  'specularIntensity',
  'roughness',
  'metalness',
  'shininess',
]);
const NUMERIC_OPTICS_KEYS: ReadonlySet<NumericOpticsKeys> = new Set([
  'focalLength',
  'objectX',
  'objectHeight',
  'rayCount',
]);

interface CapturedNumericStart {
  pbr: Partial<Record<NumericPbrKeys, number>>;
  optics: Partial<Record<NumericOpticsKeys, number>>;
}

function captureNumericStart(step: TourStep): CapturedNumericStart {
  const { pbr, optics } = useAppStore.getState();
  const start: CapturedNumericStart = { pbr: {}, optics: {} };
  if (step.pbr) {
    for (const k of Object.keys(step.pbr) as NumericPbrKeys[]) {
      if (NUMERIC_PBR_KEYS.has(k) && typeof pbr[k] === 'number') {
        start.pbr[k] = pbr[k] as number;
      }
    }
  }
  if (step.optics) {
    for (const k of Object.keys(step.optics) as NumericOpticsKeys[]) {
      if (NUMERIC_OPTICS_KEYS.has(k) && typeof optics[k] === 'number') {
        start.optics[k] = optics[k] as number;
      }
    }
  }
  return start;
}

function applyNonNumericTargets(step: TourStep) {
  const pbrPatch: Partial<PbrState> = {};
  if (step.pbr) {
    (Object.keys(step.pbr) as (keyof PbrState)[]).forEach((k) => {
      if (!NUMERIC_PBR_KEYS.has(k as NumericPbrKeys)) {
        // TS can't narrow generics here cleanly; cast through unknown.
        (pbrPatch as Record<string, unknown>)[k] = step.pbr![k];
      }
    });
  }
  if (step.layerToggles) {
    pbrPatch.layers = {
      ...useAppStore.getState().pbr.layers,
      ...step.layerToggles,
    };
  }

  const opticsPatch: Partial<OpticsState> = {};
  if (step.optics) {
    (Object.keys(step.optics) as (keyof OpticsState)[]).forEach((k) => {
      if (!NUMERIC_OPTICS_KEYS.has(k as NumericOpticsKeys)) {
        (opticsPatch as Record<string, unknown>)[k] = step.optics![k];
      }
    });
  }

  if (Object.keys(pbrPatch).length > 0 || Object.keys(opticsPatch).length > 0) {
    useAppStore.setState((s) => ({
      pbr: { ...s.pbr, ...pbrPatch },
      optics: { ...s.optics, ...opticsPatch },
      lastUpdater: 'tour',
    }));
  }
}

function applyNumericInterpolated(
  step: TourStep,
  start: CapturedNumericStart,
  progress: number,
) {
  let pbrChanged = false;
  let opticsChanged = false;
  const pbrPatch: Partial<PbrState> = {};
  const opticsPatch: Partial<OpticsState> = {};

  if (step.pbr) {
    for (const k of Object.keys(step.pbr) as NumericPbrKeys[]) {
      if (!NUMERIC_PBR_KEYS.has(k)) continue;
      const targetVal = step.pbr[k] as number;
      const startVal = start.pbr[k];
      if (typeof startVal !== 'number') continue;
      const v = startVal + (targetVal - startVal) * progress;
      (pbrPatch as Record<string, unknown>)[k] = v;
      pbrChanged = true;
    }
  }
  if (step.optics) {
    for (const k of Object.keys(step.optics) as NumericOpticsKeys[]) {
      if (!NUMERIC_OPTICS_KEYS.has(k)) continue;
      const targetVal = step.optics[k] as number;
      const startVal = start.optics[k];
      if (typeof startVal !== 'number') continue;
      const v = startVal + (targetVal - startVal) * progress;
      (opticsPatch as Record<string, unknown>)[k] = v;
      opticsChanged = true;
    }
  }

  if (!pbrChanged && !opticsChanged) return;
  useAppStore.setState((s) => ({
    pbr: pbrChanged ? { ...s.pbr, ...pbrPatch } : s.pbr,
    optics: opticsChanged ? { ...s.optics, ...opticsPatch } : s.optics,
    lastUpdater: 'tour',
  }));
}

function applyStepToStore(step: TourStep) {
  // Used only for 0-duration steps — applies everything at once.
  applyNonNumericTargets(step);
  const pbrPatch: Partial<PbrState> = {};
  const opticsPatch: Partial<OpticsState> = {};
  if (step.pbr) {
    (Object.keys(step.pbr) as NumericPbrKeys[]).forEach((k) => {
      if (NUMERIC_PBR_KEYS.has(k)) {
        (pbrPatch as Record<string, unknown>)[k] = step.pbr![k];
      }
    });
  }
  if (step.optics) {
    (Object.keys(step.optics) as NumericOpticsKeys[]).forEach((k) => {
      if (NUMERIC_OPTICS_KEYS.has(k)) {
        (opticsPatch as Record<string, unknown>)[k] = step.optics![k];
      }
    });
  }
  useAppStore.setState((s) => ({
    pbr: Object.keys(pbrPatch).length ? { ...s.pbr, ...pbrPatch } : s.pbr,
    optics: Object.keys(opticsPatch).length ? { ...s.optics, ...opticsPatch } : s.optics,
    lastUpdater: 'tour',
  }));
}

/** Module-level singleton. Construction wires the store subscription. */
export const tourRunner = new TourRunner();

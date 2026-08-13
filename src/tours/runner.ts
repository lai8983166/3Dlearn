import {
  useAppStore,
  type PbrState,
  type OpticsState,
  type ShadowsState,
  type TexturesState,
  type TransformsState,
  type ColorsState,
  type DepthState,
  type BloomState,
  type BrdfState,
} from '@/store';
import type { Tour, TourStep, NarrationState } from './types';

/**
 * Snapshot of the user-controllable state at the moment a tour starts.
 * Used by the "restore to before tour" affordance.
 */
interface Snapshot {
  pbr: PbrState;
  optics: OpticsState;
  shadows: ShadowsState;
  textures: TexturesState;
  transforms: TransformsState;
  colors: ColorsState;
  depth: DepthState;
  bloom: BloomState;
  brdf: BrdfState;
}

function takeSnapshot(): Snapshot {
  const { pbr, optics, shadows, textures, transforms, colors, depth, bloom, brdf } = useAppStore.getState();
  return {
    pbr: { ...pbr, layers: { ...pbr.layers } },
    optics: { ...optics },
    shadows: { ...shadows },
    textures: { ...textures },
    transforms: {
      ...transforms,
      translate: [transforms.translate[0], transforms.translate[1], transforms.translate[2]],
      rotate: [transforms.rotate[0], transforms.rotate[1], transforms.rotate[2]],
      scale: [transforms.scale[0], transforms.scale[1], transforms.scale[2]],
    },
    colors: { ...colors },
    depth: { ...depth },
    bloom: { ...bloom, layers: { ...bloom.layers } },
    brdf: { ...brdf },
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
      shadows: snap.shadows,
      textures: snap.textures,
      transforms: snap.transforms,
      colors: snap.colors,
      depth: snap.depth,
      bloom: snap.bloom,
      brdf: snap.brdf,
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
type NumericShadowKeys = {
  [K in keyof ShadowsState]: ShadowsState[K] extends number ? K : never;
}[keyof ShadowsState];
type NumericTextureKeys = {
  [K in keyof TexturesState]: TexturesState[K] extends number ? K : never;
}[keyof TexturesState];
type NumericColorKeys = {
  [K in keyof ColorsState]: ColorsState[K] extends number ? K : never;
}[keyof ColorsState];
type NumericDepthKeys = {
  [K in keyof DepthState]: DepthState[K] extends number ? K : never;
}[keyof DepthState];
type NumericBloomKeys = {
  [K in keyof BloomState]: BloomState[K] extends number ? K : never;
}[keyof BloomState];
type NumericBrdfKeys = {
  [K in keyof BrdfState]: BrdfState[K] extends number ? K : never;
}[keyof BrdfState];

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
const NUMERIC_SHADOW_KEYS: ReadonlySet<NumericShadowKeys> = new Set([
  'bias',
  'lightYaw',
  'lightPitch',
  // resolution excluded: animating 256→2048 generates illegal intermediate sizes.
]);
const NUMERIC_TEXTURE_KEYS: ReadonlySet<NumericTextureKeys> = new Set([
  'anisotropy',
  'tiling',
  'offset',
  // checkerCells excluded: integer-only; regenerating texture per-frame is wasteful.
]);
const NUMERIC_COLOR_KEYS: ReadonlySet<NumericColorKeys> = new Set([
  'exposure',
]);
const NUMERIC_DEPTH_KEYS: ReadonlySet<NumericDepthKeys> = new Set([
  'polygonOffsetFactor',
  'cameraDistance',
]);
const NUMERIC_BLOOM_KEYS: ReadonlySet<NumericBloomKeys> = new Set([
  'threshold',
  'softKnee',
  'blurRadius',
  'compositeStrength',
  'lightIntensity',
]);
const NUMERIC_BRDF_KEYS: ReadonlySet<NumericBrdfKeys> = new Set([
  'roughness',
  'lightYaw',
  'lightPitch',
  'specularIntensity',
]);

/**
 * Transforms tuple keys. translate/rotate/scale are arrays of three
 * numbers — we tween each axis independently via element-wise lerp.
 */
const TUPLE_TRANSFORM_KEYS: ReadonlySet<'translate' | 'rotate' | 'scale'> = new Set([
  'translate',
  'rotate',
  'scale',
]);

interface CapturedTupleStart {
  translate?: [number, number, number];
  rotate?: [number, number, number];
  scale?: [number, number, number];
}

interface CapturedNumericStart {
  pbr: Partial<Record<NumericPbrKeys, number>>;
  optics: Partial<Record<NumericOpticsKeys, number>>;
  shadows: Partial<Record<NumericShadowKeys, number>>;
  textures: Partial<Record<NumericTextureKeys, number>>;
  colors: Partial<Record<NumericColorKeys, number>>;
  depth: Partial<Record<NumericDepthKeys, number>>;
  bloom: Partial<Record<NumericBloomKeys, number>>;
  brdf: Partial<Record<NumericBrdfKeys, number>>;
  transformsTuples: CapturedTupleStart;
}

function captureNumericStart(step: TourStep): CapturedNumericStart {
  const { pbr, optics, shadows, textures, transforms, colors, depth, bloom, brdf } = useAppStore.getState();
  const start: CapturedNumericStart = {
    pbr: {},
    optics: {},
    shadows: {},
    textures: {},
    colors: {},
    depth: {},
    bloom: {},
    brdf: {},
    transformsTuples: {},
  };
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
  if (step.shadows) {
    for (const k of Object.keys(step.shadows) as NumericShadowKeys[]) {
      if (NUMERIC_SHADOW_KEYS.has(k) && typeof shadows[k] === 'number') {
        start.shadows[k] = shadows[k] as number;
      }
    }
  }
  if (step.textures) {
    for (const k of Object.keys(step.textures) as NumericTextureKeys[]) {
      if (NUMERIC_TEXTURE_KEYS.has(k) && typeof textures[k] === 'number') {
        start.textures[k] = textures[k] as number;
      }
    }
  }
  if (step.colors) {
    for (const k of Object.keys(step.colors) as NumericColorKeys[]) {
      if (NUMERIC_COLOR_KEYS.has(k) && typeof colors[k] === 'number') {
        start.colors[k] = colors[k] as number;
      }
    }
  }
  if (step.depth) {
    for (const k of Object.keys(step.depth) as NumericDepthKeys[]) {
      if (NUMERIC_DEPTH_KEYS.has(k) && typeof depth[k] === 'number') {
        start.depth[k] = depth[k] as number;
      }
    }
  }
  if (step.bloom) {
    for (const k of Object.keys(step.bloom) as NumericBloomKeys[]) {
      if (NUMERIC_BLOOM_KEYS.has(k) && typeof bloom[k] === 'number') {
        start.bloom[k] = bloom[k] as number;
      }
    }
  }
  if (step.brdf) {
    for (const k of Object.keys(step.brdf) as NumericBrdfKeys[]) {
      if (NUMERIC_BRDF_KEYS.has(k) && typeof brdf[k] === 'number') {
        start.brdf[k] = brdf[k] as number;
      }
    }
  }
  if (step.transforms) {
    for (const k of Object.keys(step.transforms) as ('translate' | 'rotate' | 'scale')[]) {
      if (TUPLE_TRANSFORM_KEYS.has(k)) {
        const current = transforms[k];
        start.transformsTuples[k] = [current[0], current[1], current[2]];
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

  const shadowsPatch: Partial<ShadowsState> = {};
  if (step.shadows) {
    (Object.keys(step.shadows) as (keyof ShadowsState)[]).forEach((k) => {
      if (!NUMERIC_SHADOW_KEYS.has(k as NumericShadowKeys)) {
        (shadowsPatch as Record<string, unknown>)[k] = step.shadows![k];
      }
    });
  }

  const texturesPatch: Partial<TexturesState> = {};
  if (step.textures) {
    (Object.keys(step.textures) as (keyof TexturesState)[]).forEach((k) => {
      if (!NUMERIC_TEXTURE_KEYS.has(k as NumericTextureKeys)) {
        (texturesPatch as Record<string, unknown>)[k] = step.textures![k];
      }
    });
  }

  // Transforms: tuple keys are tweened (handled in applyNumericInterpolated).
  // `order` and any non-tuple future fields fall through here.
  const transformsPatch: Partial<TransformsState> = {};
  if (step.transforms) {
    (Object.keys(step.transforms) as (keyof TransformsState)[]).forEach((k) => {
      if (!TUPLE_TRANSFORM_KEYS.has(k as 'translate' | 'rotate' | 'scale')) {
        (transformsPatch as Record<string, unknown>)[k] = step.transforms![k];
      }
    });
  }

  const colorsPatch: Partial<ColorsState> = {};
  if (step.colors) {
    (Object.keys(step.colors) as (keyof ColorsState)[]).forEach((k) => {
      if (!NUMERIC_COLOR_KEYS.has(k as NumericColorKeys)) {
        (colorsPatch as Record<string, unknown>)[k] = step.colors![k];
      }
    });
  }

  const depthPatch: Partial<DepthState> = {};
  if (step.depth) {
    (Object.keys(step.depth) as (keyof DepthState)[]).forEach((k) => {
      if (!NUMERIC_DEPTH_KEYS.has(k as NumericDepthKeys)) {
        (depthPatch as Record<string, unknown>)[k] = step.depth![k];
      }
    });
  }

  const bloomPatch: Partial<BloomState> = {};
  if (step.bloom) {
    (Object.keys(step.bloom) as (keyof BloomState)[]).forEach((k) => {
      if (!NUMERIC_BLOOM_KEYS.has(k as NumericBloomKeys)) {
        (bloomPatch as Record<string, unknown>)[k] = step.bloom![k];
      }
    });
  }
  if (step.bloomLayerToggles) {
    bloomPatch.layers = {
      ...useAppStore.getState().bloom.layers,
      ...step.bloomLayerToggles,
    };
  }

  const brdfPatch: Partial<BrdfState> = {};
  if (step.brdf) {
    (Object.keys(step.brdf) as (keyof BrdfState)[]).forEach((k) => {
      if (!NUMERIC_BRDF_KEYS.has(k as NumericBrdfKeys)) {
        (brdfPatch as Record<string, unknown>)[k] = step.brdf![k];
      }
    });
  }

  const anyChange =
    Object.keys(pbrPatch).length > 0 ||
    Object.keys(opticsPatch).length > 0 ||
    Object.keys(shadowsPatch).length > 0 ||
    Object.keys(texturesPatch).length > 0 ||
    Object.keys(transformsPatch).length > 0 ||
    Object.keys(colorsPatch).length > 0 ||
    Object.keys(depthPatch).length > 0 ||
    Object.keys(bloomPatch).length > 0 ||
    Object.keys(brdfPatch).length > 0;

  if (anyChange) {
    useAppStore.setState((s) => ({
      pbr: { ...s.pbr, ...pbrPatch },
      optics: { ...s.optics, ...opticsPatch },
      shadows: { ...s.shadows, ...shadowsPatch },
      textures: { ...s.textures, ...texturesPatch },
      transforms: { ...s.transforms, ...transformsPatch },
      colors: { ...s.colors, ...colorsPatch },
      depth: { ...s.depth, ...depthPatch },
      bloom: { ...s.bloom, ...bloomPatch },
      brdf: { ...s.brdf, ...brdfPatch },
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
  let shadowsChanged = false;
  let texturesChanged = false;
  let colorsChanged = false;
  let depthChanged = false;
  let bloomChanged = false;
  let brdfChanged = false;
  let transformsTupleChanged = false;
  const pbrPatch: Partial<PbrState> = {};
  const opticsPatch: Partial<OpticsState> = {};
  const shadowsPatch: Partial<ShadowsState> = {};
  const texturesPatch: Partial<TexturesState> = {};
  const colorsPatch: Partial<ColorsState> = {};
  const depthPatch: Partial<DepthState> = {};
  const bloomPatch: Partial<BloomState> = {};
  const brdfPatch: Partial<BrdfState> = {};
  let transformsTuplePatch: Partial<Pick<TransformsState, 'translate' | 'rotate' | 'scale'>> = {};

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
  if (step.shadows) {
    for (const k of Object.keys(step.shadows) as NumericShadowKeys[]) {
      if (!NUMERIC_SHADOW_KEYS.has(k)) continue;
      const targetVal = step.shadows[k] as number;
      const startVal = start.shadows[k];
      if (typeof startVal !== 'number') continue;
      const v = startVal + (targetVal - startVal) * progress;
      (shadowsPatch as Record<string, unknown>)[k] = v;
      shadowsChanged = true;
    }
  }
  if (step.textures) {
    for (const k of Object.keys(step.textures) as NumericTextureKeys[]) {
      if (!NUMERIC_TEXTURE_KEYS.has(k)) continue;
      const targetVal = step.textures[k] as number;
      const startVal = start.textures[k];
      if (typeof startVal !== 'number') continue;
      const v = startVal + (targetVal - startVal) * progress;
      (texturesPatch as Record<string, unknown>)[k] = v;
      texturesChanged = true;
    }
  }
  if (step.colors) {
    for (const k of Object.keys(step.colors) as NumericColorKeys[]) {
      if (!NUMERIC_COLOR_KEYS.has(k)) continue;
      const targetVal = step.colors[k] as number;
      const startVal = start.colors[k];
      if (typeof startVal !== 'number') continue;
      const v = startVal + (targetVal - startVal) * progress;
      (colorsPatch as Record<string, unknown>)[k] = v;
      colorsChanged = true;
    }
  }
  if (step.depth) {
    for (const k of Object.keys(step.depth) as NumericDepthKeys[]) {
      if (!NUMERIC_DEPTH_KEYS.has(k)) continue;
      const targetVal = step.depth[k] as number;
      const startVal = start.depth[k];
      if (typeof startVal !== 'number') continue;
      const v = startVal + (targetVal - startVal) * progress;
      (depthPatch as Record<string, unknown>)[k] = v;
      depthChanged = true;
    }
  }
  if (step.bloom) {
    for (const k of Object.keys(step.bloom) as NumericBloomKeys[]) {
      if (!NUMERIC_BLOOM_KEYS.has(k)) continue;
      const targetVal = step.bloom[k] as number;
      const startVal = start.bloom[k];
      if (typeof startVal !== 'number') continue;
      const v = startVal + (targetVal - startVal) * progress;
      (bloomPatch as Record<string, unknown>)[k] = v;
      bloomChanged = true;
    }
  }
  if (step.brdf) {
    for (const k of Object.keys(step.brdf) as NumericBrdfKeys[]) {
      if (!NUMERIC_BRDF_KEYS.has(k)) continue;
      const targetVal = step.brdf[k] as number;
      const startVal = start.brdf[k];
      if (typeof startVal !== 'number') continue;
      const v = startVal + (targetVal - startVal) * progress;
      (brdfPatch as Record<string, unknown>)[k] = v;
      brdfChanged = true;
    }
  }
  if (step.transforms) {
    for (const k of Object.keys(step.transforms) as ('translate' | 'rotate' | 'scale')[]) {
      if (!TUPLE_TRANSFORM_KEYS.has(k)) continue;
      const target = step.transforms[k];
      const startTuple = start.transformsTuples[k];
      if (!startTuple || !Array.isArray(target)) continue;
      const interp: [number, number, number] = [
        startTuple[0] + (target[0] - startTuple[0]) * progress,
        startTuple[1] + (target[1] - startTuple[1]) * progress,
        startTuple[2] + (target[2] - startTuple[2]) * progress,
      ];
      transformsTuplePatch = { ...transformsTuplePatch, [k]: interp };
      transformsTupleChanged = true;
    }
  }

  if (
    !pbrChanged &&
    !opticsChanged &&
    !shadowsChanged &&
    !texturesChanged &&
    !colorsChanged &&
    !depthChanged &&
    !bloomChanged &&
    !brdfChanged &&
    !transformsTupleChanged
  ) {
    return;
  }
  useAppStore.setState((s) => ({
    pbr: pbrChanged ? { ...s.pbr, ...pbrPatch } : s.pbr,
    optics: opticsChanged ? { ...s.optics, ...opticsPatch } : s.optics,
    shadows: shadowsChanged ? { ...s.shadows, ...shadowsPatch } : s.shadows,
    textures: texturesChanged ? { ...s.textures, ...texturesPatch } : s.textures,
    colors: colorsChanged ? { ...s.colors, ...colorsPatch } : s.colors,
    depth: depthChanged ? { ...s.depth, ...depthPatch } : s.depth,
    bloom: bloomChanged ? { ...s.bloom, ...bloomPatch } : s.bloom,
    brdf: brdfChanged ? { ...s.brdf, ...brdfPatch } : s.brdf,
    transforms: transformsTupleChanged
      ? { ...s.transforms, ...transformsTuplePatch }
      : s.transforms,
    lastUpdater: 'tour',
  }));
}

function applyStepToStore(step: TourStep) {
  // Used only for 0-duration steps — applies everything at once.
  applyNonNumericTargets(step);
  const pbrPatch: Partial<PbrState> = {};
  const opticsPatch: Partial<OpticsState> = {};
  const shadowsPatch: Partial<ShadowsState> = {};
  const texturesPatch: Partial<TexturesState> = {};
  const colorsPatch: Partial<ColorsState> = {};
  const depthPatch: Partial<DepthState> = {};
  const bloomPatch: Partial<BloomState> = {};
  const brdfPatch: Partial<BrdfState> = {};
  const transformsTuplePatch: Partial<TransformsState> = {};
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
  if (step.shadows) {
    (Object.keys(step.shadows) as NumericShadowKeys[]).forEach((k) => {
      if (NUMERIC_SHADOW_KEYS.has(k)) {
        (shadowsPatch as Record<string, unknown>)[k] = step.shadows![k];
      }
    });
  }
  if (step.textures) {
    (Object.keys(step.textures) as NumericTextureKeys[]).forEach((k) => {
      if (NUMERIC_TEXTURE_KEYS.has(k)) {
        (texturesPatch as Record<string, unknown>)[k] = step.textures![k];
      }
    });
  }
  if (step.colors) {
    (Object.keys(step.colors) as NumericColorKeys[]).forEach((k) => {
      if (NUMERIC_COLOR_KEYS.has(k)) {
        (colorsPatch as Record<string, unknown>)[k] = step.colors![k];
      }
    });
  }
  if (step.depth) {
    (Object.keys(step.depth) as NumericDepthKeys[]).forEach((k) => {
      if (NUMERIC_DEPTH_KEYS.has(k)) {
        (depthPatch as Record<string, unknown>)[k] = step.depth![k];
      }
    });
  }
  if (step.bloom) {
    (Object.keys(step.bloom) as NumericBloomKeys[]).forEach((k) => {
      if (NUMERIC_BLOOM_KEYS.has(k)) {
        (bloomPatch as Record<string, unknown>)[k] = step.bloom![k];
      }
    });
  }
  if (step.brdf) {
    (Object.keys(step.brdf) as NumericBrdfKeys[]).forEach((k) => {
      if (NUMERIC_BRDF_KEYS.has(k)) {
        (brdfPatch as Record<string, unknown>)[k] = step.brdf![k];
      }
    });
  }
  if (step.transforms) {
    (Object.keys(step.transforms) as ('translate' | 'rotate' | 'scale')[]).forEach((k) => {
      if (TUPLE_TRANSFORM_KEYS.has(k)) {
        const target = step.transforms![k];
        if (Array.isArray(target)) {
          (transformsTuplePatch as Record<string, unknown>)[k] = [
            target[0],
            target[1],
            target[2],
          ];
        }
      }
    });
  }
  useAppStore.setState((s) => ({
    pbr: Object.keys(pbrPatch).length ? { ...s.pbr, ...pbrPatch } : s.pbr,
    optics: Object.keys(opticsPatch).length ? { ...s.optics, ...opticsPatch } : s.optics,
    shadows: Object.keys(shadowsPatch).length ? { ...s.shadows, ...shadowsPatch } : s.shadows,
    textures: Object.keys(texturesPatch).length ? { ...s.textures, ...texturesPatch } : s.textures,
    colors: Object.keys(colorsPatch).length ? { ...s.colors, ...colorsPatch } : s.colors,
    depth: Object.keys(depthPatch).length ? { ...s.depth, ...depthPatch } : s.depth,
    bloom: Object.keys(bloomPatch).length ? { ...s.bloom, ...bloomPatch } : s.bloom,
    brdf: Object.keys(brdfPatch).length ? { ...s.brdf, ...brdfPatch } : s.brdf,
    transforms: Object.keys(transformsTuplePatch).length
      ? { ...s.transforms, ...transformsTuplePatch }
      : s.transforms,
    lastUpdater: 'tour',
  }));
}

/** Module-level singleton. Construction wires the store subscription. */
export const tourRunner = new TourRunner();

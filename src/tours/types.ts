import type {
  ModuleId,
  PbrState,
  OpticsState,
  ShadowsState,
  TexturesState,
  TransformsState,
  ColorsState,
} from '@/store';

/**
 * One step of a guided tour. The runner tweens (for numeric fields) or
 * jumps (for booleans / strings) from the current store state toward
 * `targets`, then holds for `holdMs` before starting the next step.
 *
 * Targets are scoped per-module — a PBR step only writes PBR state,
 * optics only writes optics. The tour's `module` field decides which
 * scope applies for the whole tour.
 */
export interface TourStep {
  /** PBR state to drive toward. Numeric fields animate; others jump. */
  pbr?: Partial<PbrState>;
  /** Optics state to drive toward. */
  optics?: Partial<OpticsState>;
  /** Shadows state to drive toward. */
  shadows?: Partial<ShadowsState>;
  /** Textures state to drive toward. */
  textures?: Partial<TexturesState>;
  /** Transforms state to drive toward. Tuple fields (translate/rotate/scale)
   *  are element-wise tweened; order jumps. */
  transforms?: Partial<TransformsState>;
  /** Colors state to drive toward. Numeric fields animate; others jump. */
  colors?: Partial<ColorsState>;
  /** Layer toggles (within pbr.layers) to set. These jump, not animate. */
  layerToggles?: Partial<PbrState['layers']>;
  /** Per-step animation duration (ms). 0 = jump instantly. */
  durationMs: number;
  /** Narration shown in TourOverlay while this step runs. */
  narration: string;
  /** Pause after the step's animation completes (ms). */
  holdMs?: number;
}

export interface Tour {
  id: string;
  /** Which module this tour runs on. The runner sets activeModule = module on start. */
  module: ModuleId;
  /** Short label for the dropdown / launchpad. */
  label: string;
  /** One-line description shown under the label. */
  description: string;
  steps: TourStep[];
}

/** Live narration state. `null` when no tour is active. */
export interface NarrationState {
  tourId: string;
  text: string;
  stepIndex: number;
  stepCount: number;
}

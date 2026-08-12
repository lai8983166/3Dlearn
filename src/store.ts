import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { LensType } from '@/physics/optics';

export type ModuleId = 'pbr' | 'optics';
export type SpecularModel = 'blinn-phong' | 'ggx';
export type NormalMapPreset = 'smooth' | 'bricks' | 'hammered';
export type LightSourceType = 'parallel' | 'point';

/**
 * Which subsystem currently owns the user's attention. Enforced as a
 * single-writer: when any of these is active, contextual hints stay
 * silent and tours block user input from racing with their animation.
 *
 *   'none'   — no teaching element active; normal interactive mode
 *   'tour'   — a guided-tour scene is animating the store
 *   'hint'   — a contextual-hint toast is showing (6s window)
 *   'help'   — the help modal is open
 */
export type ActiveInterruption =
  | { kind: 'none' }
  | { kind: 'tour'; tourId: string }
  | { kind: 'hint'; hintId: string }
  | { kind: 'help' };

/**
 * Who last wrote to the store. The tour runner subscribes to store
 * updates and bails out when it sees a 'user' update — that means the
 * human grabbed a slider while the tour was animating. 'system' covers
 * rehydration, internal sync, etc. that should NOT interrupt a tour.
 */
export type Updater = 'user' | 'tour' | 'system';

export interface PbrState {
  layers: {
    diffuse: boolean;
    specular: boolean;
    normal: boolean;
    env: boolean;
  };
  diffuseColor: string;
  diffuseIntensity: number;
  specularColor: string;
  specularIntensity: number;
  roughness: number;
  metalness: number;
  specularModel: SpecularModel;
  normalMapPreset: NormalMapPreset;
  shininess: number;
  /** Currently-selected HDRI id, or null for the procedural RoomEnvironment. */
  hdriId: string | null;
  /** Live loading status for the picker UI. */
  hdriStatus: HdriStatus;
}

export type HdriStatus =
  | { state: 'idle' }
  | {
      state: 'loading';
      id: string;
      receivedBytes: number;
      totalBytes: number;
    }
  | { state: 'ready'; id: string }
  | { state: 'error'; id: string; message: string };

export interface OpticsState {
  lensType: LensType;
  /** Signed focal length in scene units. Positive = converging. */
  focalLength: number;
  /** Object x-position (signed; real objects have negative x). */
  objectX: number;
  /** Object height (positive). */
  objectHeight: number;
  lightSourceType: LightSourceType;
  /** Number of rays emitted (3–21). */
  rayCount: number;
}

interface AppState {
  activeModule: ModuleId;
  pbr: PbrState;
  optics: OpticsState;

  /** Which teaching element (if any) currently owns attention. */
  activeInterruption: ActiveInterruption;
  /** Hint ids the user has already seen — used for one-shot de-dup. */
  seenHints: string[];
  /** Who last wrote to the store — used by the tour runner to detect
   *  user interruption. */
  lastUpdater: Updater;

  setModule: (id: ModuleId) => void;
  setPbr: <K extends keyof PbrState>(key: K, value: PbrState[K]) => void;
  toggleLayer: (layer: keyof PbrState['layers']) => void;
  setOptics: <K extends keyof OpticsState>(key: K, value: OpticsState[K]) => void;
  setHdriStatus: (status: HdriStatus) => void;

  setActiveInterruption: (i: ActiveInterruption) => void;
  markHintSeen: (hintId: string) => void;
  resetHints: () => void;
}

function defaultFocalLength(lensType: LensType): number {
  switch (lensType) {
    case 'biconvex':
    case 'planoconvex':
      return 2.0;
    case 'biconcave':
    case 'planoconcave':
      return -2.0;
  }
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      activeModule: 'pbr',
      pbr: {
        layers: { diffuse: true, specular: true, normal: false, env: true },
        diffuseColor: '#b0b0b0',
        diffuseIntensity: 1.0,
        specularColor: '#ffffff',
        specularIntensity: 1.0,
        roughness: 0.4,
        metalness: 0.0,
        specularModel: 'ggx',
        normalMapPreset: 'bricks',
        shininess: 80,
        hdriId: null,
        hdriStatus: { state: 'idle' },
      },
      optics: {
        lensType: 'biconvex',
        focalLength: 2.0,
        objectX: -3.0,
        objectHeight: 0.8,
        lightSourceType: 'parallel',
        rayCount: 7,
      },
      activeInterruption: { kind: 'none' },
      seenHints: [],
      lastUpdater: 'system',

      // Module-level state setters default to 'user' source — the tour
      // runner uses its own setter that tags updates as 'tour'.
      setModule: (id) => set({ activeModule: id, lastUpdater: 'user' }),
      setPbr: (key, value) =>
        set((state) => ({
          pbr: { ...state.pbr, [key]: value },
          lastUpdater: 'user',
        })),
      toggleLayer: (layer) =>
        set((state) => ({
          pbr: {
            ...state.pbr,
            layers: { ...state.pbr.layers, [layer]: !state.pbr.layers[layer] },
          },
          lastUpdater: 'user',
        })),
      setOptics: (key, value) =>
        set((state) => ({
          optics: { ...state.optics, [key]: value },
          lastUpdater: 'user',
        })),
      setHdriStatus: (status) =>
        set((state) => ({
          pbr: { ...state.pbr, hdriStatus: status },
          lastUpdater: 'system',
        })),

      setActiveInterruption: (i) =>
        set({ activeInterruption: i, lastUpdater: 'system' }),
      markHintSeen: (hintId) =>
        set((state) =>
          state.seenHints.includes(hintId)
            ? state
            : { seenHints: [...state.seenHints, hintId], lastUpdater: 'system' },
        ),
      resetHints: () => set({ seenHints: [], lastUpdater: 'system' }),
    }),
    {
      name: '3dlearn-store',
      storage: createJSONStorage(() => localStorage),
      version: 2,
      partialize: (state) => ({
        activeModule: state.activeModule,
        pbr: { ...state.pbr, hdriStatus: { state: 'idle' as const } },
        optics: state.optics,
        seenHints: state.seenHints,
        // activeInterruption and lastUpdater are runtime-only — never persist.
      }),
    },
  ),
);

export { defaultFocalLength };

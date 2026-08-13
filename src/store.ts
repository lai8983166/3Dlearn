import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { LensType } from '@/physics/optics';
import type { NarrationState } from '@/tours/types';

export type ModuleId =
  | 'pbr'
  | 'optics'
  | 'shadows'
  | 'textures'
  | 'transforms'
  | 'colors'
  | 'depth'
  | 'bloom'
  | 'brdf';
export type SpecularModel = 'blinn-phong' | 'ggx';
export type NormalMapPreset = 'smooth' | 'bricks' | 'hammered';
export type LightSourceType = 'parallel' | 'point';

export type ShadowResolution = 256 | 512 | 1024 | 2048;
export type ShadowPcfMode = 'none' | 'pcf-1' | 'pcf-3' | 'pcf-5';

export type TransformOrder = 'TRS' | 'TSR' | 'RTS' | 'RST' | 'STR' | 'SRT';

export type ToneMappingType = 'none' | 'reinhard' | 'aces';

export type TextureFilterMode =
  | 'nearest'
  | 'linear'
  | 'mipmap-nearest'
  | 'mipmap-linear';
export type TextureWrapping = 'repeat' | 'mirror' | 'clamp';

export type DepthFuncType = 'less' | 'equal' | 'always';

/** Bloom pass identifiers — also used as tour/hint references. */
export type BloomPassId =
  | 'scene'
  | 'bright'
  | 'blurDown'
  | 'blurUp'
  | 'composite';

/** BRDF sector identifiers — also selectedSector values. */
export type BrdfModelId =
  | 'lambert'
  | 'phong'
  | 'blinn-phong'
  | 'ggx'
  | 'oren-nayar';

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

export interface ShadowsState {
  /** Shadow map resolution in pixels (square). */
  resolution: ShadowResolution;
  /** Depth bias — small values, 0 = acne, too-large = peter panning. */
  bias: number;
  /** PCF filtering mode. */
  pcfMode: ShadowPcfMode;
  /** Light horizontal angle in degrees (0–360). */
  lightYaw: number;
  /** Light vertical angle in degrees (5–85, low = long shadows). */
  lightPitch: number;
}

export interface TexturesState {
  /** Min/mag filter combination. */
  filterMode: TextureFilterMode;
  /** Anisotropic filter level (1–maxAnisotropy, capped at runtime). */
  anisotropy: number;
  /** UV wrapping mode. */
  wrapping: TextureWrapping;
  /** UV tiling (texture.repeat). */
  tiling: number;
  /** UV offset (texture.offset). */
  offset: number;
  /** Number of checker cells per texture (controls generator). */
  checkerCells: number;
  /** Show UV grid overlay on the plane + corner preview. */
  showUvGrid: boolean;
}

export interface TransformsState {
  translate: [number, number, number];
  /** Euler angles in degrees (XYZ order). */
  rotate: [number, number, number];
  scale: [number, number, number];
  /** Multiplication order — left-to-right as written. */
  order: TransformOrder;
}

export interface ColorsState {
  toneMapping: ToneMappingType;
  /** Exposure in stops (-2 to +2). Multiplier = 2^exposure. */
  exposure: number;
  /** Apply sRGB OETF on output (renderer.outputColorSpace). */
  gammaCorrect: boolean;
  /** Highlight pixels that would be clipped (>1.0 pre-tonemap). */
  showClipping: boolean;
}

export interface DepthState {
  /** GL depth function. */
  depthFunc: DepthFuncType;
  /** Whether meshes write to the depth buffer. */
  depthWrite: boolean;
  /** Bias applied to one of the two coplanar triangles (z-fighting fix). */
  polygonOffsetFactor: number;
  /** Render the depth buffer as the main view (grayscale) instead of shaded. */
  showDepthBuffer: boolean;
  /** Use logarithmic depth (reverse-Z equivalent) for far-range precision. */
  reversedZ: boolean;
  /** Camera distance from origin — drives z-fighting intensity demo. */
  cameraDistance: number;
}

export interface BloomState {
  /** Per-pass toggle. When false, the pass is bypassed and downstream consumes the previous RT. */
  layers: Record<BloomPassId, boolean>;
  /** Bright-pass threshold (HDR luminance). */
  threshold: number;
  /** Soft knee for smooth threshold transition (0 = hard, 1 = max softness). */
  softKnee: number;
  /** Gaussian blur radius — controls downsample pyramid depth. */
  blurRadius: number;
  /** Composite strength — how strongly bloom adds back to the original scene. */
  compositeStrength: number;
  /** Light intensity multiplier — drives how many pixels enter HDR range. */
  lightIntensity: number;
  /** Currently-selected pass for HUD formula focus. */
  activePassId: BloomPassId;
}

export interface BrdfState {
  /** Shared roughness across all 5 sectors. */
  roughness: number;
  /** Shared albedo color (hex string). */
  albedo: string;
  /** Directional light horizontal angle in degrees. */
  lightYaw: number;
  /** Directional light vertical angle in degrees. */
  lightPitch: number;
  /** Specular intensity multiplier (Phong / Blinn-Phong / GGX). */
  specularIntensity: number;
  /** Show cos(N·L) and cos(N·H)^n curves overlay in canvas corner. */
  showCosCurve: boolean;
  /** Currently-selected sector for HUD formula focus. */
  selectedSector: BrdfModelId;
}

export interface AppState {
  activeModule: ModuleId;
  pbr: PbrState;
  optics: OpticsState;
  shadows: ShadowsState;
  textures: TexturesState;
  transforms: TransformsState;
  colors: ColorsState;
  depth: DepthState;
  bloom: BloomState;
  brdf: BrdfState;

  /** Which teaching element (if any) currently owns attention. */
  activeInterruption: ActiveInterruption;
  /** Hint ids the user has already seen — used for one-shot de-dup. */
  seenHints: string[];
  /** Who last wrote to the store — used by the tour runner to detect
   *  user interruption. */
  lastUpdater: Updater;
  /** Live narration for the tour overlay. null when no tour is running. */
  narration: NarrationState | null;

  setModule: (id: ModuleId) => void;
  setPbr: <K extends keyof PbrState>(key: K, value: PbrState[K]) => void;
  toggleLayer: (layer: keyof PbrState['layers']) => void;
  setOptics: <K extends keyof OpticsState>(key: K, value: OpticsState[K]) => void;
  setShadows: <K extends keyof ShadowsState>(key: K, value: ShadowsState[K]) => void;
  setTextures: <K extends keyof TexturesState>(key: K, value: TexturesState[K]) => void;
  setTransforms: <K extends keyof TransformsState>(key: K, value: TransformsState[K]) => void;
  setColors: <K extends keyof ColorsState>(key: K, value: ColorsState[K]) => void;
  setDepth: <K extends keyof DepthState>(key: K, value: DepthState[K]) => void;
  setBloom: <K extends keyof BloomState>(key: K, value: BloomState[K]) => void;
  toggleBloomLayer: (layer: keyof BloomState['layers']) => void;
  setBrdf: <K extends keyof BrdfState>(key: K, value: BrdfState[K]) => void;
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
      shadows: {
        resolution: 1024,
        bias: 0.0008,
        pcfMode: 'pcf-3',
        lightYaw: 35,
        lightPitch: 50,
      },
      textures: {
        filterMode: 'mipmap-linear',
        anisotropy: 1,
        wrapping: 'repeat',
        tiling: 1,
        offset: 0,
        checkerCells: 8,
        showUvGrid: false,
      },
      transforms: {
        translate: [0, 0, 0],
        rotate: [0, 0, 0],
        scale: [1, 1, 1],
        order: 'TRS',
      },
      colors: {
        toneMapping: 'aces',
        exposure: 0,
        gammaCorrect: true,
        showClipping: false,
      },
      depth: {
        depthFunc: 'less',
        depthWrite: true,
        polygonOffsetFactor: 0,
        showDepthBuffer: false,
        reversedZ: false,
        cameraDistance: 5,
      },
      bloom: {
        layers: {
          scene: true,
          bright: true,
          blurDown: true,
          blurUp: true,
          composite: true,
        },
        threshold: 0.8,
        softKnee: 0.5,
        blurRadius: 4,
        compositeStrength: 1.0,
        lightIntensity: 2.5,
        activePassId: 'composite',
      },
      brdf: {
        roughness: 0.5,
        albedo: '#cccccc',
        lightYaw: 30,
        lightPitch: 35,
        specularIntensity: 1.0,
        showCosCurve: false,
        selectedSector: 'ggx',
      },
      activeInterruption: { kind: 'none' },
      seenHints: [],
      lastUpdater: 'system',
      narration: null,

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
      setShadows: (key, value) =>
        set((state) => ({
          shadows: { ...state.shadows, [key]: value },
          lastUpdater: 'user',
        })),
      setTextures: (key, value) =>
        set((state) => ({
          textures: { ...state.textures, [key]: value },
          lastUpdater: 'user',
        })),
      setTransforms: (key, value) =>
        set((state) => ({
          transforms: { ...state.transforms, [key]: value },
          lastUpdater: 'user',
        })),
      setColors: (key, value) =>
        set((state) => ({
          colors: { ...state.colors, [key]: value },
          lastUpdater: 'user',
        })),
      setDepth: (key, value) =>
        set((state) => ({
          depth: { ...state.depth, [key]: value },
          lastUpdater: 'user',
        })),
      setBloom: (key, value) =>
        set((state) => ({
          bloom: { ...state.bloom, [key]: value },
          lastUpdater: 'user',
        })),
      toggleBloomLayer: (layer) =>
        set((state) => ({
          bloom: {
            ...state.bloom,
            layers: { ...state.bloom.layers, [layer]: !state.bloom.layers[layer] },
          },
          lastUpdater: 'user',
        })),
      setBrdf: (key, value) =>
        set((state) => ({
          brdf: { ...state.brdf, [key]: value },
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
      version: 5,
      partialize: (state) => ({
        activeModule: state.activeModule,
        pbr: { ...state.pbr, hdriStatus: { state: 'idle' as const } },
        optics: state.optics,
        shadows: state.shadows,
        textures: state.textures,
        transforms: state.transforms,
        colors: state.colors,
        depth: state.depth,
        bloom: { ...state.bloom, layers: { ...state.bloom.layers } },
        brdf: state.brdf,
        seenHints: state.seenHints,
        // activeInterruption and lastUpdater are runtime-only — never persist.
      }),
      migrate: (persistedState: any, version: number) => {
        // v4 → v5: add depth/bloom/brdf slices with defaults; keep user state.
        if (version < 5 && persistedState && typeof persistedState === 'object') {
          const next = { ...(persistedState as Record<string, unknown>) };
          // activeModule sanity: if it's a new module id keep it, else default.
          // The new slices will fall back to the creator() defaults naturally
          // because Zustand merge-strategy overlays persisted on top of fresh
          // initial state — but if the persisted blob is from v4 it lacks the
          // new keys, so we just leave them undefined here and let the
          // creator's defaults win during rehydration.
          return next;
        }
        return persistedState;
      },
    },
  ),
);

export { defaultFocalLength };

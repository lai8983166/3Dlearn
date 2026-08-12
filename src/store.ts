import { create } from 'zustand';
import type { LensType } from '@/physics/optics';

export type ModuleId = 'pbr' | 'optics';
export type SpecularModel = 'blinn-phong' | 'ggx';
export type NormalMapPreset = 'smooth' | 'bricks' | 'hammered';
export type LightSourceType = 'parallel' | 'point';

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
}

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
  setModule: (id: ModuleId) => void;
  setPbr: <K extends keyof PbrState>(key: K, value: PbrState[K]) => void;
  toggleLayer: (layer: keyof PbrState['layers']) => void;
  setOptics: <K extends keyof OpticsState>(key: K, value: OpticsState[K]) => void;
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

export const useAppStore = create<AppState>((set) => ({
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
  },
  optics: {
    lensType: 'biconvex',
    focalLength: 2.0,
    objectX: -3.0,
    objectHeight: 0.8,
    lightSourceType: 'parallel',
    rayCount: 7,
  },
  setModule: (id) => set({ activeModule: id }),
  setPbr: (key, value) =>
    set((state) => ({ pbr: { ...state.pbr, [key]: value } })),
  toggleLayer: (layer) =>
    set((state) => ({
      pbr: {
        ...state.pbr,
        layers: { ...state.pbr.layers, [layer]: !state.pbr.layers[layer] },
      },
    })),
  setOptics: (key, value) =>
    set((state) => ({ optics: { ...state.optics, [key]: value } })),
}));

export { defaultFocalLength };

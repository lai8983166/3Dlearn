import { create } from 'zustand';

export type ModuleId = 'pbr' | 'optics';
export type SpecularModel = 'blinn-phong' | 'ggx';

interface PbrState {
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
  normalMapPreset: 'smooth' | 'bricks' | 'hammered';
}

interface AppState {
  activeModule: ModuleId;
  pbr: PbrState;
  setModule: (id: ModuleId) => void;
  setPbr: <K extends keyof PbrState>(key: K, value: PbrState[K]) => void;
  toggleLayer: (layer: keyof PbrState['layers']) => void;
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
}));

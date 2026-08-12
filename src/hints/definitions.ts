import type { AppState } from '@/store';

/**
 * One-shot contextual hint. `condition` is checked against the live
 * store state on every change. `message` is the toast body.
 *
 * Hints are scoped by module — `appliesTo` is checked against
 * activeModule before condition() is evaluated.
 */
export interface Hint {
  id: string;
  appliesTo: 'pbr' | 'optics';
  condition: (state: AppState) => boolean;
  message: string;
}

/** Buffer used for numeric thresholds (sliders rarely land on exact values). */
const EPS = 0.02;

export const HINTS: readonly Hint[] = [
  {
    id: 'hint-focal-crossing',
    appliesTo: 'optics',
    condition: (s) =>
      s.optics.focalLength < 0
        ? false // concave lens has no real focal crossing
        : Math.abs(s.optics.objectX + s.optics.focalLength) < 0.15 + EPS,
    message:
      '物体在焦点上了——看像距 v 趋向无穷，再拖一点就会切换到虚像。',
  },
  {
    id: 'hint-all-layers-off',
    appliesTo: 'pbr',
    condition: (s) =>
      !s.pbr.layers.diffuse &&
      !s.pbr.layers.specular &&
      !s.pbr.layers.normal &&
      !s.pbr.layers.env,
    message:
      '全部 4 层都关了——球只剩背景色。分层让你看清每一项对最终渲染的贡献。',
  },
  {
    id: 'hint-metalness-full',
    appliesTo: 'pbr',
    condition: (s) => s.pbr.metalness >= 1 - EPS,
    message:
      'Metalness = 1：金属。Diffuse 贡献消失，反射被基色染色（看球的反射变成 albedo 色）。',
  },
  {
    id: 'hint-concave-lens',
    appliesTo: 'optics',
    condition: (s) =>
      s.optics.lensType === 'biconcave' || s.optics.lensType === 'planoconcave',
    message:
      '凹透镜：f < 0。平行光经透镜后发散，反向延长线交于异侧焦点 F\'。永远成虚像、永远缩小。',
  },
  {
    id: 'hint-blinn-phong',
    appliesTo: 'pbr',
    condition: (s) => s.pbr.specularModel === 'blinn-phong',
    message:
      'Blinn-Phong：经典高光模型，硬圆形，无能量守恒。切回 GGX 看柔和的物理正确 falloff。',
  },
];

export const TOTAL_HINTS = HINTS.length;

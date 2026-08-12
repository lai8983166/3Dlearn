import type { AppState, ModuleId } from '@/store';

/**
 * One-shot contextual hint. `condition` is checked against the live
 * store state on every change. `message` is the toast body.
 *
 * Hints are scoped by module — `appliesTo` is checked against
 * activeModule before condition() is evaluated.
 */
export interface Hint {
  id: string;
  appliesTo: ModuleId;
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
  {
    id: 'hint-shadow-bias-zero',
    appliesTo: 'shadows',
    condition: (s) => s.shadows.bias < EPS,
    message:
      'bias ≈ 0：看立方体和球表面的条纹——这就是 shadow acne。加 bias 到 0.001 左右让它消失。',
  },
  {
    id: 'hint-shadow-low-res',
    appliesTo: 'shadows',
    condition: (s) => s.shadows.resolution === 256,
    message:
      '256×256：阴影边缘的锯齿清晰可见。左下角 shadow map 预览也明显块状。',
  },
  {
    id: 'hint-shadow-low-angle',
    appliesTo: 'shadows',
    condition: (s) => s.shadows.lightPitch < 20,
    message:
      '低光源角度：阴影变长（傍晚效果），同时锯齿更明显——这是 perspective aliasing。',
  },
  {
    id: 'hint-texture-nearest',
    appliesTo: 'textures',
    condition: (s) => s.textures.filterMode === 'nearest',
    message:
      'Nearest：每个像素取最近纹理像素。近处像素锯齿，远处会出现 moiré 闪烁。',
  },
  {
    id: 'hint-texture-mipmap',
    appliesTo: 'textures',
    condition: (s) =>
      s.textures.filterMode === 'mipmap-linear' ||
      s.textures.filterMode === 'mipmap-nearest',
    message:
      'Mipmap 开启：远处自动用低分辨率版本。看斜视角远处的 checker——闪烁消失了。',
  },
  {
    id: 'hint-texture-anisotropy-high',
    appliesTo: 'textures',
    condition: (s) => s.textures.anisotropy >= 8 - EPS,
    message:
      'Anisotropic ≥ 8：斜视角下远处 checker 依然清晰，不会被 Mipmap 过度模糊。',
  },
  {
    id: 'hint-texture-mirror',
    appliesTo: 'textures',
    condition: (s) =>
      s.textures.wrapping === 'mirror' && s.textures.tiling >= 2,
    message:
      'Mirror：相邻 tile 镜像翻转。看红色标记——每两格翻转方向。Mirror 用于避免重复纹理的可见接缝。',
  },
  {
    id: 'hint-transform-rotate-90',
    appliesTo: 'transforms',
    condition: (s) =>
      Math.abs(s.transforms.rotate[1] - 90) < 5 + EPS,
    message:
      'Rotate Y ≈ 90°：看矩阵的 m11、m13、m31、m33——sin(90°)=1 和 cos(90°)=0 出现了。',
  },
  {
    id: 'hint-transform-order-changed',
    appliesTo: 'transforms',
    condition: (s) => s.transforms.order !== 'TRS',
    message:
      '顺序变了！同一组 T/R/S 在不同顺序（TRS/RTS/...）下产生完全不同的矩阵和姿态——矩阵乘法不可交换。',
  },
  {
    id: 'hint-transform-scale-negative',
    appliesTo: 'transforms',
    condition: (s) =>
      s.transforms.scale[0] < 0 ||
      s.transforms.scale[1] < 0 ||
      s.transforms.scale[2] < 0,
    message:
      '负 scale = 镜像翻转！scale=(-1,1,1) 让 F 朝左变成 F 朝右。建模时常用此技巧做对称。',
  },
  {
    id: 'hint-color-no-tonemap',
    appliesTo: 'colors',
    condition: (s) => s.colors.toneMapping === 'none',
    message:
      'Tone Mapping = None：HDR 像素直接 clip 到 1.0，高光"烧死"。开 clip 可视化看哪些像素被烧。',
  },
  {
    id: 'hint-color-high-exposure',
    appliesTo: 'colors',
    condition: (s) => s.colors.exposure > 1.5 - EPS,
    message:
      'Exposure > +1.5：大量像素进入 HDR 范围。切到 None tonemap 看烧死，切到 ACES 看柔和压缩。',
  },
  {
    id: 'hint-color-no-gamma',
    appliesTo: 'colors',
    condition: (s) => !s.colors.gammaCorrect,
    message:
      'Gamma 校正关了：场景变暗、中间调压缩。这是"为什么我的渲染看起来颜色错"的最常见原因。',
  },
];

export const TOTAL_HINTS = HINTS.length;

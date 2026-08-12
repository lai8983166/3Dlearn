import type { Tour } from './types';

/**
 * Four pre-built PBR demos. Each script drives store state to show one
 * core concept; the narration explains what to watch for.
 *
 * Design note: tours don't animate the camera (the OrbitControls is
 * module-private). For the Fresnel demo we instead set up the params
 * that emphasise the effect and tell the learner to rotate the view
 * themselves — interactive reinforcement is more memorable than a
 * canned camera move.
 */
export const PBR_TOURS: readonly Tour[] = [
  {
    id: 'pbr-layers',
    module: 'pbr',
    label: '分层贡献揭示',
    description: '依次打开 4 层，看每一项对最终渲染的贡献',
    steps: [
      {
        layerToggles: { diffuse: false, specular: false, normal: false, env: false },
        durationMs: 400,
        narration: '关闭所有 4 层——球只剩背景与 emissive。',
        holdMs: 1200,
      },
      {
        layerToggles: { diffuse: true },
        durationMs: 400,
        narration: 'Diffuse（Lambertian）：基色被直接光打亮。这是物体"看起来是这种颜色"的原因。',
        holdMs: 2000,
      },
      {
        layerToggles: { specular: true },
        durationMs: 400,
        narration: 'Specular（GGX 高光）：在反射方向附近出现明亮的光斑。',
        holdMs: 2000,
      },
      {
        layerToggles: { normal: true },
        pbr: { normalMapPreset: 'bricks' },
        durationMs: 400,
        narration: 'Normal Map（砖墙）：法线扰动让表面出现凹凸光影，几何并未真的改变。',
        holdMs: 2000,
      },
      {
        layerToggles: { env: true },
        durationMs: 400,
        narration: 'Env Reflection：环境贴图被反射，边缘更强（Fresnel）。',
        holdMs: 2000,
      },
    ],
  },

  {
    id: 'pbr-fresnel',
    module: 'pbr',
    label: '看 Fresnel',
    description: '让球边缘的反射比中心更强——Fresnel-Schlick',
    steps: [
      {
        layerToggles: { diffuse: true, specular: false, normal: false, env: true },
        pbr: { metalness: 0, roughness: 0.15 },
        durationMs: 700,
        narration: '只留 Diffuse + Env。把 Roughness 调到 0.15 让反射更锐利。',
        holdMs: 1500,
      },
      {
        durationMs: 0,
        narration: '看球的边缘 vs 中心——边缘反射环境光，中心几乎只剩 Diffuse。这就是 Fresnel。',
        holdMs: 4000,
      },
      {
        pbr: { metalness: 1.0 },
        durationMs: 1200,
        narration: '把 Metalness 拉到 1（金属）——整个表面都变成反射，Fresnel 在金属上几乎消失。',
        holdMs: 3000,
      },
    ],
  },

  {
    id: 'pbr-ggx-vs-blinn',
    module: 'pbr',
    label: 'GGX vs Blinn-Phong',
    description: '高光形态：物理正确的 falloff vs 经典硬圆',
    steps: [
      {
        layerToggles: { diffuse: true, specular: true, normal: false, env: false },
        pbr: { specularModel: 'ggx', roughness: 0.5, metalness: 0 },
        durationMs: 700,
        narration: 'GGX（Cook-Torrance）：高光中心亮、边缘有自然的 falloff。Roughness 0.5。',
        holdMs: 3000,
      },
      {
        pbr: { specularModel: 'blinn-phong', shininess: 60 },
        durationMs: 600,
        narration: '切换到 Blinn-Phong：高光变成硬圆形。Shininess 60。无能量守恒。',
        holdMs: 3000,
      },
      {
        pbr: { shininess: 200 },
        durationMs: 600,
        narration: 'Shininess 200：高光更小更亮，但形态仍然是硬圆——这是早期游戏的标志。',
        holdMs: 2500,
      },
      {
        pbr: { specularModel: 'ggx' },
        durationMs: 600,
        narration: '切回 GGX：注意高光如何有"晕开"的过渡，更接近真实塑料/金属。',
        holdMs: 3000,
      },
    ],
  },

  {
    id: 'pbr-metal-vs-dielectric',
    module: 'pbr',
    label: '金属 vs 非金属',
    description: '金属：漫反射消失，反射被基色染色',
    steps: [
      {
        layerToggles: { diffuse: true, specular: true, normal: false, env: true },
        pbr: { metalness: 0, diffuseColor: '#b0b0b0', roughness: 0.3 },
        durationMs: 700,
        narration: '非金属（Metalness = 0）：灰色 Diffuse + 弱 Fresnel 反射。电介质的典型表现。',
        holdMs: 3000,
      },
      {
        pbr: { metalness: 1 },
        durationMs: 1000,
        narration: '金属（Metalness = 1）：Diffuse 消失，反射被基色染色。注意球的整体颜色变了。',
        holdMs: 3000,
      },
      {
        pbr: { diffuseColor: '#ffaa00' },
        durationMs: 800,
        narration: '金属的"基色"现在作为反射的染色——金色金属，albedo 就是反射色调。',
        holdMs: 3000,
      },
      {
        pbr: { metalness: 0 },
        durationMs: 800,
        narration: '切回非金属：Diffuse 回来了，反射变成无色（环境本身的颜色）。',
        holdMs: 2000,
      },
    ],
  },
] as const;

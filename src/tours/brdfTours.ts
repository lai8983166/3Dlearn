import type { Tour } from './types';

/**
 * Four BRDF comparison demos that isolate the key teaching moments:
 *   1. Energy conservation — Phong blows out, GGX doesn't
 *   2. Roughness sweep — GGX vs Oren-Nayar contrast
 *   3. Grazing angle — Fresnel-style highlight at edges
 *   4. Lambert vs Oren-Nayar — diffuse-only comparison
 */
export const BRDF_TOURS: readonly Tour[] = [
  {
    id: 'brdf-energy-conservation',
    module: 'brdf',
    label: '能量守恒对比',
    description: 'Phong 烧死，GGX 守恒',
    steps: [
      {
        brdf: {
          roughness: 0.3,
          specularIntensity: 1.0,
          lightYaw: 30,
          lightPitch: 35,
          selectedSector: 'phong',
        },
        durationMs: 500,
        narration: '正常 specular intensity = 1：5 个扇区都有合理高光。点 Phong 扇区看 HUD。',
        holdMs: 3500,
      },
      {
        brdf: { specularIntensity: 2.5 },
        durationMs: 1200,
        narration: 'specular intensity = 2.5：Phong 扇区的高光"烧死"——能量不守恒，超过显示器范围。GGX 扇区依然合理。',
        holdMs: 5000,
      },
      {
        brdf: { selectedSector: 'ggx' },
        durationMs: 500,
        narration: '点 GGX 扇区：能量始终守恒。这就是为什么现代引擎用 microfacet 模型。',
        holdMs: 4000,
      },
      {
        brdf: { specularIntensity: 1.0 },
        durationMs: 800,
        narration: '回到 intensity = 1：所有 BRDF 都恢复正常外观。',
        holdMs: 2500,
      },
    ],
  },

  {
    id: 'brdf-roughness-sweep',
    module: 'brdf',
    label: 'Roughness 扫描',
    description: 'GGX 与 Oren-Nayar 的形态变化',
    steps: [
      {
        brdf: {
          roughness: 0.1,
          selectedSector: 'ggx',
        },
        durationMs: 500,
        narration: 'roughness = 0.1：GGX 扇区有尖锐的高光斑。Lambert 扇区不响应（无 roughness）。',
        holdMs: 3500,
      },
      {
        brdf: { roughness: 0.5 },
        durationMs: 1200,
        narration: 'roughness = 0.5：GGX 高光变大变模糊。Oren-Nayar 扇区开始变暗。',
        holdMs: 3500,
      },
      {
        brdf: { roughness: 0.9 },
        durationMs: 1200,
        narration: 'roughness = 0.9：GGX 高光几乎消失。Oren-Nayar 扇区明显比 Lambert 暗——粗糙漫反射在起作用。',
        holdMs: 4500,
      },
      {
        brdf: { selectedSector: 'oren-nayar' },
        durationMs: 500,
        narration: '点 Oren-Nayar 扇区：它把表面当成 V 形凹腔处理，roughness 越高漫反射越"扁"。',
        holdMs: 4000,
      },
    ],
  },

  {
    id: 'brdf-grazing-fresnel',
    module: 'brdf',
    label: '掠射角 Fresnel',
    description: 'GGX 在边缘的高光强化',
    steps: [
      {
        brdf: {
          roughness: 0.4,
          lightYaw: 90,
          lightPitch: 5,
          selectedSector: 'ggx',
        },
        durationMs: 600,
        narration: '光源接近掠射（pitch=5°）：GGX 扇区在球的边缘有强烈高光——这是 Fresnel 项在起作用。',
        holdMs: 4500,
      },
      {
        brdf: { selectedSector: 'phong' },
        durationMs: 500,
        narration: '切到 Phong 扇区：同样的角度，高光形态完全不同——没有 Fresnel 调制。',
        holdMs: 4000,
      },
      {
        brdf: { selectedSector: 'blinn-phong' },
        durationMs: 500,
        narration: 'Blinn-Phong：高光位置对了，但还是没有 Fresnel——边缘不会强化。',
        holdMs: 3500,
      },
      {
        brdf: { selectedSector: 'ggx' },
        durationMs: 500,
        narration: '回到 GGX：掠射角的高光是物理正确的，所以电影和 3A 游戏都用这个模型。',
        holdMs: 3500,
      },
    ],
  },

  {
    id: 'brdf-lambert-vs-oren',
    module: 'brdf',
    label: 'Lambert vs Oren-Nayar',
    description: '两种漫反射模型的对比',
    steps: [
      {
        brdf: {
          roughness: 0.0,
          selectedSector: 'lambert',
        },
        durationMs: 500,
        narration: 'roughness = 0：Lambert 和 Oren-Nayar 几乎相同——Oren-Nayar 在 σ=0 时退化为 Lambert。',
        holdMs: 4000,
      },
      {
        brdf: { roughness: 0.6 },
        durationMs: 1200,
        narration: 'roughness = 0.6：Lambert 不变，Oren-Nayar 明显变暗——粗糙度让漫反射"反物理"地变化。',
        holdMs: 4500,
      },
      {
        brdf: { roughness: 1.0, selectedSector: 'oren-nayar' },
        durationMs: 1200,
        narration: 'roughness = 1.0 + 点 Oren-Nayar：表面像粉笔或泥土——Lambert 无法表达这种材质。',
        holdMs: 4500,
      },
      {
        brdf: { selectedSector: 'lambert' },
        durationMs: 500,
        narration: '回到 Lambert：粗糙度滑杆对它无效——这就是为什么 Lambert 只适合光滑表面。',
        holdMs: 4000,
      },
    ],
  },
] as const;

import type { Tour } from './types';

/**
 * Three pre-built optics demos. The "real→virtual" demo splits the
 * focal-crossing into separate steps with their own narration so the
 * learner can clearly see the image distance jump to infinity and
 * come back on the virtual side.
 */
export const OPTICS_TOURS: readonly Tour[] = [
  {
    id: 'optics-thin-lens-equation',
    module: 'optics',
    label: '薄透镜方程验证',
    description: 'u = 2f → v = 2f, m = -1（物像等大、倒立实像）',
    steps: [
      {
        optics: {
          lensType: 'biconvex',
          focalLength: 2,
          objectX: -4,
          objectHeight: 0.8,
          lightSourceType: 'point',
          rayCount: 7,
        },
        durationMs: 600,
        narration: '设双凸透镜 f = 2，物体放在 u = -4（即 2f 处）。',
        holdMs: 1500,
      },
      {
        durationMs: 0,
        narration:
          '看 HUD：v = +2.0f，m = -1.00 —— 物像等大、倒立实像。这是薄透镜方程 1/v − 1/u = 1/f 的特例。',
        holdMs: 5000,
      },
    ],
  },

  {
    id: 'optics-real-to-virtual',
    module: 'optics',
    label: '实像 → 虚像切换',
    description: '物体跨过焦点，像距跳到无穷再切到虚像',
    steps: [
      {
        optics: {
          lensType: 'biconvex',
          focalLength: 2,
          objectX: -6,
          objectHeight: 0.8,
          lightSourceType: 'point',
          rayCount: 7,
        },
        durationMs: 600,
        narration: '物体放在 3f 处：缩小、倒立的实像（像距在 1.5f 附近）。',
        holdMs: 2500,
      },
      {
        optics: { objectX: -2.5 },
        durationMs: 2500,
        narration: '移近透镜：像距 v 变大、放大率趋近 1。',
        holdMs: 1500,
      },
      {
        optics: { objectX: -2.1 },
        durationMs: 1500,
        narration: '接近焦点——看像距 v 飞快增大（光路在透镜右侧几乎平行）。',
        holdMs: 2500,
      },
      {
        optics: { objectX: -1.9 },
        durationMs: 1500,
        narration: '跨过焦点！像距跳到 −∞ 再从虚像侧回来。HUD 现在显示"虚像"。',
        holdMs: 3000,
      },
      {
        optics: { objectX: -1 },
        durationMs: 1500,
        narration: '在焦点内（u < f）：虚像、直立、放大。这就是放大镜的工作原理。',
        holdMs: 4000,
      },
    ],
  },

  {
    id: 'optics-concave-divergence',
    module: 'optics',
    label: '凹透镜发散',
    description: 'f < 0：平行光经透镜后发散',
    steps: [
      {
        optics: {
          lensType: 'biconcave',
          focalLength: -2,
          lightSourceType: 'parallel',
          objectX: -3,
          objectHeight: 0.8,
          rayCount: 7,
        },
        durationMs: 600,
        narration: '切到双凹透镜（f = -2）。平行光经透镜后向四面发散。',
        holdMs: 3000,
      },
      {
        durationMs: 0,
        narration:
          '看反向延长线（虚线）——它们交于透镜左侧的焦点 F\'。无论物体在哪，凹透镜永远成虚像、永远缩小。',
        holdMs: 5000,
      },
    ],
  },
] as const;

import type { Tour } from './types';

/**
 * Four pre-built shadow demos. Each isolates one of the four core
 * shadow-mapping failure modes (acne, peter panning, aliasing, hard
 * edges) so the learner can compare before/after state directly.
 */
export const SHADOW_TOURS: readonly Tour[] = [
  {
    id: 'shadow-what-is-map',
    module: 'shadows',
    label: 'Shadow Map 是什么',
    description: '把光源视角的深度图可视化',
    steps: [
      {
        shadows: {
          resolution: 512,
          bias: 0.0008,
          pcfMode: 'pcf-1',
          lightYaw: 35,
          lightPitch: 50,
        },
        durationMs: 600,
        narration: '看画布左下角的小窗口——这是从光源视角渲染的深度图（shadow map）。',
        holdMs: 3000,
      },
      {
        durationMs: 0,
        narration:
          '近处暗、远处亮。物体在深度图中是清晰的形状。阴影算法就是用这张图判断每个片元是否被遮挡。',
        holdMs: 4000,
      },
    ],
  },

  {
    id: 'shadow-acne-bias',
    module: 'shadows',
    label: 'Shadow Acne 与 Bias',
    description: '看 bias=0 的条纹，调到合适值消失',
    steps: [
      {
        shadows: {
          bias: 0,
          pcfMode: 'pcf-3',
          resolution: 1024,
          lightYaw: 35,
          lightPitch: 50,
        },
        durationMs: 500,
        narration: 'bias = 0：立方体和球表面出现条纹状自阴影。这是经典的 shadow acne。',
        holdMs: 4000,
      },
      {
        shadows: { bias: 0.0008 },
        durationMs: 1200,
        narration: '调到 0.0008——acne 消失，阴影仍正常连接物体底部。',
        holdMs: 3000,
      },
      {
        shadows: { bias: 0.008 },
        durationMs: 1200,
        narration: '继续加到 0.008——物体"浮"起来了，阴影脱离底部。这叫 peter panning。',
        holdMs: 3000,
      },
      {
        shadows: { bias: 0.0008 },
        durationMs: 1000,
        narration: '回到合适的 0.0008——bias 永远是 acne 与 peter panning 的权衡。',
      },
    ],
  },

  {
    id: 'shadow-hard-vs-soft',
    module: 'shadows',
    label: '硬阴影 vs 软阴影',
    description: 'PCF None → 5×5 看边缘过渡',
    steps: [
      {
        shadows: {
          pcfMode: 'none',
          bias: 0.0008,
          resolution: 1024,
          lightYaw: 35,
          lightPitch: 50,
        },
        durationMs: 500,
        narration: 'PCF = None（BasicShadowMap）：阴影边缘锐利，毫无过渡。早期游戏的样子。',
        holdMs: 3500,
      },
      {
        shadows: { pcfMode: 'pcf-1' },
        durationMs: 500,
        narration: 'PCF 1×1：单采样 PCF，边缘略好但仍偏硬。',
        holdMs: 2500,
      },
      {
        shadows: { pcfMode: 'pcf-3' },
        durationMs: 800,
        narration: 'PCF 3×3：明显的柔和过渡。',
        holdMs: 3000,
      },
      {
        shadows: { pcfMode: 'pcf-5' },
        durationMs: 800,
        narration: 'PCF 5×5：大半径软阴影，接近真实物理（半影）。注意整体颜色略变浅。',
        holdMs: 3500,
      },
    ],
  },

  {
    id: 'shadow-resolution-aliasing',
    module: 'shadows',
    label: '分辨率与锯齿',
    description: '256 ↔ 2048 看边缘质量',
    steps: [
      {
        shadows: {
          resolution: 256,
          bias: 0.0008,
          pcfMode: 'pcf-1',
          lightYaw: 35,
          lightPitch: 50,
        },
        durationMs: 500,
        narration: '256×256：阴影边缘清晰可见的锯齿。左下角预览也明显块状。',
        holdMs: 3500,
      },
      {
        shadows: { resolution: 512 },
        durationMs: 800,
        narration: '512：好一些，但锯齿仍在。',
        holdMs: 2500,
      },
      {
        shadows: { resolution: 1024 },
        durationMs: 800,
        narration: '1024（默认）：边缘平滑。生产质量的最低标准。',
        holdMs: 2500,
      },
      {
        shadows: { resolution: 2048 },
        durationMs: 1000,
        narration: '2048：边缘几乎完全平滑。代价是 4 倍显存占用（vs 1024）。',
        holdMs: 3000,
      },
      {
        shadows: {
          resolution: 1024,
          lightPitch: 15,
        },
        durationMs: 1000,
        narration: '低光源角度（15°）下阴影变长——perspective aliasing 让锯齿更明显，即使 1024 也能看出。',
        holdMs: 4000,
      },
    ],
  },
] as const;

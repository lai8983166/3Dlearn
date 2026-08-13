import type { Tour } from './types';

/**
 * Three depth-buffer demos that isolate the three teaching moments:
 *   1. Z-fighting — show the artifacts, then fix with polygonOffset
 *   2. depthFunc — show how LESS/EQUAL/ALWAYS differ
 *   3. Reverse-Z / logarithmic — show far-distance precision improvement
 */
export const DEPTH_TOURS: readonly Tour[] = [
  {
    id: 'depth-zfighting',
    module: 'depth',
    label: 'Z-Fighting 重现与修复',
    description: '看共面三角形闪烁，再调 polygonOffset 解决',
    steps: [
      {
        depth: {
          polygonOffsetFactor: 0,
          cameraDistance: 6,
          depthFunc: 'less',
          showDepthBuffer: false,
        },
        durationMs: 400,
        narration: '两个几乎共面的三角形——红绿重叠区域开始闪烁。这就是 z-fighting。',
        holdMs: 4000,
      },
      {
        depth: { cameraDistance: 18 },
        durationMs: 1500,
        narration: '相机拉远——闪烁加剧！远处深度精度密集在 0.99 附近，微小差异被舍入。',
        holdMs: 5000,
      },
      {
        depth: { polygonOffsetFactor: 2 },
        durationMs: 1200,
        narration: 'polygonOffsetFactor = +2：把红三角推到深度缓冲"稍前"，闪烁消失。',
        holdMs: 4000,
      },
      {
        depth: { cameraDistance: 18 },
        durationMs: 1500,
        narration: '远距离依然稳定——polygonOffset 是与距离无关的"工程修复"。',
        holdMs: 3500,
      },
    ],
  },

  {
    id: 'depth-func-comparison',
    module: 'depth',
    label: 'depthFunc 三档对比',
    description: 'LESS → EQUAL → ALWAYS 看遮挡规则',
    steps: [
      {
        depth: { depthFunc: 'less', cameraDistance: 5 },
        durationMs: 400,
        narration: 'depthFunc = LESS（默认）：前面挡后面。正常 3D 渲染的基础。',
        holdMs: 3000,
      },
      {
        depth: { depthFunc: 'always' },
        durationMs: 500,
        narration: 'depthFunc = ALWAYS：所有像素都通过测试。绘制顺序决定遮挡——立方体"穿过"球，球"穿过"三角形！',
        holdMs: 5000,
      },
      {
        depth: { depthFunc: 'equal' },
        durationMs: 500,
        narration: 'depthFunc = EQUAL：只有精确相等深度的像素通过——大多数 mesh 消失。用于 stencil / 共面贴花。',
        holdMs: 5000,
      },
      {
        depth: { depthFunc: 'less' },
        durationMs: 500,
        narration: '回到 LESS——这是 99% 的渲染场景应该用的设置。',
        holdMs: 2500,
      },
    ],
  },

  {
    id: 'depth-reverse-z',
    module: 'depth',
    label: '反向 Z / Logarithmic 对比',
    description: '远距离精度对比',
    steps: [
      {
        depth: { reversedZ: false, cameraDistance: 20 },
        durationMs: 600,
        narration: '传统 Z + 远距离：三角形严重 z-fighting——传统 Z 的深度分布在远处密集在 0.99 附近。',
        holdMs: 4500,
      },
      {
        depth: { reversedZ: true },
        durationMs: 800,
        narration: '开启 logarithmic depth（reverse-Z 等效）：远距离 z-fighting 几乎消失。深度分布变得近对数。',
        holdMs: 4500,
      },
      {
        depth: { showDepthBuffer: true },
        durationMs: 500,
        narration: '切到深度缓冲视图——左下角缩略图始终显示深度图。看远处分布如何更均匀。',
        holdMs: 4000,
      },
      {
        depth: { showDepthBuffer: false, reversedZ: false },
        durationMs: 500,
        narration: '切回传统 Z：再次闪烁。现代引擎几乎都用 reverse-Z 缓解远距离精度问题。',
        holdMs: 3000,
      },
    ],
  },
] as const;

import type { Tour } from './types';

/**
 * Four bloom demos that walk through the pipeline:
 *   1. Why bloom exists — toggle it on/off
 *   2. Bright pass — threshold sweep
 *   3. Blur pyramid — what down/up sampling do
 *   4. Tonemap bridge — composite + ACES
 */
export const BLOOM_TOURS: readonly Tour[] = [
  {
    id: 'bloom-why-needed',
    module: 'bloom',
    label: '为什么需要 Bloom',
    description: '对比有/无 bloom 的视觉差异',
    steps: [
      {
        bloom: {
          layers: { scene: true, bright: false, blurDown: false, blurUp: false, composite: false },
          threshold: 0.8,
          softKnee: 0.5,
          blurRadius: 4,
          compositeStrength: 1.0,
          lightIntensity: 2.5,
          activePassId: 'composite',
        },
        durationMs: 400,
        narration: '关闭所有 bloom pass——只剩原始 HDR 场景。亮的球只是"白色"，没有晕染。',
        holdMs: 4000,
      },
      {
        bloomLayerToggles: { bright: true, blurDown: true, blurUp: true, composite: true },
        durationMs: 1000,
        narration: '开启完整 pipeline——亮的高光开始"渗"到周围。这就是 bloom。',
        holdMs: 5000,
      },
      {
        bloom: { compositeStrength: 0.0 },
        durationMs: 800,
        narration: '把 composite strength 调到 0——blur 结果不叠加回原图。等效于关掉 bloom。',
        holdMs: 3000,
      },
      {
        bloom: { compositeStrength: 2.0 },
        durationMs: 1000,
        narration: 'strength = 2：过度的 bloom。游戏里这是"科幻光晕"效果。',
        holdMs: 3000,
      },
    ],
  },

  {
    id: 'bloom-bright-pass',
    module: 'bloom',
    label: 'Bright Pass 的作用',
    description: 'threshold 1.5 → 0.3 看亮区提取',
    steps: [
      {
        bloom: {
          threshold: 1.5,
          activePassId: 'bright',
        },
        durationMs: 500,
        narration: 'threshold = 1.5：只有最亮的几个像素超过阈值。Bright pass 输出几乎全黑。',
        holdMs: 4000,
      },
      {
        bloom: { threshold: 0.8 },
        durationMs: 1000,
        narration: 'threshold = 0.8：高光球被提取出来——这是合理的默认值。',
        holdMs: 3500,
      },
      {
        bloom: { threshold: 0.3 },
        durationMs: 1000,
        narration: 'threshold = 0.3：太多像素进入 bright pass——结果就是"全图发光"，看起来错误。',
        holdMs: 4000,
      },
      {
        bloom: { threshold: 0.8, softKnee: 0.0 },
        durationMs: 800,
        narration: 'soft knee = 0：阈值边缘是硬切——亮区有锯齿状边界。',
        holdMs: 3000,
      },
      {
        bloom: { softKnee: 1.0 },
        durationMs: 800,
        narration: 'soft knee = 1：阈值边缘平滑过渡——更自然的提取。',
        holdMs: 3000,
      },
    ],
  },

  {
    id: 'bloom-blur-pyramid',
    module: 'bloom',
    label: 'Blur 金字塔',
    description: '看 down/up 采样的作用',
    steps: [
      {
        bloomLayerToggles: { blurDown: false, blurUp: false },
        durationMs: 400,
        narration: '关闭 blur down + up：bright pass 直接进入 composite。高光是硬边、没有晕染。',
        holdMs: 4000,
      },
      {
        bloomLayerToggles: { blurDown: true, blurUp: false },
        durationMs: 800,
        narration: '只开 blur down：模糊了但还在低分辨率——结果块状、像素化。',
        holdMs: 3500,
      },
      {
        bloomLayerToggles: { blurUp: true },
        durationMs: 800,
        narration: '开启 blur up：上采样回原始分辨率，平滑的晕染出现。这就是 bloom 的特征。',
        holdMs: 4500,
      },
    ],
  },

  {
    id: 'bloom-tonemap-bridge',
    module: 'bloom',
    label: 'Tonemap 桥梁',
    description: 'HDR → LDR 的转换',
    steps: [
      {
        bloom: {
          lightIntensity: 5.0,
          compositeStrength: 1.5,
          activePassId: 'composite',
        },
        durationMs: 600,
        narration: '强光 + 强 bloom：最终 hdr 值远超 1.0。ACES tonemap 把它压回 [0,1]。',
        holdMs: 4000,
      },
      {
        bloomLayerToggles: { composite: false },
        durationMs: 800,
        narration: '关闭 composite（包括 tonemap）：HDR 值被显示器直接 clip——亮的全是纯白，"烧死"。',
        holdMs: 4500,
      },
      {
        bloomLayerToggles: { composite: true },
        durationMs: 800,
        narration: '重新开启 composite（含 ACES）：高光被柔和压缩，保留细节——这就是为什么 HDR pipeline 必须 tonemap。',
        holdMs: 4000,
      },
    ],
  },
] as const;

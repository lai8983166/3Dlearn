import type { Tour } from './types';

/**
 * Four pre-built color-pipeline demos. Each isolates one concept
 * (why tonemap matters, ACES vs Reinhard, exposure stops, gamma
 * correction) so the learner sees exactly what each knob does.
 */
export const COLOR_TOURS: readonly Tour[] = [
  {
    id: 'color-why-tonemap',
    module: 'colors',
    label: '为什么需要 Tone Mapping',
    description: '关掉 tonemap 看高光烧死',
    steps: [
      {
        colors: {
          toneMapping: 'aces',
          exposure: 0,
          gammaCorrect: true,
          showClipping: false,
        },
        durationMs: 500,
        narration: '默认：ACES tonemap + sRGB 输出。所有球面颜色平滑、有细节。',
        holdMs: 3000,
      },
      {
        colors: { showClipping: true },
        durationMs: 400,
        narration: '开启 clip 可视化：洋红色显示 >1.0 的 HDR 像素。ACES 把它们压缩了，所以几乎看不到洋红。',
        holdMs: 3000,
      },
      {
        colors: { toneMapping: 'none' },
        durationMs: 600,
        narration: '切到 None（无 tonemap）：HDR 像素直接 clip 到 1.0。亮球的高光区出现洋红色——这些就是被"烧死"的像素。',
        holdMs: 5000,
      },
      {
        colors: { exposure: 1 },
        durationMs: 1200,
        narration: '加 exposure +1（光线翻倍）：更多像素进入 HDR 范围被烧死。洋红色覆盖大片区域。',
        holdMs: 4000,
      },
      {
        colors: { toneMapping: 'aces', exposure: 0 },
        durationMs: 1200,
        narration: '回到 ACES + exposure 0：高光被柔和压缩，细节保留，洋红消失。这就是 tonemap 的价值。',
        holdMs: 4000,
      },
    ],
  },

  {
    id: 'color-aces-vs-reinhard',
    module: 'colors',
    label: 'ACES vs Reinhard',
    description: '两种 tonemap 的视觉差异',
    steps: [
      {
        colors: {
          toneMapping: 'reinhard',
          exposure: 1,
          gammaCorrect: true,
          showClipping: true,
        },
        durationMs: 700,
        narration: 'Reinhard（x/(x+1)）+ exposure +1：简单公式，把 HDR 压到 [0,1]。洋红应该看不到（被压住了），但整体偏暗、对比弱。',
        holdMs: 4500,
      },
      {
        colors: { toneMapping: 'aces' },
        durationMs: 800,
        narration: '切到 ACES：高光保留更多细节（"电影感"），暗部对比强，整体偏暖。注意最亮球的颜色从灰白变成 cream。',
        holdMs: 5000,
      },
      {
        colors: { toneMapping: 'reinhard' },
        durationMs: 600,
        narration: '回到 Reinhard：观察中间灰球——比 ACES 略暗、略平。Reinhard 是教学起点，ACES 是行业标准。',
        holdMs: 4000,
      },
    ],
  },

  {
    id: 'color-exposure',
    module: 'colors',
    label: 'Exposure 调节',
    description: '相机光圈：每 +1 stop 光线翻倍',
    steps: [
      {
        colors: {
          toneMapping: 'aces',
          exposure: -2,
          gammaCorrect: true,
          showClipping: false,
        },
        durationMs: 700,
        narration: 'Exposure -2 stops（光线减到 1/4）：整个场景几乎全黑。最暗球（albedo=0.05）完全不可见——低于显示器可分辨范围。',
        holdMs: 3500,
      },
      {
        colors: { exposure: 0 },
        durationMs: 1500,
        narration: 'Exposure 0（"正常"）：6 个球从暗到亮都清晰可见。这是相机的"中性"曝光。',
        holdMs: 3000,
      },
      {
        colors: { exposure: 1.5 },
        durationMs: 1500,
        narration: 'Exposure +1.5（光线 ~2.8 倍）：亮球进入 HDR 范围。开 clip 看 → 会被洋红色覆盖。',
        holdMs: 3500,
      },
      {
        colors: { showClipping: true },
        durationMs: 400,
        narration: '开启 clip 可视化：洋红色显示 >1.0 的像素。这些区域 tonemap 之后会被压成 cream。',
        holdMs: 3000,
      },
      {
        colors: { exposure: 0, showClipping: false },
        durationMs: 1200,
        narration: '回到 0 + 关 clip。Exposure 控制"光线总量"，tonemap 决定"如何把 HDR 压回 LDR"。',
      },
    ],
  },

  {
    id: 'color-gamma',
    module: 'colors',
    label: 'Linear vs sRGB',
    description: '关掉 gamma 校正看错误输出',
    steps: [
      {
        colors: {
          toneMapping: 'aces',
          exposure: 0,
          gammaCorrect: true,
          showClipping: false,
        },
        durationMs: 500,
        narration: '默认：sRGB 输出（gamma 校正开启）。颜色看起来正常。',
        holdMs: 2500,
      },
      {
        colors: { gammaCorrect: false },
        durationMs: 500,
        narration: '关掉 gamma 校正：整体变暗，中间调被压缩。这是 Linear 直接输出的样子——典型的"为什么我的渲染看起来颜色错"。',
        holdMs: 5000,
      },
      {
        colors: { gammaCorrect: true },
        durationMs: 500,
        narration: '重新开启：恢复正常。sRGB OETF 把 [0,1] 线性值映射成显示器可识别的 2.2 gamma 曲线。',
        holdMs: 3000,
      },
    ],
  },
] as const;

import type { Tour } from './types';

/**
 * Four pre-built texture/UV demos. Each isolates one of the four core
 * concepts (UV mapping, filter modes, anisotropic, wrapping) so the
 * learner sees exactly what each knob does.
 */
export const TEXTURE_TOURS: readonly Tour[] = [
  {
    id: 'texture-what-is-uv',
    module: 'textures',
    label: 'UV 是什么',
    description: '3D 表面到 2D 纹理空间的映射',
    steps: [
      {
        textures: {
          filterMode: 'mipmap-linear',
          tiling: 1,
          offset: 0,
          showUvGrid: false,
          wrapping: 'repeat',
        },
        durationMs: 500,
        narration: '默认状态：checker 纹理贴在 3D 平面上。',
        holdMs: 2000,
      },
      {
        textures: { showUvGrid: true },
        durationMs: 500,
        narration: '开启 UV 网格：黄色线条对应 UV 坐标 (0, 0.125, 0.25, ..., 1.0)。',
        holdMs: 3000,
      },
      {
        durationMs: 0,
        narration:
          '看画布左下角的 2D 预览：同一个网格在纹理空间里是规则的方格。3D 平面上的网格在透视下变形，但与 2D 纹理一一对应。',
        holdMs: 5000,
      },
      {
        textures: { tiling: 2 },
        durationMs: 800,
        narration: 'tiling = 2：纹理在平面上重复 2×2 次。UV 网格也变密了——每个 tile 一套 UV [0,1]。',
        holdMs: 4000,
      },
    ],
  },

  {
    id: 'texture-filter-modes',
    module: 'textures',
    label: 'Nearest / Linear / Mipmap',
    description: '三种过滤模式对比',
    steps: [
      {
        textures: {
          filterMode: 'nearest',
          tiling: 4,
          offset: 0,
          showUvGrid: false,
          anisotropy: 1,
        },
        durationMs: 600,
        narration: 'Nearest：每个像素采样最近的纹理像素。近处像素化，远处会出现 moiré 闪烁。',
        holdMs: 4000,
      },
      {
        textures: { filterMode: 'linear' },
        durationMs: 600,
        narration: 'Linear（双线性）：采样时混合 4 个最近像素。平滑掉近处锯齿，但远处仍会闪烁（无 mipmap）。',
        holdMs: 4000,
      },
      {
        textures: { filterMode: 'mipmap-linear' },
        durationMs: 800,
        narration: 'Mipmap Linear：远处自动用低分辨率版本。闪烁消失，远处平滑过渡。',
        holdMs: 4000,
      },
    ],
  },

  {
    id: 'texture-anisotropic',
    module: 'textures',
    label: 'Anisotropic 提升',
    description: '斜视角下 1 → 16 看远处清晰度',
    steps: [
      {
        textures: {
          filterMode: 'mipmap-linear',
          anisotropy: 1,
          tiling: 4,
        },
        durationMs: 600,
        narration: 'Mipmap 开了但 anisotropy = 1：斜视角下远处 checker 仍然模糊（Mipmap 过度模糊）。',
        holdMs: 3500,
      },
      {
        textures: { anisotropy: 4 },
        durationMs: 800,
        narration: 'Anisotropy = 4：远处开始变清晰。',
        holdMs: 2500,
      },
      {
        textures: { anisotropy: 16 },
        durationMs: 800,
        narration: 'Anisotropy = 16：远处 checker 清晰可辨。各向异性过滤是为斜视角而生的。',
        holdMs: 4000,
      },
    ],
  },

  {
    id: 'texture-wrapping',
    module: 'textures',
    label: 'Wrapping 对比',
    description: 'Repeat / Mirror / Clamp 在 tiling=4 下',
    steps: [
      {
        textures: {
          wrapping: 'repeat',
          tiling: 4,
          filterMode: 'mipmap-linear',
          showUvGrid: true,
        },
        durationMs: 600,
        narration: 'Repeat：4×4 个 tile 全部朝向一致。每个 tile 看起来一样。',
        holdMs: 3500,
      },
      {
        textures: { wrapping: 'mirror' },
        durationMs: 800,
        narration: 'Mirror：相邻 tile 镜像翻转。看红色标记——每两格翻转一次方向。',
        holdMs: 4000,
      },
      {
        textures: { wrapping: 'clamp' },
        durationMs: 800,
        narration: 'Clamp：纹理边缘被拉伸到 UV 边界。tiling 失效（因为 UV 超过 [0,1] 时锁定边缘值）。',
        holdMs: 4000,
      },
      {
        textures: { wrapping: 'repeat', showUvGrid: false },
        durationMs: 500,
        narration: '回到 Repeat。三种模式各有用处：Repeat 用于重复纹理，Mirror 避免接缝，Clamp 用于 UI / 单帧贴图。',
      },
    ],
  },
] as const;

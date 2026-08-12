import type { Tour } from './types';

/**
 * Four pre-built transform demos. Each isolates one of the four core
 * matrix concepts (translation → m41, rotation → sin/cos, scale →
 * diagonal, non-commutative order) so the learner sees exactly what
 * each TRS component does to the matrix.
 */
export const TRANSFORM_TOURS: readonly Tour[] = [
  {
    id: 'transform-translate',
    module: 'transforms',
    label: '平移 → m41',
    description: '看矩阵最后一列如何编码位置',
    steps: [
      {
        transforms: {
          translate: [0, 0, 0],
          rotate: [0, 0, 0],
          scale: [1, 1, 1],
          order: 'TRS',
        },
        durationMs: 400,
        narration: '初始：单位矩阵。所有滑杆归零，F 与左侧"鬼影"重合。',
        holdMs: 1500,
      },
      {
        transforms: { translate: [2, 0, 0] },
        durationMs: 1200,
        narration: 'Translate X = 2：F 向右移 2 单位。看矩阵第 1 行第 4 列（m41）从 0 变成 2.00。',
        holdMs: 3500,
      },
      {
        transforms: { translate: [2, 1, 0] },
        durationMs: 1000,
        narration: 'Translate Y = 1：F 上移 1 单位。矩阵 m42（第 2 行第 4 列）同步变化。',
        holdMs: 3000,
      },
      {
        transforms: { translate: [0, 0, 1.5] },
        durationMs: 1200,
        narration: 'Translate Z = 1.5：F 朝相机方向移动。m43 变化，F 看起来更大（透视）。',
        holdMs: 3000,
      },
    ],
  },

  {
    id: 'transform-rotate',
    module: 'transforms',
    label: '旋转 → sin/cos',
    description: '矩阵里出现 sin/cos',
    steps: [
      {
        transforms: {
          translate: [0, 0, 0],
          rotate: [0, 0, 0],
          scale: [1, 1, 1],
          order: 'TRS',
        },
        durationMs: 400,
        narration: '初始：单位矩阵。',
        holdMs: 1500,
      },
      {
        transforms: { rotate: [0, 90, 0] },
        durationMs: 1500,
        narration: 'Rotate Y = 90°：F 转过 90°，正面朝向相机→侧面朝相机。矩阵的 m11=0、m13=1、m31=-1、m33=0——sin(90°) 和 cos(90°) 出现了。',
        holdMs: 4500,
      },
      {
        transforms: { rotate: [0, 180, 0] },
        durationMs: 1500,
        narration: 'Rotate Y = 180°：F 完全朝反方向（看背面）。矩阵对角线元素符号翻转。',
        holdMs: 3000,
      },
      {
        transforms: { rotate: [0, 0, 0] },
        durationMs: 1500,
        narration: '回到 0°。旋转矩阵的关键：左上 3×3 区域是 sin/cos 编码的旋转。',
        holdMs: 2500,
      },
    ],
  },

  {
    id: 'transform-scale',
    module: 'transforms',
    label: '缩放 → 对角线',
    description: '矩阵对角线就是 scale',
    steps: [
      {
        transforms: {
          translate: [0, 0, 0],
          rotate: [0, 0, 0],
          scale: [1, 1, 1],
          order: 'TRS',
        },
        durationMs: 400,
        narration: '初始：单位矩阵，对角线全是 1。',
        holdMs: 1500,
      },
      {
        transforms: { scale: [1, 2, 1] },
        durationMs: 1200,
        narration: 'Scale Y = 2：F 高度变 2 倍。矩阵 m22（第 2 行第 2 列）变成 2.00。',
        holdMs: 3500,
      },
      {
        transforms: { scale: [2, 2, 1] },
        durationMs: 1200,
        narration: 'Scale X = 2, Y = 2：F 横向和纵向都变 2 倍。m11 也变成 2.00。',
        holdMs: 3000,
      },
      {
        transforms: { scale: [1, 1, 1] },
        durationMs: 1000,
        narration: '回到单位 scale。Scale X 轴负值（-1）= 镜像翻转——试试自己拖。',
        holdMs: 3000,
      },
    ],
  },

  {
    id: 'transform-order',
    module: 'transforms',
    label: '顺序不可交换',
    description: 'TRS ≠ RTS：矩阵乘法不交换',
    steps: [
      {
        transforms: {
          translate: [1, 0, 0],
          rotate: [0, 0, 90],
          scale: [1, 1, 1],
          order: 'TRS',
        },
        durationMs: 600,
        narration: '设 T=(1,0,0), Rz=90°, S=(1,1,1)，顺序 = TRS。F 先在原点旋转 90°，再向右平移 1 单位。',
        holdMs: 4000,
      },
      {
        transforms: { order: 'RTS' },
        durationMs: 400,
        narration: '切换到 RTS：先平移再旋转。F 移到 (1,0,0) 后绕原点旋转 90°——位置完全不同！矩阵也变了。',
        holdMs: 5000,
      },
      {
        transforms: { order: 'TRS' },
        durationMs: 400,
        narration: '回到 TRS。同一组参数，顺序不同 → 完全不同的矩阵和姿态。这就是"矩阵乘法不可交换"。',
        holdMs: 4000,
      },
    ],
  },
] as const;

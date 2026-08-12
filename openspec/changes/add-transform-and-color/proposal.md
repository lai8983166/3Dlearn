## Why

3DLearn 已经覆盖了 4 块：PBR 材质、光学物理、阴影映射、纹理/UV。但图形学基础课里还有两块**所有教材都讲但学生最难理解**的内容缺位：

1. **几何变换矩阵**。教材用 4×4 齐次坐标矩阵推导 T / R / S，但矩阵乘法不可交换、`T * R * S` 与 `R * T * S` 出来的不一样——这种东西画在黑板上抽象得很，学生记完公式并不知道"matrix multiply order matters"在视觉上是什么样子。需要让学习者拖滑杆、看物体动、同时看矩阵每个元素变化。

2. **色彩管线 / Tone Mapping**。sRGB vs Linear 工作流、HDR → LDR 映射、ACES Filmic、exposure stops——这些是 PBR 渲染的最后一公里，但学生最容易混淆。常见症状："我的暗部怎么发灰？"、"为什么高光看起来烧死了？"——一次对比演示就懂。

这两块都是**可视化一次胜过千言**的经典领域，跟现有"逐步揭示"哲学完全契合。

## What Changes

引入两个新的 SceneModule：

- **Geometric Transforms Explainer（几何变换拆解器）**：字母 F 形状（程序化生成）+ T/R/S 滑杆 + 实时 4×4 矩阵表格。可切换变换顺序（TRS / TSR / RTS / RST / STR / SRT），让学习者亲眼看到矩阵乘法顺序对结果的影响。
- **Color Pipeline Explainer（色彩管线拆解器）**：6 个不同 albedo（0.05 – 1.0）的球 + 高强度光源（让像素值超 1.0 进入 HDR 范围）+ tone mapping 类型切换（None / Reinhard / ACES Filmic）+ exposure 滑杆 + gamma 校正开关。

顶部 Tab 从 4 个变 6 个：PBR / 光学 / 阴影 / 纹理 / 变换 / 色彩。复用现有 tour 引擎（每场景 3-4 个预设）和 hint 触发器。

## Capabilities

### New Capabilities
- `geometric-transforms`: 字母 F + T/R/S 滑杆 + 4×4 矩阵实时显示 + 变换顺序切换 + 原始/变换后双物体对比
- `color-pipeline`: 多球 HDR 场景 + tone mapping 类型切换（None/Reinhard/ACES）+ exposure + gamma 校正开关 + 高亮"被 clip 的高光"可视化

### Modified Capabilities
<!-- scene-shell / guided-tours / contextual-hints / help-system 不需要 spec-level 修改——能力不变，只是注册更多 tour 和 hint 条目。 -->

## Impact

- **新增代码**：
  - `src/scenes/transforms/`：F 形 BufferGeometry 生成、TransformModule、矩阵显示组件
  - `src/scenes/colors/`：ColorModule、tone mapping 切换、HDR 高光可视化
  - `src/tours/transformTours.ts`、`src/tours/colorTours.ts`
  - `src/hints/definitions.ts`：扩展新场景的 hint
  - `src/ui/helpContent.ts`：扩展两份文案
  - `src/ui/TransformsPanel.tsx`、`src/ui/ColorsPanel.tsx`
- **store 扩展**：新增 `transforms: TransformsState`、`colors: ColorsState`，`ModuleId` 类型加 `'transforms' | 'colors'`
- **新依赖**：无（用 Three.js BufferGeometry 拼字母 F + Three.js 内置 toneMapping）
- **localStorage**：persist 版本 bump 到 4

## Non-Goals

1. **不做完整 4×4 矩阵编辑器**。用户拖滑杆生成矩阵，不让用户直接编辑矩阵数值（避免变成矩阵计算器）。
2. **不做四元数 / 欧拉角对比**。先讲最基础的 TRS 矩阵；四元数和 gimbal lock 是后续主题。
3. **不做透视/正交投影矩阵拆解**。聚焦 model matrix，view/projection 留给将来。
4. **不做 AgX / Filmic Blues / 定制 LUT**。ACES Filmic + Reinhard + None 三档足够展示概念，更多 tonemap 是工程而非教学。
5. **不做颜色拾色器 / 像素 inspect**。鼠标 hover 读取像素需要 RenderTarget 读取，工程量大；首版用"被 clip 的像素数量"做可视化指标。
6. **不做 HDR 显示器支持**。目标 LDR 显示器（sRGB 输出）。
7. **不做 6 个场景之间的对照模式**。每个场景独立。

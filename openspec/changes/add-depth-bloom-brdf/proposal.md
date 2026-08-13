## Why

演示器现在覆盖了 PBR / 光学 / 阴影 / 纹理 / 变换 / 色彩 6 个模块，把"渲染一帧的画面是怎么出来的"讲得相对完整。但还有三类学生必踩的坑，**现有 6 个模块都没法讲清楚**：

1. **深度缓冲**：为什么两个共面的三角形会闪烁？为什么远处 z-fighting 比近处严重？为什么反向 Z 能让远处精度提升一个量级？——这些问题的答案藏在 z-buffer 里，但 Shadows/Textures 模块都不显示它。
2. **后处理管线**：HDR Bloom 几乎每个现代引擎都用，但学习者只能看到"打开/关闭"的二值结果，看不到 bright pass → blur pyramid → composite 这条管线是怎么一步步把高光"晕染"开的。
3. **BRDF 形态对比**：PBR 模块里可以切 Blinn-Phong ↔ GGX，但是同屏只看一种，无法直观感受 Lambert / Phong / Blinn-Phong / GGX / Oren-Nayar 在**同参数下**的高光形态差异。

这三个空白都是"教材讲不清、引擎面板看不见"的典型，正好对齐本项目"让学习者看见每一层贡献"的核心定位。

## What Changes

新增 3 个独立的场景模块，每个遵循现有"分层 toggle + 实时 HUD + 演示场景 + 上下文提示"模式：

1. **深度缓冲拆解（depth-buffer）**
   - 切换显示深度缓冲（灰度可视化）vs 正常渲染
   - 两个共面三角形演示 z-fighting 闪烁
   - 可调：depthFunc（LESS / EQUAL / ALWAYS）、depthWrite 开关、polygonOffset
   - 切换传统 Z（透视图）与反向 Z（对数分布），HUD 显示深度公式

2. **Bloom / HDR pipeline 拆解（bloom-pipeline）**
   - 5 个可独立 toggle 的 pass：HDR Scene → Bright Pass → Blur Down → Blur Up → Composite → Tonemap
   - 角落实时显示每个中间 pass 的输出（缩略图网格）
   - 可调：threshold、soft knee、blur radius、composite strength
   - HUD 实时显示当前激活 pass 的公式（如 bright = max(lum − threshold, 0)）

3. **BRDF 模型对比（brdf-comparison）**
   - 一个球切成 5 扇区（或 5 个并排小球），每扇区不同 BRDF：Lambert / Phong / Blinn-Phong / GGX / Oren-Nayar
   - 同 roughness、同光源、同视角，肉眼对比高光形态
   - 可调：roughness（统一）、光源 yaw/pitch、是否显示 cos 曲线 overlay
   - HUD 显示当前扇区的 BRDF 公式

4. **教学引导层扩展**：每个新模块配 3–4 个 tour 预设和 2–3 个上下文提示，与现有 6 个模块风格一致

## Capabilities

### New Capabilities
- `depth-buffer-explainer`: 深度缓冲可视化与 z-fighting 教学模块；支持 depthFunc 切换、depthWrite 开关、polygonOffset、传统 Z vs 反向 Z 对比
- `bloom-pipeline-explainer`: Bloom/HDR 后处理管线分层拆解；每个 pass 独立 toggle，中间产物角落可视化
- `brdf-comparison-explainer`: 同参数下多种 BRDF 模型（Lambert / Phong / Blinn-Phong / GGX / Oren-Nayar）同屏对比

### Modified Capabilities
- `scene-shell`: 顶部 Tab 栏从 6 个变 9 个；`ModuleId` 扩展 3 个新值；store 新增 `depth`/`bloom`/`brdf` 三块 state slice

> **注**：guided-tours / contextual-hints 仍在 `add-guided-learning` 变更中尚未归档，因此本次不 MODIFY 这两个能力。每个新模块的 spec 内部以"该模块 MUST 通过 tour registry 注册 N 个 tour、通过 hint system 注册 N 个 hint"的形式自包含描述教学引导需求。等 add-guided-learning 归档后，这些引用自然指向稳定的能力。

## Impact

- **新增代码**：
  - `src/scenes/depth/DepthModule.ts` + UI panel
  - `src/scenes/bloom/BloomModule.ts` + UI panel + 多 pass RT 管理
  - `src/scenes/brdf/BrdfModule.ts` + UI panel + 自定义 ShaderMaterial（5 扇区切片）
  - `src/tours/{depthTours,bloomTours,brdfTours}.ts`
  - `src/ui/{DepthPanel,BloomPanel,BrdfPanel}.tsx`
  - `src/store.ts` 扩展：`DepthState` / `BloomState` / `BrdfState` 三块 slice + 对应 setter
- **新增依赖**：无（Three.js EffectComposer / UnrealBloomPass 已在 `three/examples/jsm/postprocessing/` 中）
- **包大小预估**：每个模块约 5–15 KB（gzipped），主要增量是 EffectComposer 引入（约 +20 KB gzipped）
- **README 更新**：新增 3 个模块段落、验收清单、tour/hint 列表
- **localStorage**：store 版本 v4 → v5（结构变化，需迁移或失效）

## Non-Goals

1. **不做 SSAO / GTAO**。后处理可以无穷扩展，本次只覆盖 Bloom（最常见、视觉冲击最大），AO 留下次。
2. **不做延迟渲染 / G-Buffer 拆解**。它和现有 forward 渲染路径不兼容，要重写 SceneManager；规模超出本次范围。
3. **不做自定义 GLSL Bloom**。复用 Three.js 的 `UnrealBloomPass`，教学要点通过参数 + 中间纹理可视化传达，不从零写球谐 / 双滤波 blur。
4. **不做 BRDF 的 anisotropic 扩展**。只覆盖各向同性 5 种模型；各向异性（Ashikhmin-Shirley 等）留到后续。
5. **不做深度缓冲的 hyperbolic Z 全公式推导**。只对比传统 vs 反向 Z 的深度分布图，不展开推导链。
6. **不引入 KaTeX / 数学公式渲染库**。继续用 Unicode + 等宽字体（与现有 PBR HUD 风格一致）。

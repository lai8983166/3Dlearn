## Context

3DLearn 当前有 6 个场景模块（PBR / Optics / Shadows / Textures / Transforms / Colors），共享同一架构：每个模块实现 `SceneModule` 接口（`init` / `update` / `dispose` / `onResize`），订阅 Zustand store，把状态变化应用到 Three.js 对象。UI 用 React + Tailwind，公式 HUD 用 Unicode + 等宽字体。教学引导层（tours / hints / help）由 `add-guided-learning` 引入，registry 模式让每个模块自带 tour / hint 文件。

本次新增 3 个模块（深度缓冲、Bloom、BRDF 对比）。每个都把"教材讲不清、引擎面板看不见"的概念变成可调参数 + 实时可视化。三个模块各自的**最大不确定点**：

1. **深度模块**：反向 Z 需要修改相机投影矩阵或用 logarithmic depth buffer，Three.js 没有现成开关
2. **Bloom 模块**：要把 UnrealBloomPass 的内部 pass 拆开 + 让用户独立 toggle，EffectComposer 的 fixed pipeline 要绕开
3. **BRDF 模块**：5 个 BRDF 写在一个 ShaderMaterial 里、靠顶点 attribute 切分扇区，分支逻辑可能性能或可读性问题

这三个点在下文 Decision 中各自有专门章节。

## Goals / Non-Goals

**Goals:**
- 3 个新模块都符合现有"分层 toggle + 公式 HUD + tour + hint"风格
- 在 Intel Iris / AMD APU 级别 GPU 上稳定 60fps
- 中间产物（深度图 / bloom 各 pass / BRDF 公式）必须**可见**，让学习者看到引擎面板藏起来的东西
- localStorage 平滑迁移，老用户刷新后不丢已看 hint 状态

**Non-Goals:**
- 不实现完整的 deferred renderer（G-Buffer 拆解留下次）
- 不引入 KaTeX 等公式渲染库
- 不做 SSAO / GTAO / DOF / motion blur 等其他后处理（Bloom 是最基础、最有代表性的一个）
- 不做 anisotropic BRDF（Ward / Ashikhmin-Shirley），只覆盖 5 种各向同性模型
- 不重写 SceneManager / RendererCanvas（保持现有架构稳定）

## Decisions

### Decision 1: 深度模块的反向 Z 用 gl_FragDepth 注入，不重写投影矩阵

**选择**：用 `MeshStandardMaterial.onBeforeCompile` 注入 `gl_FragDepth` = logarithmic 公式，对每段 mesh 单独生效。相机 `near = 0.1, far = 100`（传统）或 `near = 0.01, far = 1000`（反向）通过普通 setter 切换。

**理由**：
- Three.js 的 `PerspectiveCamera` 没有原生 reverse-Z 开关，重写投影矩阵需要操作 `projectionMatrix.elements`，副作用大（影响 OrbitControls、frustum culling 等）
- Logarithmic depth buffer 是 Three.js examples 里的成熟技巧（`three/examples/jsm/lines/LineMaterial` 等都用了），效果接近 reverse-Z：让深度分布近对数，远距离精度大幅提升
- 教学目标达成即可：让学习者看到"传统 Z 远处精度密集在 0.99–1.0"vs"logarithmic 远处分布均匀"。两种模式的视觉效果（z-fighting 程度）差异清晰可见
- 性能成本：logarithmic depth 每片元多一次 `log2` 计算，对现代 GPU 微秒级，可接受

**替代方案**：
- 直接操作 projection matrix 实现 reverse-Z —— 副作用太大，影响 OrbitControls target/distance 计算
- 用 WebGL2 的 `gl.depthRange(1, 0)` —— 浏览器支持参差，且和 Three.js 现有 clear 逻辑冲突
- 多 camera 渲染（一个传统、一个反向）—— 资源浪费

**深度可视化**：用 `MeshDepthMaterial` 渲染整个场景到一张 render target，再作为纹理画到画布主区域。这是 Three.js 原生功能，零额外成本。角落深度缩略图直接复用同一纹理。

### Decision 2: Bloom 模块不直接用 UnrealBloomPass，自己用 RenderPass + ShaderPass 组合管线

**选择**：自建后处理链：

```
RenderPass(scene, camera)        → rt_scene (HDR, RGBA16F)
  ↓
BrightPassShader                 → rt_bright
  ↓
GaussianBlurDownShader × N       → rt_down[N]
  ↓
GaussianBlurUpShader × N         → rt_up[0]
  ↓
CompositeShader(scene + bloom)   → rt_final (LDR after ACES)
```

每个 ShaderPass 对应一个 toggle + 一个缩略图。

**理由**：
- UnrealBloomPass 把 bright pass + 多级 blur + composite 全封装在一个 pass 里，无法独立 toggle，违背教学"逐步揭示"哲学
- 自己组合 `ShaderPass` 让每个 pass 都有清晰的输入/输出 RT，可单独显示
- 每个着色器不超过 30 行 GLSL，5 个着色器总共 ~150 行，可维护
- EffectComposer 已经处理 RT 切换、ping-pong、resize，复用它的基础设施
- 性能与 UnrealBloomPass 相当（同样的高斯下采样金字塔）

**RT 命名约定**：每个 RT 注册到 `bloomRts` 字典，缩略图组件通过 pass id 查询对应 RT，统一渲染逻辑。

**HDR 支持**：renderer 启用 `halfFloat` RT 类型（`THREE.HalfFloatType`）。Three.js 默认输出是 LDR，但 EffectComposer 内部可以用 HDR RT。这是 Three.js 标准用法。

**替代方案**：
- 直接用 UnrealBloomPass + 强行 monkey-patch 拆开 —— 太 hacky，破坏 Three.js 内部状态
- 用 @react-three/postprocessing —— 项目原则禁止（不引入 @react-three/fiber 系列）
- 用 LDR RT 简化 —— 失去教学价值（Bloom 的意义就在 HDR）

### Decision 3: BRDF 模块的"5 扇区球"用经度切片 + 顶点 attribute

**选择**：构造一个单位球，给每个顶点根据其球坐标 φ（经度）计算 `sectorId`（0–4），写入 `Float32Attribute`。片元着色器用 `if (sectorId < 0.5)` / `else if (sectorId < 1.5)` / ... 选择 BRDF 分支。

**几何生成**：

```typescript
const sector = Math.floor((phi / (2 * Math.PI)) * 5); // 0..4
geometry.setAttribute('sectorId', new THREE.Float32BufferAttribute(sectorIds, 1));
```

**理由**：
- 一个 ShaderMaterial，5 个分支 → 一次 draw call，性能最佳
- Three.js 的 `glsl` 不支持 switch + fallthrough，用 if/else if 链可读性最差也最稳定
- 顶点 attribute 比 uniform 数组更直观（每个片元只需要查一个 id）
- 扇区边界处的 1 像素抗锯齿过渡不显眼（学习者关注的是 5 个区域的宏观对比）

**5 个 BRDF 的实现复杂度**（从简单到复杂）：
1. Lambert —— 1 行
2. Phong —— 计算 R·V，3 行
3. Blinn-Phong —— 计算 H = normalize(L+V)，3 行
4. GGX —— D + F + V 三项，~15 行
5. Oren-Nayar —— A + B + s + t，~8 行

总计 ~30 行 GLSL，单 shader 完全可控。

**扇区分割线**：在每个 sectorId 边界（phi = 2πk/5）画一条细分线（LineSegments），让边界视觉上明显。这是 UI/UX 决策，不影响 BRDF 计算。

**替代方案**：
- 5 个独立 Mesh 各自一个 material —— 5×draw call，但场景复杂度低也 OK；放弃因为缺少"5瓣合一"的视觉整体感
- 用 `gl_FragCoord` 推算扇区 —— 不灵活（受画布大小影响），不可控
- 5 个独立球并列 —— 改变了"同球不同 BRDF"的教学意图

### Decision 4: 公式 HUD 复用现有 FormulaHud 组件，扩展 selector 模式

**选择**：现有 `FormulaHud` 已经支持根据 `activeModule` 显示不同公式（PBR 模块显示 N·L / GGX / Fresnel 等）。本次扩展：每个新模块在 `src/ui/FormulaHud.tsx` 内增加一个 case，从对应 state slice 派生当前公式字符串。

**理由**：
- 不引入新组件，保持架构简单
- FormulaHud 已经处理"激活模块变化时切换公式"的逻辑
- 每个新模块的公式选择逻辑只需要一个 switch/case

**深度模块 HUD 选择逻辑**：

```typescript
function selectDepthFormula(s: DepthState): string {
  if (s.reversedZ) return 'z_ndc = log2(z_eye + 1) / log2(far + 1)';
  return 'z_ndc = (f+n)/(f−n) − 2fn/(f−n)·1/z_eye';
}
```

**Bloom 模块 HUD 选择逻辑**：根据 `activePassId`（store 中独立字段）返回对应公式。

**BRDF 模块 HUD 选择逻辑**：根据 `selectedSector`（store 中独立字段）返回对应公式。

### Decision 5: Store 迁移用 Zustand persist 的 `migrate` 函数

**选择**：把 store 版本从 4 升到 5，注册 `migrate` 函数：

```typescript
version: 5,
migrate: (persistedState: any, version: number) => {
  if (version < 5) {
    // 新 slice 用默认值，老 slice 保留
    return {
      ...persistedState,
      depth: defaultDepthState,
      bloom: defaultBloomState,
      brdf: defaultBrdfState,
    };
  }
  return persistedState;
},
```

**理由**：
- Zustand persist 原生支持版本迁移
- 老用户的 seenHints（教学进度）必须保留——这是教学工具的关键 UX
- 不迁移的话，用户刷新后所有 hint 都会重新弹（违反"每个最多一次"承诺）
- 三个新 slice 用默认值即可，不需要从老数据推断

**回滚**：如果 v5 有严重 bug，用户清 localStorage 即可重置（已有的"重置提示"按钮扩展为"重置全部"）。

### Decision 6: Tab 栏 9 个模块在 1280px 以下折叠为下拉

**选择**：在 `App.tsx` 顶部 header 加一个 `useMediaQuery('(min-width: 1280px)')` hook，宽屏显示 9 个 inline button，窄屏折叠为 `<select>` 下拉。

**理由**：
- 9 个 Tab 在 1280px 宽度下每个 ~80px 紧凑显示，刚好够
- 1024–1280px 范围内（最小支持宽度）按钮会被挤压，下拉是稳妥回退
- 现有最小宽度约束是 1024px，与之前一致

## Risks / Trade-offs

### Risk 1: Bloom 自建着色器可能有 bug
**风险**：高斯下采样金字塔、HDR RT ping-pong、composite 阶段的 alpha 混合，每个细节都容易出错。
**缓解**：
- 先实现一个最简版本（单 pass bright + 单 pass blur + composite），跑通后再加金字塔
- 用 UnrealBloomPass 作为视觉对照（dev mode 下并排显示）—— 不暴露给用户，仅用于开发期 diff
- 每个 pass 加 dev assert：输出 RT 的 max value 在预期范围

### Risk 2: 反向 Z + logarithmic depth 与 OrbitControls 兼容性
**风险**：logarithmic depth 修改 gl_FragDepth，但 OrbitControls 不感知；某些视角下 z-fighting 可能更严重（logarithmic 在近距离精度反而比传统 Z 差）。
**缓解**：
- 教学场景明确：logarithmic 模式专门用来展示"远距离精度提升"
- 在 HUD 上明确标注 trade-off（"近距离略差，远距离大幅改善"）
- 切换 logarithmic 模式时不调相机参数，让学习者自己比较

### Risk 3: BRDF 5 分支着色器可能在某些 GPU 上 unroll 失败
**风险**：老 Intel GPU 可能对长 if/else if 链性能很差。
**缓解**：
- 每个分支计算尽量少（最贵的是 GGX ~15 行）
- 实测在 Intel Iris Xe / AMD Vega 上 60fps（开发期 benchmark）
- 如果性能不足，回退方案：用 5 个独立 Mesh（5×draw call 但单 BRDF），开发难度更低

### Risk 4: 中间 RT 缩略图渲染与主画布渲染争抢 GPU 时间
**风险**：Bloom 模块要画 5 个缩略图，每个都是 full-screen pass 的 blit。
**缓解**：
- 缩略图分辨率固定 200×150，开销极小
- 用同一个 ShaderPass 把 5 个 RT blit 到 5 个 viewport，一次 draw call
- 已有 `drawCornerQuad` 工具（shadows/textures 模块在用），扩展为支持多 RT

### Risk 5: 9 个 Tab 在窄屏体验退化
**风险**：用户在 1024px 屏幕上 9 个 inline button 拥挤难看。
**缓解**：Decision 6 的下拉回退 + 默认显示前 6 个（PBR / 光学 / 阴影 / 纹理 / 变换 / 色彩），新模块在 `...` 折叠菜单里。

### Trade-off: 深度可视化用 MeshDepthMaterial 而非自定义 depth shader
**代价**：MeshDepthMaterial 渲染的是线性化后的深度（near 黑、far 白），与"反向 Z 模式下深度分布变化"的教学要点不完全契合。
**收益**：复用 Three.js 原生功能，开发量小。教学要点通过"远距离 z-fighting 闪烁差异"传递，不依赖深度可视化的精确分布曲线。
**最终决定**：可视化用 MeshDepthMaterial（标准、易懂），同时画一个独立的"深度分布 mini-plot"（在 HUD 区域，程序化生成 SVG 曲线）来展示传统 Z vs 反向 Z 的分布对比。

## Migration Plan

1. **store v4 → v5**：用户刷新后自动 migrate，保留 seenHints / activeModule / 老模块 state，新模块 state 用默认值
2. **新模块代码**：分 3 个 commit（深度 / Bloom / BRDF），每个 commit 包含 scene module + UI panel + tour + hint
3. **回归测试**：每加一个模块跑一次 `npm run build` + `npm test`（确认 11 个老测试不挂）
4. **手动验收**：每个模块按 spec 的"教学要点验证"清单走一遍

**回滚策略**：如果某个模块出严重问题，可以单独删 `src/scenes/<module>/`、`src/ui/<Module>Panel.tsx`、对应 tour/hint、Tab 入口、store slice，不影响其他 8 个模块。

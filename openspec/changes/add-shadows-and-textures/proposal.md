## Why

当前演示器覆盖了 PBR（材质）和光学（物理）两条线，但图形学里还有两块**初学者最容易卡壳**的内容：

1. **阴影映射（Shadow Mapping）**。教材里讲 bias、PCF、shadow acne、peter panning，但学生看不到这些东西实际是什么样子——Blender / Unity / Unreal 默认都把阴影"调好了"，看不到坏掉的样子。学完只是记住名词，没有视觉经验。

2. **纹理与 UV**。UV 坐标把 3D 表面映射到 2D 纹理空间，过滤模式（Nearest / Linear / Mipmap / Anisotropic）影响远处和斜视角的清晰度，wrapping 决定 tiling 行为。这些在文档里都是表格，学生记不住"哪种模式解决什么问题"，因为没有对比。

这两块在图形学课里**必讲但难讲**，正是交互式演示能发挥最大价值的地方。现有架构（SceneModule 接口、tour runner、hint 触发器、help 面板）让加新场景几乎是"复制粘贴 + 写新内容"，技术风险低。

## What Changes

引入两个新的 SceneModule：

- **Shadow Mapping Explainer（阴影映射拆解器）**：方向光 + 几个几何体 + 可调 bias / 分辨率 / PCF。画布角落显示 shadow map 预览。学习者可以看到 bias=0 时的 acne、过大时的 peter panning、PCF 开启时的软阴影过渡。
- **Texture & UV Explainer（纹理与 UV 教学器）**：平面 + 程序化 checkerboard 纹理 + 过滤模式 / anisotropic / wrapping / tiling 切换。提供 UV 网格叠加在 3D 表面 + 角落 2D 纹理预览，让学习者看到 3D 表面与 2D UV 空间的对应关系。

顶部 Tab 从 2 个变 4 个：PBR / 光学 / 阴影 / 纹理。复用现有的 tour 引擎（每场景 3-4 个预设）和 hint 触发器（每场景 3-5 个触发点）。

## Capabilities

### New Capabilities
- `shadow-mapping`: 阴影映射拆解器——方向光阴影、bias/PCF/分辨率三件事可调、shadow map 角落预览、光源角度调节
- `texture-uv`: 纹理与 UV 教学——过滤模式（Nearest/Linear/Mipmap/Anisotropic）、wrapping 模式、tiling/offset、UV 网格叠加、2D 纹理角落预览

### Modified Capabilities
<!-- scene-shell 不需要 spec-level 修改：4 个 Tab 仍然是"模块路由"，只是模块数变多。guided-tours / contextual-hints / help-system 同理——它们的能力不变，只是注册更多 tour 和 hint 条目。所有改动都在实现层，不动 spec。 -->

## Impact

- **新增代码**：
  - `src/scenes/shadows/`：场景模块 + shadow map 角落预览组件
  - `src/scenes/textures/`：场景模块 + UV 网格叠加 + 2D 纹理角落预览
  - `src/tours/shadowTours.ts`、`src/tours/textureTours.ts`：预设场景
  - `src/hints/`：扩展 definitions 加入新场景的 hint
  - `src/ui/helpContent.ts`：扩展两份文案
- **store 扩展**：新增 `shadows: ShadowsState`、`textures: TexturesState`，activeModule 类型加两个值 `'shadows' | 'textures'`
- **UI**：顶部 Tab 加两个，文字缩短（"PBR / 光学 / 阴影 / 纹理"），1024px 屏宽下紧凑但可容纳
- **新依赖**：无（用 Three.js 内置 DirectionalLight.shadow + CanvasTexture）
- **localStorage**：persist 版本 bump 到 3，加入两个新 state 切片

## Non-Goals

1. **不做聚光灯阴影**。聚光灯的 shadow camera 参数复杂、教学价值低于方向光（方向光的正交投影更直观）。聚光灯留给将来。
2. **不做点光源阴影**（cube map shadow）。技术路径完全不同，复杂度高，超出首期范围。
3. **不做 Cascaded Shadow Maps（CSM）**。CSM 是大场景优化，不是入门概念。
4. **不做 UV 展开动画**。从 3D 几何"摊平"到 2D 的动画过程工程量大（要操作 geometry 顶点）；改用静态 UV 网格叠加达到教学目的。
5. **不做 procedural texture playground**（用户写 shader）。会变成 ShaderToy，违背"逐步揭示"哲学。
6. **不做 HDR 纹理 / normal map 纹理教学**。Normal Map 已在 PBR 模块覆盖；HDR 纹理超出基础范围。
7. **不做 4 个场景之间的统一对照**。每个场景独立，不在场景间切换对比（避免 UX 复杂化）。

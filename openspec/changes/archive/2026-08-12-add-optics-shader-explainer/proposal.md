## Why

学习图形学和光学的人今天有几个绕不开的痛点：

1. **PBR 材质参数是"黑箱"**。教科书里讲 Roughness / Metalness / Fresnel，但学习者在 Blender、Unity、Three.js 里调整这些参数时，看到的是"全都一起动"的最终结果——无法单独观察 Specular 高光去掉后物体看起来是什么样、无法直观感受法线贴图如何"骗过"光照计算。教材是静态截图，编辑器是终极合成，中间没有过渡。

2. **几何光学的"实像/虚像"靠脑补**。初学者读到 1/v - 1/u = 1/f 时，没有工具能让他拖动物体、看到光线如何被透镜折射、看到像点怎么跟着移动。Raycaster 在 Three.js 里通常只用来做拾取，没有教学项目把它用来画出真实可计算的折射光路。

3. **现有教学资源要么太学术（公式推导）要么太娱乐（直接玩 ShaderToy）**，缺少"逐步揭示"的中间件——让学习者一键关闭某一层渲染贡献，立刻看到差异。

本变更就是填这个空白：一个浏览器里跑的、能让人"看见每一层贡献"的演示器。

## What Changes

引入一个 Three.js + React 应用，分两个独立的演示模块（路由切换）：

- **PBR Shader 拆解器**：在一个标准球体上，按图层叠加 Diffuse → Specular（Blinn-Phong / GGX）→ Normal Map → Environment Map（Fresnel 反射）。每层有独立开关与参数滑杆，可即时看到关闭/打开的视觉差。
- **几何光学沙盒**：可放置凸/凹透镜、点光源或平行光源；通过 Raycaster 发射光线，在透镜表面应用斯涅尔定律计算折射路径，实时绘制光路；演示焦点位置、实像/虚像的形成。
- **共享场景外壳**：相机轨道控制、HUD 信息、参数侧边栏、HDRI 环境加载。

## Capabilities

### New Capabilities
- `scene-shell`: 应用外壳——Three.js 渲染器初始化、React 控制面板布局、相机/轨道控制、HDRI 环境加载与切换、模块路由（PBR / 光学）
- `pbr-layer-explainer`: 在球体上分层叠加 PBR 渲染贡献（Diffuse / Specular / Normal / Env Reflection），每层独立开关、参数可调，提供"逐层揭示"教学体验
- `optics-simulation`: 透镜/光源放置、基于斯涅尔定律的 Raycaster 折射光路计算、实像/虚像位置求解与可视化
- `asset-pipeline`: HDRI 与贴图资源的按需加载、缓存、进度提示、体积预警（用于 polyhaven 等大文件）

### Modified Capabilities
<!-- 此项目当前为空白工程，无既有 spec 需要修改 -->

## Impact

- **新增代码**：`src/scenes/pbr-explainer/`、`src/scenes/optics/`、`src/ui/`、`src/shared/`、`src/physics/optics.ts`
- **新增依赖（重）**：
  - `three` (~600KB min)
  - `react` + `react-dom` (~140KB)
  - `zustand` (~5KB)
  - `tailwindcss` + 构建工具 (~开发期依赖)
  - **HDRI 资源**：每个 `.hdr` 文件 5–20MB，运行时从 polyhaven 下载，**首次加载时必须明确提醒用户**
- **构建产物**：~1MB JS bundle（不含 HDRI），首次进入 PBR 模块下载 1 个 HDRI（用户选择）
- **无后端**：纯静态托管即可
- **测试策略**：物理计算（斯涅尔、透镜方程）写单元测试；渲染层手动验收

## Non-Goals

1. **不做光谱/波动光学**。本演示器只覆盖几何光学（光线追迹），不做干涉、衍射、偏振。
2. **不做自定义 Shader 编辑器**。PBR 拆解器使用受控的预设 Shader 链，不提供 GLSL 编辑框（避免变成 ShaderToy 玩具）。
3. **不做生产级光线追踪路径追踪器**。折射只处理薄透镜近似和单次球面折射，不模拟色散、不模拟厚透镜、不模拟全反射的能量衰减。
4. **不做移动端优化**。目标是带鼠标和键盘的桌面浏览器，触屏 UX 不在首期范围。
5. **不做账号/云存储**。用户调参状态只用 localStorage 保存，无后端。

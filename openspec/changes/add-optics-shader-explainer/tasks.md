## 1. Phase 1 — 项目骨架与 PBR 拆解器 MVP

目标：可独立演示"在球体上分层叠加 Diffuse / Specular / Normal / Env Reflection"。本 Phase 结束即可作为第一版教学演示。

- [ ] 1.1 初始化 Vite + React + TypeScript 项目，配置 Tailwind CSS，验证 `pnpm dev` 启动空白页（~30 min）
- [ ] 1.2 安装 `three`、`@types/three`、`zustand`，建立目录结构：`src/scenes/`、`src/ui/`、`src/shared/`、`src/physics/`（~20 min）
- [ ] 1.3 实现 `SceneModule` 接口（`init` / `dispose` / `update`）和 `createRenderer` 工厂（设置 ACES tone mapping、sRGB、抗锯齿）（~45 min）
- [ ] 1.4 实现 React 端 `useEffect` 挂载 `SceneModule` 到 canvas ref，处理 resize 和 StrictMode 双调用问题（~60 min）
- [ ] 1.5 实现 `pbr-explainer` 场景骨架：单个球体 `MeshStandardMaterial` + 三点光照 + OrbitControls + `RoomEnvironment` 作为默认环境（~90 min）
- [ ] 1.6 通过 `material.onBeforeCompile` 注入四个 boolean uniform（`uDiffuseEnabled` 等），在 fragment shader 各贡献段乘以对应开关（~120 min）
- [ ] 1.7 实现侧边栏 UI：四层开关、Diffuse color picker、Specular 强度滑杆、Roughness 滑杆、Metalness 滑杆，绑定 Zustand store（~90 min）
- [ ] 1.8 实现 Blinn-Phong 与 GGX 高光模型切换（通过替换 `MeshStandardMaterial` 的 specular BRDF chunk）（~120 min）
- [ ] 1.9 准备三张法线贴图（光滑 / 砖墙 / hammered metal），压缩到 < 200KB 每张，放 `public/textures/normalMaps/`（~60 min，含素材查找）
- [ ] 1.10 实现 Normal Map 切换 UI 与加载逻辑，验证法线一致性（光源移动时凹凸方向正确反转）（~45 min）
- [ ] 1.11 实现侧边栏 HUD：显示当前激活层对应的公式（用静态 SVG 或预截图，不用 KaTeX 避免依赖膨胀）（~60 min）
- [ ] 1.12 Phase 1 验收：录制操作视频，确认四个开关各自可独立演示视觉差异，60fps（~30 min）

## 2. Phase 2 — 几何光学沙盒

目标：可演示薄透镜成像、实像/虚像形成、光线追迹可视化。Phase 1 与 Phase 2 通过顶部 Tab 切换。

- [ ] 2.1 实现 `src/physics/optics.ts`：定义 `LensType`、`Ray`、`LensConfig`、`ImagingResult` 类型与 `computeThinLensImaging` 纯函数（~90 min）
- [ ] 2.2 写 `optics.test.ts` 单元测试：覆盖 u=2f→v=2f、u<f→虚像、凹透镜 f<0、物体在焦点上 v→∞ 等边界（~60 min）
- [ ] 2.3 实现 `refractThroughThinLens` 函数：根据薄透镜规则（平行入射过焦点 / 过光心不偏折 / 过焦点平行出射）返回出射 Ray（~90 min）
- [ ] 2.4 实现 `optics` 场景骨架：俯视侧视图、光轴水平、网格地面（参考线）（~45 min）
- [ ] 2.5 实现透镜几何体生成（双凸/平凸/双凹/平凹四种形状的 BufferGeometry），半透明玻璃材质（~120 min）
- [ ] 2.6 实现物体（垂直箭头）与可拖动交互（用 `DragControls` 或 raycaster + pointermove）（~90 min）
- [ ] 2.7 实现光线绘制：`LineSegments` + 预分配 BufferAttribute，每帧根据当前物体位置调用 `refractThroughThinLens` 更新顶点（~90 min）
- [ ] 2.8 实现平行光 / 点光源切换，光线数量 N 可调（3–21 条）（~60 min）
- [ ] 2.9 实现像点标记（实像用实心箭头、虚像用空心虚线箭头）与放大率数值显示（~75 min）
- [ ] 2.10 实现侧边栏 HUD：f、u、v、m、像类型、物体性质实时数值，并加"教学近似：薄透镜"说明（~45 min）
- [ ] 2.11 实现焦点 F、F' 标记，焦距滑杆（f = -3.0 到 +3.0），透镜类型切换下拉（~60 min）
- [ ] 2.12 Phase 2 验收：拖动物体从 u=3f 到 u<f，全程光路与像点正确更新，无跳变（~30 min）

## 3. Phase 3 — HDRI 资源管道

目标：用户可切换 polyhaven HDRI 作为环境贴图，带体积预警、缓存、失败重试。本 Phase 让 PBR 模块的 Env Reflection 更出彩。

- [ ] 3.1 列出 3–5 个候选 HDRI（如 `studio_small_08`、`wood_lounge`、`kloppenheim_02`），确认 polyhaven 直链与 CORS 头（~30 min，需联网）
- [ ] 3.2 实现 IndexedDB 封装 `src/shared/hdriCache.ts`：`get(name)`、`set(name, arrayBuffer)`、`has(name)`（~60 min）
- [ ] 3.3 实现 `loadHDRI(name)`：先查 IndexedDB → 否则 fetch + 进度回调 → `RGBELoader.parse` → `PMREMGenerator.fromEquirectangular`（~90 min）
- [ ] 3.4 实现"切换 HDRI"按钮和下拉，点击后弹出体积确认对话框（显示 MB 数）（~60 min）
- [ ] 3.5 实现下载进度条 UI（百分比 + 已下载/总字节数）（~45 min）
- [ ] 3.6 实现下载失败提示与"重试 / 取消"按钮，失败时保留原环境贴图不变（~45 min）
- [ ] 3.7 验证切换 HDRI 时 `renderer.info.memory.textures` 不无限增长（旧 envMap 调用 `dispose()`）（~30 min）
- [ ] 3.8 Phase 3 验收：下载一个 HDRI、切走再切回（走缓存）、模拟断网重试，全流程顺畅（~30 min）

## 4. Phase 4 — 模块切换、错误处理与打磨

目标：模块间无缝切换、资源正确释放、错误路径完备。

- [ ] 4.1 实现顶部 Tab 路由（PBR ↔ Optics），切换时调用旧 `SceneModule.dispose()` 并验证 `renderer.info.memory` 下降（~75 min）
- [ ] 4.2 实现 WebGL 不可用检测：`WebGLRenderingContext` 不存在时显示错误页（~30 min）
- [ ] 4.3 实现窄屏提示（宽度 < 1024px 显示"请使用更大屏幕"，并提供"仍要继续"按钮）（~30 min）
- [ ] 4.4 用 localStorage 持久化用户的 PBR 参数与透镜配置（启动时恢复）（~45 min）
- [ ] 4.5 全局性能检查：用 throttled `stats.js` 或 `renderer.info` 验证两个模块均稳定 60fps（~30 min）
- [ ] 4.6 写 README：如何启动、如何切换模块、各模块教学要点（~60 min）
- [ ] 4.7 最终验收：连续在两模块间切换 10 次，GPU 内存稳定不泄漏，UI 响应正常（~30 min）

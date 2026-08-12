## 1. Phase 1 — 阴影映射场景

目标：阴影映射拆解器跑通，4 大教学点（acne / peter panning / PCF / 分辨率）可演示。

- [ ] 1.1 store 扩展：加 `ShadowsState`（resolution / bias / pcfMode / lightYaw / lightPitch），加 `shadows` 字段，`activeModule` 类型加 `'shadows'`，persist 版本 bump 到 3（~30 min）
- [ ] 1.2 `src/scenes/shadows/ShadowModule.ts` 骨架：地面 + 立方体 + 球 + DirectionalLight，启用 `renderer.shadowMap.enabled`，所有物体 `castShadow / receiveShadow`（~75 min）
- [ ] 1.3 接 OrbitControls，相机俯视场景；接入 store 让 lightYaw / lightPitch 控制 DirectionalLight 的 position（极坐标转换）（~45 min）
- [ ] 1.4 接 store 让 resolution 切换重建 shadow map（`light.shadow.mapSize.set(w, h); light.shadow.map?.dispose()`）；bias 滑杆直接绑 `light.shadow.bias`（~45 min）
- [ ] 1.5 PCF 模式切换：None/1/3/5 → 映射到 `BasicShadowMap / PCFShadowMap / PCFSoftShadowMap`；切换时设 `renderer.shadowMap.needsUpdate = true`；3/5 还要调 `light.shadow.radius`（~75 min）
- [ ] 1.6 写 `src/three/cornerPreview.ts` utility：`drawCornerQuad(renderer, texture, viewport)`；用独立正交相机 + 全屏四边形渲染（~60 min）
- [ ] 1.7 在 ShadowModule 的 update 末尾调用 cornerPreview，传入 `light.shadow.map?.texture`，画在左下角 160×120（~45 min）
- [ ] 1.8 写 `src/ui/ShadowsPanel.tsx`：分辨率按钮组、bias 滑杆、PCF 模式按钮组、yaw/pitch 滑杆（~60 min）
- [ ] 1.9 在 App.tsx 的 createModule switch 加 `case 'shadows'`；顶部 Tab 加"阴影"按钮；sidebar 在 activeModule='shadows' 时渲染 ShadowsPanel（~30 min）
- [ ] 1.10 Phase 1 验收：默认场景看到阴影；调 bias=0 看 acne；调 PCF=5 看软阴影；调分辨率看锯齿；左下角预览随分辨率变化（~30 min）

## 2. Phase 2 — 纹理 / UV 场景

目标：纹理过滤 + UV 可视化跑通，4 种过滤 + 3 种 wrapping + UV 网格叠加都可演示。

- [ ] 2.1 store 扩展：加 `TexturesState`（filterMode / anisotropy / wrapping / tiling / offset / checkerCells / showUvGrid），加 `textures` 字段，`activeModule` 类型加 `'textures'`（~30 min）
- [ ] 2.2 写 `src/scenes/textures/checkerTexture.ts`：程序化生成 CanvasTexture，参数 checkerCells 控制格子数；输出 256×256 PNG-friendly Canvas（~45 min）
- [ ] 2.3 `src/scenes/textures/TextureModule.ts` 骨架：大倾斜平面 + 用 checkerTexture 做 MeshStandardMaterial 的 map；OrbitControls（~60 min）
- [ ] 2.4 接 store：filterMode → texture.minFilter / magFilter（Nearest / Linear / LinearMipmapLinear 等）；anisotropy → texture.anisotropy（用 `renderer.capabilities.getMaxAnisotropy()` 上限保护）（~60 min）
- [ ] 2.5 wrapping → texture.wrapS / wrapT（RepeatWrapping / MirroredRepeatWrapping / ClampToEdgeWrapping）；tiling → texture.repeat.set(tiling, tiling)；offset → texture.offset.set(x, y)（~30 min）
- [ ] 2.6 写 UV 网格叠加：在 plane 下加 LineSegments 子物体，顶点对应 UV 步长 0.125；color 半透明白色；tiling 变化时通过 scale 同步（~75 min）
- [ ] 2.7 用 cornerPreview utility（Phase 1.6 复用）在左下角画 2D checker 纹理 + UV 网格（需要传入 overlayLines 参数）（~45 min）
- [ ] 2.8 写 `src/ui/TexturesPanel.tsx`：filterMode 按钮组、anisotropy 滑杆（带 max 显示）、wrapping 按钮组、tiling/offset 滑杆、checker cells 滑杆、showUvGrid 开关（~75 min）
- [ ] 2.9 在 App.tsx 的 createModule 加 `case 'textures'`；顶部 Tab 加"纹理"按钮；sidebar 在 activeModule='textures' 时渲染 TexturesPanel（~20 min）
- [ ] 2.10 Phase 2 验收：默认场景看 checker；切 Nearest 看锯齿；切 Mipmap 看远处平滑；anisotropy=16 看清晰度提升；切 Mirror 看 tile 翻转；tiling=4 看重复；开 UV 网格看叠加（~30 min）

## 3. Phase 3 — 教学引导与打磨

目标：两个新场景的 tour / hint 接入，UI 顶部 4 个 Tab 收紧，README 更新。

- [ ] 3.1 写 `src/tours/shadowTours.ts`：4 个预设——shadow map 是什么（切角落预览讲解）、acne 与 bias（bias 0→合适值对比）、硬阴影 vs 软阴影（PCF 切换）、分辨率与锯齿（256→2048）（~90 min）
- [ ] 3.2 写 `src/tours/textureTours.ts`：4 个预设——UV 是什么（开 UV 网格 + 角落预览）、Nearest vs Linear vs Mipmap（远处对比）、Anisotropic 提升（斜视角切 1→16）、Wrapping 对比（Repeat/Mirror/Clamp）（~90 min）
- [ ] 3.3 在 `src/tours/registry.ts` 注册两组新 tour；验证 HelpModal 自动列出（~10 min）
- [ ] 3.4 在 `src/hints/definitions.ts` 加 4-6 个新 hint：阴影模块（bias=0 出现 acne、PCF 切到 5、分辨率切到 256、pitch < 20°）；纹理模块（Nearest 模式、Mipmap 模式、anisotropy=16、tiling 调到 ≥4）（~60 min）
- [ ] 3.5 在 `src/ui/helpContent.ts` 加两个新模块的 concept + operations 文案（~45 min）
- [ ] 3.6 顶部 Tab 文字缩短："PBR / 光学 / 阴影 / 纹理"；加 `flex-wrap` 防溢出（~20 min）
- [ ] 3.7 顶部 header 在窄屏（< 1100px）下测试 4 个 Tab 仍可点（~30 min）
- [ ] 3.8 README 加阴影 + 纹理两个模块的章节（教学要点、参数说明）（~45 min）
- [ ] 3.9 最终回归：4 个模块来回切换 10 次无内存泄漏；2 个新 tour + 旧 7 个 tour 都跑通；5 + 新增 hint 都能触发（~45 min）

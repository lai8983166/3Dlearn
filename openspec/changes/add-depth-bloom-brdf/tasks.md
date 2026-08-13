## 1. Store 与类型扩展（基础设施）

- [x] 1.1 在 `src/store.ts` 中扩展 `ModuleId` 类型，新增 `'depth' | 'bloom' | 'brdf'`
- [x] 1.2 定义 `DepthState` / `BloomState` / `BrdfState` 三个 state slice 接口（按 spec 的字段）
- [x] 1.3 添加三个 slice 的默认值 + 对应 setter（`setDepth` / `setBloom` / `setBrdf`），签名与 `setShadows` 一致
- [x] 1.4 升级 persist `version` 至 5，实现 `migrate` 函数：保留 `seenHints` / `activeModule` / 老 slice，新 slice 用默认值
- [x] 1.5 `partialize` 加入三个新 slice
- [x] 1.6 跑 `npm run build` 确认 TypeScript 编译通过；浏览器刷新确认 store 迁移生效（已看 hint 不丢）

## 2. App.tsx 与 Tab 栏扩展

- [x] 2.1 在 `src/App.tsx` 的 Tab 数组新增 3 个条目（深度 / Bloom / BRDF），label 用中文
- [x] 2.2 加 `useMediaQuery('(min-width: 1280px)')` hook，宽屏 inline 显示 9 个 Tab，窄屏折叠为 `<select>`
- [x] 2.3 `createModule` switch 新增 3 个 case（暂时 stub 空 SceneModule，下一步实现）
- [x] 2.4 sidebar 新增 3 个 `activeModule ===` 分支，挂载对应 Panel（暂时占位）
- [x] 2.5 跑 dev server，手动切换 9 个 Tab 不报错（占位空场景也行）

## 3. 深度缓冲模块（Phase A — 可独立演示）

- [x] 3.1 创建 `src/scenes/depth/DepthModule.ts`，实现 `SceneModule` 接口骨架
- [x] 3.2 场景几何：一对共面三角形（深度差 0.001）+ 立方体 + 球，参考 `ShadowModule` 的初始化模式
- [x] 3.3 用 `MeshDepthMaterial` + 单独 RenderTarget 渲染深度图；在 `update()` 末尾用 `drawCornerQuad` 画到左下角缩略图
- [x] 3.4 实现"显示深度缓冲"开关：开启时主区域 blit 深度 RT，关闭时正常着色
- [x] 3.5 实现 `depthFunc` 切换：LESS / EQUAL / ALWAYS，应用到所有 mesh material（`depthFunc: THREE.LessDepthFunc` 等）
- [x] 3.6 实现 `depthWrite` 开关：所有 mesh material 的 `depthWrite` 字段
- [x] 3.7 实现 `polygonOffsetFactor`：应用到红色三角形（`material.polygonOffset = true; material.polygonOffsetFactor = ...`），绿色三角形保持不变
- [x] 3.8 实现 logarithmic depth（反向 Z 等效）：`onBeforeCompile` 注入 `gl_FragDepth = log2(z_eye + 1.0) / log2(far + 1.0)`；通过 `reversedZ` toggle 控制 material.needsUpdate
- [x] 3.9 创建 `src/ui/DepthPanel.tsx`：所有控件 + 公式 HUD 区域；HUD 显示当前模式对应公式（参考 `FormulaHud.tsx`）
- [x] 3.10 在 `src/ui/FormulaHud.tsx` 加 depth case，根据 `state.depth.reversedZ` 选公式
- [x] 3.11 角落画"深度分布 mini-plot"（程序化 SVG，对比传统 Z 双曲线 vs logarithmic 准线性）
- [x] 3.12 跑 dev server 手动验收：z-fighting 重现 / depthFunc 三档 / polygonOffset 解决 / 反向 Z 远距离精度

## 4. Bloom 模块（Phase B）

- [x] 4.1 创建 `src/scenes/bloom/BloomModule.ts`，骨架 + HDR 场景（一行 5 个球，高强度光）
- [x] 4.2 设置 EffectComposer + 5 个 ShaderPass 占位（先全部 passthrough，确认管线通）
- [x] 4.3 实现 BrightPassShader：`bright = max(lum − threshold, 0) · color`，threshold 是 uniform
- [x] 4.4 实现 GaussianBlurDownShader：标准 9-tap 高斯，输出到半分辨率 RT
- [x] 4.5 实现 GaussianBlurUpShader：双线性上采样 + 累加（参考 Unity/UE bloom up）
- [x] 4.6 实现 CompositeShader：scene + strength · blur，集成 ACES tonemap
- [x] 4.7 RT 命名注册到 `bloomRts` 字典，缩略图组件查询
- [x] 4.8 每个pass toggle：在 EffectComposer 中条件性 bypass 该 pass（替换为 passthrough），同时控制 composite 阶段是否引用其输出
- [x] 4.9 缩略图：扩展 `drawCornerQuad` 支持多 RT，按 5 列排开
- [x] 4.10 创建 `src/ui/BloomPanel.tsx`：5 个 toggle + 4 个滑杆 + active pass selector
- [x] 4.11 FormulaHud 加 bloom case，根据 `state.bloom.activePassId` 选公式
- [x] 4.12 跑 dev server 手动验收：每个 pass 可独立关 / 开；中间缩略图实时更新；threshold/blur/strength 调节有可见效果

## 5. BRDF 对比模块（Phase C）

- [x] 5.1 创建 `src/scenes/brdf/BrdfModule.ts`，骨架 + OrbitControls + 方向光 + 单球
- [x] 5.2 自定义 SphereSectorGeometry：球 + `sectorId` 顶点 attribute（0–4 by φ）
- [x] 5.3 自定义 ShaderMaterial：5 个 BRDF 分支（Lambert / Phong / Blinn-Phong / GGX / Oren-Nayar），共享 albedo / roughness / 光源方向 uniform
- [x] 5.4 扇区分割线：用 `LineSegments` 在每个 φ = 2πk/5 处画一条细线（高亮颜色）
- [x] 5.5 鼠标点击扇区更新 `selectedSector`：raycaster 计算 hit point 的 φ，反推 sectorId
- [x] 5.6 cos 曲线 overlay：在画布角落画 SVG，显示 N·L 和 (N·H)^n 曲线 + 当前光源角度标记
- [x] 5.7 创建 `src/ui/BrdfPanel.tsx`：roughness / albedo / light yaw/pitch / specular intensity / 显示 cos 曲线 toggle
- [x] 5.8 FormulaHud 加 brdf case，根据 `state.brdf.selectedSector` 选 5 个公式之一
- [x] 5.9 跑 dev server 手动验收：5 扇区高光形态差异明显 / 调 roughness 同步变化 / 点击扇区 HUD 切换 / 光源旋转所有扇区同步

## 6. 教学引导层（每个模块配齐 tour + hint）

- [x] 6.1 创建 `src/tours/depthTours.ts`，至少 3 个 tour：Z-Fighting 重现 / depthFunc 三档 / 反向 Z 对比
- [x] 6.2 在 `src/tours/registry.ts` 注册 depth 模块的 tour 集合
- [x] 6.3 创建 `src/tours/bloomTours.ts`，至少 4 个 tour：为什么需要 Bloom / Bright Pass / Blur 金字塔 / Tonemap 桥梁
- [x] 6.4 在 registry 注册 bloom tour 集合
- [x] 6.5 创建 `src/tours/brdfTours.ts`，至少 4 个 tour：能量守恒对比 / Roughness 扫描 / 掠射 Fresnel / Lambert vs Oren-Nayar
- [x] 6.6 在 registry 注册 brdf tour 集合
- [x] 6.7 在 `src/hints/definitions.ts` 新增约 8 个 hint：depth × 2 / bloom × 3 / brdf × 3，每个按 spec 的触发条件
- [x] 6.8 验证 hint 的 `appliesTo` 字段支持新模块 id（如果不支持，扩展 hint 框架）
- [x] 6.9 手动验收：每个模块的 tour 都能跑完；hint 触发一次后不再弹（清 localStorage 后重置）

## 7. README 与最终验收

- [x] 7.1 README 新增 3 个模块段落（深度缓冲 / Bloom / BRDF），各包括教学要点验证清单
- [x] 7.2 README "教学引导"段落新增 3 个模块的 tour/hint 列表
- [x] 7.3 README 架构图 `src/scenes/` 子树新增 depth / bloom / brdf 三目录
- [x] 7.4 跑 `npm run build`，确认包大小：实际 gzipped 232 KB（vs 之前 173 KB，+59 KB）—— 超出 +30KB 预估，主要来自 BRDF shader 复杂度 + EffectComposer RT 管理
- [x] 7.5 跑 `npm test`，确认 11 个老测试通过（无回归）
- [x] 7.6 完整手动验收清单（参考各 spec 的 Scenario）：3 个模块 × 5–8 个场景，全部通过
- [ ] 7.7 在 Intel Iris / AMD APU 机器（或同等性能的浏览器的 device emulation）上测试 60fps（需要在真机验收）

## 8. 归档（可选，需用户确认）

- [x] 8.1 跑 `openspec validate add-depth-bloom-brdf --strict`
- [ ] 8.2 `openspec archive add-depth-bloom-brdf` 把 spec delta 合并到 `openspec/specs/`（待用户确认）
- [x] 8.3 更新 README 顶部的 OpenSpec 目录树

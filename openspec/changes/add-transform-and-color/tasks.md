## 1. Phase 1 — 几何变换场景

目标：字母 F + T/R/S 滑杆 + 矩阵表格 + 顺序切换全部可用。

- [ ] 1.1 store 扩展：加 `TransformsState`（translate[3] / rotate[3] / scale[3] / order），ModuleId 加 `'transforms'`，persist bump 到 4（~30 min）
- [ ] 1.2 `src/scenes/transforms/fGeometry.ts`：合并三个 BoxGeometry 成字母 F，加 BufferGeometry 颜色属性（单色），返回 BufferGeometry（~45 min）
- [ ] 1.3 `src/scenes/transforms/TransformModule.ts`：场景骨架——两个 F mesh（半透明原始 + 不透明变换后）+ 三点光照 + OrbitControls（~90 min）
- [ ] 1.4 实现 order → matrix 转换：根据 order（TRS/TSR/RTS/RST/STR/SRT）依次 multiply，关闭 mesh.matrixAutoUpdate，直接 set matrix（~60 min）
- [ ] 1.5 订阅 store 变化，重新计算并应用 matrix（~30 min）
- [ ] 1.6 写 `src/ui/MatrixView.tsx`：4×4 表格组件，16 个单元格 + 高亮当前变化项（CSS transition）（~60 min）
- [ ] 1.7 写 `src/ui/TransformsPanel.tsx`：3 组滑杆（T/R/S）+ 顺序按钮组 + 重置按钮 + MatrixView（~90 min）
- [ ] 1.8 App.tsx createModule 加 `case 'transforms'`，sidebar 条件渲染（~20 min）
- [ ] 1.9 Phase 1 验收：拖 T/R/S 看右侧 F 动；切换顺序看姿态变化；矩阵表格随滑杆更新（~30 min）

## 2. Phase 2 — 色彩管线场景

目标：6 个球 + tone mapping 切换 + exposure + gamma + clip 可视化。

- [ ] 2.1 store 扩展：加 `ColorsState`（toneMapping / exposure / gammaCorrect / showClipping），ModuleId 加 `'colors'`（~30 min）
- [ ] 2.2 `src/scenes/colors/ColorModule.ts`：6 个球（albedo 0.05/0.1/0.2/0.4/0.7/1.0）+ 高强度 key light（强度 3.0）+ OrbitControls（~75 min）
- [ ] 2.3 订阅 store：toneMapping → renderer.toneMapping；exposure → renderer.toneMappingExposure；gammaCorrect → renderer.outputColorSpace（~45 min）
- [ ] 2.4 实现 clip 可视化 onBeforeCompile：在 fragment 末段检查 `gl_FragColor >= 1.0` 时覆盖为洋红色，用 uniform 控制（~60 min）
- [ ] 2.5 写 `src/ui/ColorsPanel.tsx`：tonemap 三档按钮、exposure 滑杆、gamma 开关、clip 可视化开关、pipeline 摘要（~75 min）
- [ ] 2.6 App.tsx createModule 加 `case 'colors'`，sidebar 条件渲染（~20 min）
- [ ] 2.7 Phase 2 验收：tonemap=None + exposure=+1 + 开 clip 看洋红色高光；切 ACES 看洋红色消失；关 gamma 看场景变暗（~30 min）

## 3. Phase 3 — 教学引导与回归

目标：两个新场景的 tour / hint 接入，README 更新，回归验收。

- [ ] 3.1 写 `src/tours/transformTours.ts`：4 个预设——平移（T 滑动看 m41）、旋转（R 看矩阵 sin/cos）、缩放（S 看对角线）、顺序不可交换（TRS vs RTS 在 T+R 时姿态不同）（~90 min）
- [ ] 3.2 写 `src/tours/colorTours.ts`：4 个预设——为什么需要 tonemap（None 看烧死）、ACES vs Reinhard、Exposure 调节、Linear vs sRGB（关 gamma 看错误效果）（~90 min）
- [ ] 3.3 在 `src/tours/registry.ts` 注册两组新 tour（~10 min）
- [ ] 3.4 在 `src/hints/definitions.ts` 加 4-6 个新 hint：变换模块（Rotate Y 接近 90°、首次切顺序、首次 Scale 负数）；色彩模块（首次 tonemap=None、首次 exposure>+1、首次关 gamma）（~60 min）
- [ ] 3.5 在 `src/ui/helpContent.ts` 加两个新模块的 concept + operations 文案（~45 min）
- [ ] 3.6 顶部 Tab 文字缩短并加 6 个按钮，验证 1024px 屏宽布局（~30 min）
- [ ] 3.7 README 加变换 + 色彩两个模块的章节（~45 min）
- [ ] 3.8 最终回归：6 个模块来回切换 10 次无内存泄漏；所有 tour 跑通；hint 触发正常（~45 min）

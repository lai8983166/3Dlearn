## MODIFIED Requirements

### Requirement: 模块路由

应用 MUST 提供顶部导航，可在以下 9 个模块之间切换：PBR、光学、阴影、纹理、变换、色彩、深度缓冲、Bloom、BRDF 对比。切换时 MUST NOT 刷新页面，且 MUST 释放前一个模块的 GPU 资源（几何体、材质、纹理、render target）。

#### Scenario: 切换模块释放资源
- **WHEN** 用户从任意模块切换到另一模块
- **THEN** 前一模块持有的 `Mesh`、`Material`、`Texture`、`WebGLRenderTarget` 对象调用 `.dispose()`，渲染循环不再绘制前一场景
- **AND** GPU 内存占用（通过 `renderer.info.memory`）相比驻留前一模块时下降

#### Scenario: 模块状态保留
- **WHEN** 用户在 Bloom 模块调整 threshold = 0.8 后切换到 BRDF 模块，再切回 Bloom 模块
- **THEN** threshold 滑杆仍是 0.8，Bloom 效果未重置

#### Scenario: 新增 3 个 Tab
- **WHEN** 用户查看顶部 Tab 栏
- **THEN** 看到 9 个 Tab：PBR / 光学 / 阴影 / 纹理 / 变换 / 色彩 / 深度 / Bloom / BRDF
- **AND** Tab 栏在 1280px 以上宽度一行展开，更窄时折叠为下拉

### Requirement: Store schema 扩展

`useAppStore` MUST 新增三个 state slice：
- `depth`: 深度模块的状态（depthFunc / depthWrite / polygonOffsetFactor / showDepthBuffer / reversedZ 等）
- `bloom`: Bloom 模块的状态（layers 5 个 toggle / threshold / softKnee / blurRadius / compositeStrength 等）
- `brdf`: BRDF 模块的状态（roughness / albedo / lightYaw / lightPitch / specularIntensity / showCosCurve 等）

每个 slice MUST 配套一个 setter（如 `setDepth` / `setBloom` / `setBrdf`），与现有 `setShadows` / `setTextures` 等签名一致。`ModuleId` 类型 MUST 扩展为 `'pbr' | 'optics' | 'shadows' | 'textures' | 'transforms' | 'colors' | 'depth' | 'bloom' | 'brdf'`。

localStorage store 版本 MUST 从 v4 升级到 v5，旧版本数据 MUST 在加载时通过 Zustand persist 的 `migrate` 函数迁移（保留用户已见的提示与已选模块，丢弃不存在的字段）。

#### Scenario: 类型扩展
- **WHEN** TypeScript 编译器检查 `ModuleId` 类型
- **THEN** 9 个字符串字面量都被接受，其他值类型错误
- **AND** `useAppStore.getState().depth` 返回 `DepthState`，具有强类型字段

#### Scenario: 持久化迁移
- **WHEN** 用户在 store v4 时保存了状态（如 seenHints 包含 'depth-func-always'），刷新后应用升级到 v5
- **THEN** seenHints 数组保留
- **AND** activeModule 如果是新增的 3 个之一则保留，否则设为默认 'pbr'
- **AND** 三个新 slice 使用各自默认值（旧版本数据中不存在这些字段）

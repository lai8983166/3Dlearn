## ADDED Requirements

### Requirement: 应用启动与渲染器初始化

应用 MUST 在浏览器加载完成后挂载一个全屏 Three.js WebGLRenderer（抗锯齿、ACES Filmic tone mapping、sRGB 输出），并 MUST 在窗口尺寸变化时自动调整渲染目标尺寸和相机纵横比。

#### Scenario: 首次加载
- **WHEN** 用户首次打开应用根路径 `/`
- **THEN** 在 1 秒内看到一个全屏 Three.js canvas，背景为默认 HDRI 环境（或纯色回退）
- **AND** canvas 尺寸严格跟随浏览器窗口 resize，无拉伸或黑边
- **AND** 浏览器控制台无 WebGL 上下文创建错误

#### Scenario: WebGL 不可用
- **WHEN** 浏览器不支持 WebGL2 或上下文创建失败
- **THEN** UI 显示醒目的错误提示"您的浏览器不支持 WebGL，请使用现代浏览器"，并不再尝试初始化 Three.js

### Requirement: 模块路由

应用 MUST 提供顶部导航，可在 "PBR Shader 拆解器" 与 "几何光学沙盒" 两个模块之间切换。切换时 MUST NOT 刷新页面，且 MUST 释放前一个模块的 GPU 资源（几何体、材质、纹理）。

#### Scenario: 切换模块释放资源
- **WHEN** 用户从 PBR 模块切换到光学模块
- **THEN** PBR 模块持有的 `Mesh`、`Material`、`Texture` 对象调用 `.dispose()`，渲染循环不再绘制 PBR 场景
- **AND** GPU 内存占用（通过 `renderer.info.memory`）相比驻留 PBR 模块时下降

#### Scenario: 模块状态保留
- **WHEN** 用户在 PBR 模块调整 Roughness = 0.7 后切换到光学模块，再切回 PBR 模块
- **THEN** Roughness 滑杆仍是 0.7，球体材质未重置

### Requirement: 相机轨道控制

两个模块的 3D 视图 MUST 支持鼠标左键拖拽旋转、右键平移、滚轮缩放，使用 OrbitControls 实现。

#### Scenario: 旋转视角
- **WHEN** 用户按住鼠标左键并拖动
- **THEN** 相机围绕场景中心轨道旋转，球体/透镜保持在视野中心

#### Scenario: 重置视角
- **WHEN** 用户点击右上角"重置视角"按钮
- **THEN** 相机回到默认位置（PBR 模块：球体正前方；光学模块：俯视光路侧视图）

### Requirement: 共享 UI 外壳

应用 MUST 提供统一的左侧边栏布局：顶部为模块切换 Tab，下方为当前模块的参数控制区（滑杆、开关、下拉），主区域为 3D 视图。最小屏幕宽度 1024px，更小尺寸 MUST 显示"请使用更大屏幕"提示。

#### Scenario: 窄屏提示
- **WHEN** 浏览器窗口宽度 < 1024px
- **THEN** 主 UI 隐藏，显示"请使用宽度 ≥ 1024px 的设备"
- **AND** 提供按钮"仍要继续"，点击后强制进入（用户体验可能受损）

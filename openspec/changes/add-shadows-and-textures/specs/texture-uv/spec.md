## ADDED Requirements

### Requirement: 纹理基础场景

纹理模块 MUST 渲染一个倾斜的大平面，平面材质使用程序化生成的 checkerboard 纹理（不下载外部资源）。相机 MUST 能从不同角度观察平面，包括斜视角（看远处）。

#### Scenario: 默认场景
- **WHEN** 用户首次进入纹理模块
- **THEN** 看到一个倾斜的大平面，上面有清晰的黑白 checker pattern
- **AND** 平面距离相机足够远，能调出斜视角看到远处

### Requirement: 过滤模式切换

侧栏 MUST 提供过滤模式切换：Nearest / Linear / Mipmap Nearest / Mipmap Linear。切换后纹理清晰度与抗锯齿表现明显不同。

#### Scenario: Nearest 像素风
- **WHEN** 过滤 = Nearest，相机靠近平面近处
- **THEN** checker 边缘出现明显像素化锯齿

#### Scenario: Mipmap 远处不闪
- **WHEN** 过滤 = Mipmap Linear，相机斜视角看平面远处
- **THEN** 远处 checker 平滑过渡，无 moiré 闪烁
- **AND** 与 Nearest 模式形成对比（Nearest 远处会出现 moiré 锯齿）

### Requirement: Anisotropic 过滤

侧栏 MUST 提供 anisotropy 级别滑杆或档位（1 / 4 / 8 / 16）。开启后斜视角下远处纹理清晰度明显提升。

#### Scenario: Anisotropic 提升
- **WHEN** 相机低角度看平面（pitch < 30°），anisotropy 从 1 调到 16
- **THEN** 远处 checker 比调整前明显更清晰、更"锐利"

### Requirement: Wrapping 模式

侧栏 MUST 提供 wrapping 模式切换：Repeat / Mirror / Clamp。tiling > 1 时三种模式表现不同。

#### Scenario: Repeat 重复
- **WHEN** wrapping = Repeat, UV tiling = 3
- **THEN** checker 在平面上重复 3×3 次，所有 tile 朝向一致

#### Scenario: Mirror 镜像
- **WHEN** wrapping = Mirror, UV tiling = 3
- **THEN** checker 在平面上重复 3×3 次，但相邻 tile 镜像翻转

#### Scenario: Clamp 边缘
- **WHEN** wrapping = Clamp, UV tiling > 1
- **THEN** 边缘的 checker 单元被拉伸到 UV 边界（不像 Repeat 那样整块重复）

### Requirement: UV Tiling 与 Offset

侧栏 MUST 提供 UV tiling 滑杆（1–8，每方向）和 UV offset 滑杆（0–1）。

#### Scenario: Tiling 调节
- **WHEN** tiling 从 1 调到 4
- **THEN** 平面上 checker 单元数量变成原来的 16 倍（4×4 倍）

#### Scenario: Offset 滑动
- **WHEN** offset 从 0 缓慢调到 1
- **THEN** checker pattern 在平面上整体平移一个完整周期

### Requirement: UV 网格叠加

侧栏 MUST 提供"显示 UV 网格"开关。开启后 MUST 在 3D 平面表面叠加显示 UV 坐标网格线（每 0.125 UV 单位一条线，亮色半透明）。

#### Scenario: UV 网格可见
- **WHEN** 开关打开
- **THEN** 平面表面出现网格线（u=0, 0.125, 0.25... 和 v=0, 0.125, 0.25...）
- **AND** 网格线视觉清晰可辨
- **AND** 调节 tiling 时网格密度同步变化（tiling=2 → 网格数翻倍）

### Requirement: 2D 纹理 + UV 网格角落预览

画布的右下角 MUST 显示当前 checker 纹理 + UV 坐标网格的 2D 预览。预览尺寸约 160×160 像素，让用户看到 3D 表面与 2D 纹理空间的对应关系。

#### Scenario: 2D 预览存在
- **WHEN** 纹理模块激活
- **THEN** 画布右下角显示 2D checker 纹理 + UV 网格
- **AND** 调节 tiling 时角落预览的 UV 网格密度同步变化

### Requirement: Checker 单元尺寸调节

侧栏 MUST 提供 checker 单元数量调节（生成纹理时控制格子数，例如 2 / 4 / 8 / 16 个 checker）。这是程序化生成纹理本身的格子数，与 UV tiling 独立。

#### Scenario: Checker 密度
- **WHEN** checker 单元数从 8 调到 16
- **THEN** 单个 checker 纹理本身格子数翻倍
- **AND** 在 tiling=1 时，平面上 checker 数量也翻倍

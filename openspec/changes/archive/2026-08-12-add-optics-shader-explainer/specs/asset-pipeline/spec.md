## ADDED Requirements

### Requirement: HDRI 按需下载与体积预警

PBR 模块的 Env Reflection 需要的环境贴图 MUST 按需从 polyhaven.com（或镜像）下载 `.hdr` 文件，首次切换 HDRI 时 MUST 先弹出确认对话框显示文件大小，用户确认后才开始下载。

#### Scenario: 首次进入 PBR 模块
- **WHEN** 用户首次进入 PBR 模块，应用需要一个默认 HDRI
- **THEN** 应用使用 Three.js 内置的 `RoomEnvironment`（程序化生成，零下载）作为回退，不强制下载
- **AND** UI 显示按钮"切换 HDRI 环境"，并提示"使用 polyhaven HDRI 需下载 5–20MB 文件"

#### Scenario: 用户选择下载 HDRI
- **WHEN** 用户点击"切换 HDRI"并选择 "studio_small_08" (12MB)
- **THEN** 弹出确认对话框 "即将下载 12MB 的 HDR 文件，是否继续？"
- **AND** 用户确认后显示进度条，下载完成后用 `RGBELoader` 解析并通过 `PMREMGenerator` 预滤波

### Requirement: HDRI 缓存

已下载的 HDRI MUST 缓存到 IndexedDB（key = 文件名），二次切换同一 HDRI 时 MUST NOT 重新下载。

#### Scenario: 二次切换不重新下载
- **WHEN** 用户从 HDRI-A 切换到 HDRI-B 再切回 HDRI-A
- **THEN** 切回 HDRI-A 不产生网络请求，从 IndexedDB 读取并立即应用

### Requirement: 下载失败可重试

网络中断或服务器不可达时，下载失败 MUST 明确提示，并 MUST 提供"重试"按钮。

#### Scenario: 下载中断
- **WHEN** HDRI 下载到 60% 时网络断开
- **THEN** UI 显示"下载失败：网络错误"，提供"重试"和"取消"按钮
- **AND** 不破坏当前场景（保留之前的程序化 RoomEnvironment 或上一个 HDRI）

### Requirement: 法线贴图资源

PBR 模块的预设法线贴图 MUST 打包在应用 bundle 中（不在线下载），每张法线贴图压缩后 MUST < 200KB。

#### Scenario: 切换法线贴图无网络请求
- **WHEN** 用户在"光滑 / 砖墙 / hammered metal"三种法线贴图间切换
- **THEN** 切换立即生效，无任何网络请求（资源已本地打包）

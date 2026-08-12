## ADDED Requirements

### Requirement: 阴影场景基础渲染

阴影模块 MUST 渲染一个地面平面 + 至少 2 个投射阴影的物体（立方体 + 球）+ 一个投射方向阴影的 DirectionalLight。阴影 MUST 实际可见（落在地面上），不是"光照"模拟。

#### Scenario: 默认场景
- **WHEN** 用户首次进入阴影模块
- **THEN** 看到 1 个地面、1 个立方体、1 个球
- **AND** 立方体和球在光照下投射出明确的阴影到地面
- **AND** 阴影朝向单一方向（方向光的照射方向）

#### Scenario: 相机轨道
- **WHEN** 用户拖动鼠标旋转视角
- **THEN** 相机围绕场景中心轨道旋转，阴影的 3D 几何关系（投影、遮挡）从不同角度可观察

### Requirement: Shadow Map 分辨率可调

侧栏 MUST 提供 shadow map 分辨率切换：256 / 512 / 1024 / 2048。切换后 MUST 立即重建 shadow map，阴影锯齿程度明显变化。

#### Scenario: 低分辨率锯齿
- **WHEN** 分辨率 = 256
- **THEN** 阴影边缘出现明显锯齿（pixelation）
- **AND** 角落 shadow map 预览显示 256×256 的低分辨率深度图

#### Scenario: 高分辨率平滑
- **WHEN** 分辨率 = 2048
- **THEN** 阴影边缘明显比 256 平滑
- **AND** 角落预览显示 2048×2048 深度图（更精细）

### Requirement: Bias 调节演示 acne 与 peter panning

侧栏 MUST 提供 depth bias 滑杆（0 – 0.01，步进 0.0001）。bias = 0 时 MUST 出现明显 shadow acne（物体表面条纹状自阴影）；合适值时 acne 消失；过大时阴影脱离物体底部（peter panning）。

#### Scenario: Shadow acne
- **WHEN** bias = 0
- **THEN** 立方体和球的亮面出现条纹状自阴影（典型 acne 表现）
- **AND** HUD 提示"这是 shadow acne——bias 太小"

#### Scenario: Acne 消失
- **WHEN** bias 缓慢调到 0.001 – 0.003（具体值取决于场景）
- **THEN** 物体表面 acne 消失
- **AND** 阴影仍正常连接物体底部

#### Scenario: Peter panning
- **WHEN** bias 调到 0.008 或更大
- **THEN** 物体与阴影接触处出现明显缝隙
- **AND** 物体看起来"浮"在阴影上方

### Requirement: PCF 软阴影

侧栏 MUST 提供 PCF 模式切换：None（硬阴影）/ 1×1 / 3×3 / 5×5。切换后阴影边缘柔和度立即变化。

#### Scenario: 硬阴影
- **WHEN** PCF = None
- **THEN** 阴影边缘清晰锐利，无柔和过渡

#### Scenario: 大半径软阴影
- **WHEN** PCF = 5×5
- **THEN** 阴影边缘明显柔和（多像素过渡）
- **AND** 阴影整体颜色可能略变浅（PCF 平均化）

### Requirement: Shadow Map 角落预览

画布的右下角 MUST 显示 shadow map 的实时深度纹理预览（从光源视角渲染的深度图）。预览尺寸约 160×120 像素。预览 MUST 在分辨率切换时同步更新，且 MUST 显示当前帧的 shadow map（不是缓存）。

#### Scenario: 角落预览存在
- **WHEN** 阴影模块激活
- **THEN** 画布右下角有一个深色小窗口
- **AND** 窗口内容是从光源视角看到的深度图（近处暗、远处亮）
- **AND** 物体在深度图中可见为深色形状

#### Scenario: 切换分辨率同步
- **WHEN** 用户切换 shadow map 分辨率
- **THEN** 角落预览的分辨率（清晰度）同步变化

### Requirement: 光源角度调节

侧栏 MUST 提供方向光的 yaw（水平 0–360°）和 pitch（俯仰 5–85°）滑杆。调节后阴影方向与长度变化。

#### Scenario: 低角度长阴影
- **WHEN** pitch = 15°
- **THEN** 阴影长度明显比 pitch = 60° 时长（数倍）
- **AND** 阴影锯齿更明显（perspective aliasing）

#### Scenario: yaw 旋转
- **WHEN** yaw 从 0° 缓慢调到 180°
- **THEN** 阴影方向跟随旋转，物体被照亮的一侧切换

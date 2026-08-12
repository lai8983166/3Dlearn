## ADDED Requirements

### Requirement: 多球 HDR 场景

场景 MUST 渲染一行 6 个球，每个球的 albedo 从 0.05 到 1.0 递增（0.05, 0.1, 0.2, 0.4, 0.7, 1.0）。光源 MUST 足够亮（强度 > 1.0）让最亮球面的像素值超过 1.0（进入 HDR 范围），让 tone mapping 有可见的效果。

#### Scenario: 默认场景
- **WHEN** 用户首次进入色彩模块
- **THEN** 看到一行 6 个球，从左到右颜色由深到浅
- **AND** 当前 tone mapping = ACES Filmic（行业标准默认）
- **AND** exposure = 0 stops（中性）

#### Scenario: 高光超过 1.0
- **WHEN** exposure 调到 +2 stops（光线增强 4 倍）
- **THEN** 最右侧（albedo=1.0）的球的高光区域像素值在内部超过 1.0
- **AND** 如果 tonemap = None，那些高光区域显示为纯白（被 clip）
- **AND** 如果 tonemap = ACES，那些高光区域被柔和压缩成 cream-colored 而不是纯白

### Requirement: Tone Mapping 类型切换

侧栏 MUST 提供 tone mapping 切换：None / Reinhard / ACES Filmic。切换后 MUST 立即应用，三档差异明显可见。

#### Scenario: None（无 tonemap）
- **WHEN** tonemap = None，exposure = +1
- **THEN** 最亮球面的高光区域显示为纯白硬切边（任何 > 1.0 的值被 clip 到 1.0）
- **AND** 高光到中间调的过渡有明显"烧死"感

#### Scenario: Reinhard
- **WHEN** tonemap = Reinhard，exposure = +1
- **THEN** 高光区域被柔和压缩（公式 `x / (x + 1)`），不再纯白
- **AND** 中间调比 None 略暗

#### Scenario: ACES Filmic
- **WHEN** tonemap = ACES Filmic，exposure = +1
- **THEN** 高光被电影级压缩（高光保留细节、暗部对比强）
- **AND** 整体颜色偏暖（轻微 desaturate 高光）

### Requirement: Exposure 调节

侧栏 MUST 提供 exposure 滑杆（-2 到 +2 stops，步进 0.1）。调节后场景亮度变化且 HDR 范围内像素值改变。

#### Scenario: 高 exposure 看 HDR
- **WHEN** exposure 从 0 调到 +2
- **THEN** 球面整体变亮
- **AND** albedo=1.0 球的高光进入 HDR 范围（如果 tonemap=None 可以看到 clip）

#### Scenario: 低 exposure 看暗部
- **WHEN** exposure 从 0 调到 -2
- **THEN** 球面整体变暗
- **AND** albedo=0.05 球几乎不可见（低于显示器可分辨范围）

### Requirement: Gamma 校正开关

侧栏 MUST 提供一个"输出 gamma 校正"开关。开启时（默认）renderer 输出 sRGB；关闭时输出 Linear（视觉上偏暗、对比错误）。

#### Scenario: 关闭 gamma
- **WHEN** 用户关闭 gamma 校正
- **THEN** 整个场景视觉上变暗（中间调压缩）
- **AND** 颜色看起来"错误"——这是未校正的 Linear 直接显示的样子

#### Scenario: 重新开启
- **WHEN** 用户重新开启 gamma 校正
- **THEN** 场景恢复正常 sRGB 输出

### Requirement: 高光 clip 可视化

场景 MUST 提供一个"显示被 clip 的像素"开关。开启时，任何在 tonemap 后值 = 1.0（被 clip）的像素 MUST 用一个明显的颜色覆盖（如洋红色），让学习者直观看到"哪里烧死了"。

#### Scenario: clip 像素可视化
- **WHEN** 开启 clip 可视化，tonemap = None，exposure = +1
- **THEN** 最亮球面的高光区域显示为洋红色（或类似的明显颜色）
- **AND** 切换到 ACES 后，洋红色区域消失或大幅减少

### Requirement: 当前 Pipeline 说明

侧栏底部 MUST 显示当前的 pipeline 文字摘要，如：
- "Linear scene → ACES tonemap → sRGB output"
- "Linear scene → No tonemap → Linear output (WRONG)"
摘要 MUST 随 tonemap / gamma 切换实时更新。

#### Scenario: pipeline 摘要更新
- **WHEN** 用户切换 tonemap 从 None 到 ACES
- **THEN** 摘要文字从 "... → No tonemap → ..." 变为 "... → ACES tonemap → ..."

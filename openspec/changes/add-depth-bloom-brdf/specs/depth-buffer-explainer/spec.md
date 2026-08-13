## ADDED Requirements

### Requirement: 场景几何（共面三角形 + 立方体 + 球）

场景 MUST 包含一对几乎共面的三角形（属于同一平面，深度差 0.001 单位）、一个立方体、和一个球。三者 MUST 都开启 depth write 与 depth test，作为深度缓冲的标准对照。

#### Scenario: 默认场景
- **WHEN** 用户首次进入深度缓冲模块
- **THEN** 看到一对重叠的彩色三角形（一个红、一个绿，深度差极小）
- **AND** 一个立方体和一个球分别在三角形两侧
- **AND** 画布左下角显示深度缓冲的灰度可视化缩略图（白=近、黑=远）

#### Scenario: Z-Fighting 重现
- **WHEN** 三角形深度差 = 0.001 且相机距离适中（5 单位）
- **THEN** 两个三角形的重叠区域呈现条纹状闪烁（典型 z-fighting 现象）
- **AND** 闪烁随相机距离增加而加剧（远距离深度精度下降）

### Requirement: 深度缓冲可视化切换

侧栏 MUST 提供一个"显示深度缓冲"开关。开启时画布主区域 MUST 渲染深度缓冲（灰度图：白=近、黑=远），关闭时显示正常着色。

#### Scenario: 切换显示
- **WHEN** 用户开启"显示深度缓冲"
- **THEN** 整个画布从着色变为深度灰度图
- **AND** 近处物体（如三角形前缘）显示为白色
- **AND** 远处物体（如球的后半部分被前半遮挡）显示为深灰色
- **AND** 角落的深度缩略图保持显示（不论主显示是着色还是深度）

### Requirement: depthFunc 切换

侧栏 MUST 提供 `depthFunc` 下拉，包含 `LESS`（默认）、`EQUAL`、`ALWAYS` 三档。切换后 MUST 立即应用，并对所有 mesh 的材质生效。

#### Scenario: LESS（默认行为）
- **WHEN** depthFunc = LESS
- **THEN** 像素通过深度测试当且仅当其 depth < 已写入的 depth
- **AND** 前面的物体遮挡后面的物体（标准行为）

#### Scenario: ALWAYS（深度测试形同虚设）
- **WHEN** depthFunc = ALWAYS
- **THEN** 所有像素都通过深度测试
- **AND** 绘制顺序决定遮挡：最后画的 mesh 总在前面
- **AND** 立方体可能"穿过"球，球可能"穿过"三角形（视觉上完全错乱）

#### Scenario: EQUAL（用于模板/掠射场景）
- **WHEN** depthFunc = EQUAL
- **THEN** 只有 depth 与已写入值精确相等的像素通过
- **AND** 大多数 mesh 消失，只剩与某层精确共面的边缘

### Requirement: depthWrite 开关

侧栏 MUST 提供 `depthWrite` 开关。关闭后所有 mesh 不再写入深度缓冲，但深度测试照常（如果 depthFunc 允许）。

#### Scenario: 关闭 depthWrite
- **WHEN** depthWrite 关闭，depthFunc = LESS
- **THEN** 后画的 mesh 不知道前面画过什么
- **AND** 半透明感（虽然不是真的透明）：后面的物体可以画到前面的位置
- **AND** 深度可视化缩略图反映这种"被无视"的状态

### Requirement: Polygon Offset

侧栏 MUST 提供 `polygonOffsetFactor` 滑杆（−5 到 +5，步进 0.5）。该值 MUST 应用到两个共面三角形之一，另一个保持不变。学习者可借此解决 z-fighting（推一个三角形到 depth buffer 中"稍微往前"）。

#### Scenario: 用 polygon offset 解决 z-fighting
- **WHEN** 三角形深度差 = 0，polygonOffsetFactor = 0 → 严重 z-fighting
- **AND** 用户把 polygonOffsetFactor 拉到 +2
- **THEN** 带偏移的三角形稳定地位于前面（z-fighting 消失）
- **AND** 深度可视化中能看到两个三角形的深度值差距

### Requirement: 反向 Z 模式

侧栏 MUST 提供"反向 Z（Reversed-Z）"开关。开启时相机使用 `near = 0.01, far = 1000` + `perspectiveCamera` 的 projection 矩阵第 33/34 元素反向（标准反向 Z 技巧）；关闭时使用 `near = 0.1, far = 100` 传统 Z。HUD MUST 显示两种模式下的深度值分布曲线（透视 vs 准对数）。

#### Scenario: 远距离精度对比
- **WHEN** 反向 Z 关闭，相机远离三角形 50 单位
- **THEN** 远距离三角形的深度值集中在 0.99–1.0（精度严重不足），微小 z 差异被舍入
- **AND** 远距离的 z-fighting 闪烁比近距离明显得多

#### Scenario: 反向 Z 改善远距离精度
- **WHEN** 切换到反向 Z，相机远离三角形 50 单位
- **THEN** 远距离深度值更均匀分布在 [0, 1] 区间
- **AND** 远距离的 z-fighting 闪烁显著减少（视觉上几乎消失）

### Requirement: 深度公式 HUD

侧栏底部 HUD MUST 显示当前模式对应的深度映射公式：
- 传统 Z：`z_ndc = (f+n)/(f−n) − 2fn/(f−n) · 1/z_eye`（双曲线分布）
- 反向 Z：`z_ndc = ...`（反转后近对数分布）

公式 MUST 随模式切换实时更新。

#### Scenario: 公式随模式切换
- **WHEN** 用户切换反向 Z 开关
- **THEN** HUD 中的公式文本立即更换
- **AND** 画布角落的深度分布曲线 mini-plot 也实时切换

### Requirement: 演示场景与上下文提示

模块 MUST 通过现有 `src/tours/registry.ts` 注册至少 3 个 tour：
1. **Z-Fighting 重现** — 共面三角形 + 远距离相机，放大闪烁
2. **depthFunc 三档对比** — 串行演示 LESS → EQUAL → ALWAYS
3. **反向 Z vs 传统 Z** — 同相机位置下两种模式对比

模块 MUST 通过现有 `src/hints/` 系统注册至少 2 个上下文提示：
- `depth-func-always`: 当 depthFunc = ALWAYS 触发，提示"所有像素都通过，绘制顺序决定遮挡"
- `depth-write-off`: 当 depthWrite 关闭触发，提示"深度不写入，后画的不知道前面画过什么"

#### Scenario: tour 与 hint 注册
- **WHEN** 用户首次进入深度模块并打开演示场景下拉
- **THEN** 下拉中列出至少 3 个该模块的预设
- **AND** 用户触发 `depthFunc = ALWAYS` 时看到对应 hint toast（每个用户最多一次）

## ADDED Requirements

### Requirement: HDR 场景（高动态范围光源）

场景 MUST 渲染一行球（至少 5 个），其中至少一个球的高光区域像素值在内部超过 1.0（进入 HDR 范围）。Bloom 的所有 pass 都基于此 HDR 输入。

#### Scenario: 默认 HDR 场景
- **WHEN** 用户首次进入 Bloom 模块
- **THEN** 看到一行球，最亮的球（金属或高 albedo）的高光区域明显比 1.0 亮
- **AND** 当前 renderer toneMapping = None（让学习者直接看到 HDR 输入，不被 tonemap 拉回 LDR）
- **AND** 画布右下角显示当前激活 pass 的公式（如 `bright = max(lum − threshold, 0)`）

### Requirement: 5 个可独立 toggle 的 pass

侧栏 MUST 列出 5 个 pass，每个 pass 有独立 toggle（默认全开）。toggle 决定该 pass 是否**对最终结果做出贡献**——不是简单关掉显示，而是真的从管线中拿掉，让学习者看到缺失的影响：

1. **HDR Scene** — 渲染原始 3D 场景到 HDR render target
2. **Bright Pass** — 阈值化提取亮区（`bright = max(lum − threshold, 0)`）
3. **Blur Down** — 高斯模糊下采样金字塔（MIP 链）
4. **Blur Up** — 上采样叠加回原始分辨率
5. **Composite + Tonemap** — 把 blur 结果加回原始场景，最后做 ACES tonemap

#### Scenario: 关掉 Bright Pass
- **WHEN** 用户关闭 Bright Pass
- **THEN** blur 输入变成纯黑（没有亮区被提取）
- **AND** 最终 composite 看不到任何 bloom 效果
- **AND** 旁白条/HUD 提示"bright pass 是 bloom 的输入，关掉它就没有要模糊的东西"

#### Scenario: 关掉 Tonemap
- **WHEN** 用户关闭 Composite + Tonemap
- **THEN** 最终输出超过 1.0 的像素被 clip 到纯白
- **AND** 旁白条/HUD 提示"tonemap 是 HDR → LDR 的桥梁，没有它显示器无法表达 HDR"

### Requirement: 中间 pass 可视化

画布角落 MUST 显示当前激活的每个 pass 的输出缩略图，按管线顺序排列：
- HDR Scene（左）→ Bright Pass → Blur Down → Blur Up → Composite（右）

每个缩略图 MUST 实时更新（不是静态截图）。

#### Scenario: 缩略图实时更新
- **WHEN** 用户拖动光源强度滑杆
- **THEN** 所有 pass 的缩略图同步更新
- **AND** 用户能在 Bright Pass 缩略图中看到亮区随光源变化

### Requirement: Bloom 参数可调

侧栏 MUST 提供以下参数：
- **Threshold**（0.0 – 2.0）：bright pass 阈值
- **Soft Knee**（0.0 – 1.0）：阈值边缘的平滑过渡（knee）
- **Blur Radius**（0 – 10）：高斯模糊半径（实际控制下采样层数）
- **Composite Strength**（0.0 – 3.0）：blur 结果叠加到原图的强度

参数变化 MUST 实时反映到所有 pass 缩略图与最终结果。

#### Scenario: Threshold 调节
- **WHEN** threshold 从 1.0 调到 0.0
- **THEN** Bright Pass 缩略图中越来越多的像素超过阈值（变亮）
- **AND** 最终结果出现"过度发光"现象（暗部也被 bloom）

#### Scenario: Composite Strength 调节
- **WHEN** composite strength 从 1.0 调到 0.0
- **THEN** bloom 效果逐渐消失，最终只剩原始 HDR 场景（被 tonemap 后）
- **AND** 缩略图本身不变，只是 composite 阶段不叠加

### Requirement: 公式 HUD

侧栏底部 HUD MUST 显示当前**激活**（最后点击或最近 toggle 的）pass 的公式：
- HDR Scene: `color = shade(scene)`
- Bright Pass: `bright = max(lum − threshold, 0) · color`（带 soft knee 平滑）
- Blur Down: `down_n = gaussian(down_{n−1})` 下采样 2×
- Blur Up: `up_n = up_{n+1} + gaussian(down_n)` 上采样并累加
- Composite: `final = scene + strength · up_0`
- Tonemap: `final_ldr = ACES(final)`

公式 MUST 用 Unicode + 等宽字体（与现有 PBR HUD 风格一致），不引入 KaTeX。

#### Scenario: HUD 跟随激活 pass
- **WHEN** 用户点击"Blur Down" pass 的 toggle 标签
- **THEN** HUD 显示对应的高斯下采样公式
- **AND** 点击其他 pass 标签时切换公式

### Requirement: 演示场景与上下文提示

模块 MUST 通过 `src/tours/registry.ts` 注册至少 4 个 tour：
1. **为什么需要 Bloom** — 关闭 Bloom 整体，对比有/无的视觉差异
2. **Bright Pass 的作用** — 串行演示 threshold 1.5 → 0.5，看亮区提取范围
3. **Blur 金字塔** — 切换只开 Blur Down / 只开 Blur Up / 都开，看模糊形态
4. **Tonemap 桥梁** — 关掉 tonemap 看高光 clip

模块 MUST 通过 `src/hints/` 注册至少 3 个提示：
- `bloom-threshold-too-low`: threshold < 0.3 时触发，提示"阈值过低导致全图发光"
- `bloom-composite-zero`: composite strength = 0 时触发，提示"blur 不再叠加到原图"
- `bloom-no-tonemap`: tonemap pass 关闭时触发，提示"没有 tonemap，HDR 输出被显示器 clip"

#### Scenario: tour 与 hint 注册
- **WHEN** 用户首次进入 Bloom 模块并打开演示场景下拉
- **THEN** 下拉中列出至少 4 个预设
- **AND** 用户调 threshold 到 < 0.3 时看到对应提示（每个用户最多一次）

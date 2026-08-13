## ADDED Requirements

### Requirement: 5 扇区球体几何

场景 MUST 渲染一个球，沿**纵向**（极轴）切成 5 个相等的"橘子瓣"扇区，每个扇区使用不同的 BRDF 模型：
1. Lambert（纯漫反射）
2. Phong（高光不守恒）
3. Blinn-Phong（半向量版本）
4. GGX / Cook-Torrance（物理基）
5. Oren-Nayar（粗糙漫反射）

所有扇区 MUST 共享相同的 albedo、roughness 参数、光源方向、视角，**唯一差异是 BRDF 模型**。

#### Scenario: 默认场景
- **WHEN** 用户首次进入 BRDF 对比模块
- **THEN** 看到一个被切成 5 瓣的球，从某一角度看每瓣都明显可见
- **AND** 球的边缘有"分割线"标识每瓣的边界（细高亮线）
- **AND** 所有瓣共享同一组参数（roughness = 0.5 等）

#### Scenario: 同参数对比
- **WHEN** 用户调整 roughness 到 0.3
- **THEN** 5 个扇区同步改变高光形态
- **AND** Lambert 扇区不响应（因为 Lambert 无高光项）
- **AND** Oren-Nayar 扇区整体变暗（粗糙度提升使漫反射更"扁")

### Requirement: 自定义 ShaderMaterial 切分

扇区切分 MUST 通过顶点属性（attribute）`sectorId`（0–4）实现。片元着色器 MUST 根据 `sectorId` 选择对应的 BRDF 计算分支。所有 BRDF MUST 在同一个 ShaderMaterial 内实现，避免多 material 切换的开销。

#### Scenario: 扇区切换正确
- **WHEN** 相机围绕球旋转
- **THEN** 每个扇区始终使用其对应的 BRDF（不会因为视角变化而切换）
- **AND** 扇区边界处可见明确分割（即使有 1 像素的抗锯齿过渡）

### Requirement: 参数控制

侧栏 MUST 提供以下控制：
- **Roughness**（0.0 – 1.0）：所有 BRDF 共享（Lambert 忽略）
- **Albedo color**（颜色选择器）：所有扇区共享
- **Light Yaw**（0° – 360°）和 **Light Pitch**（−80° – +80°）：方向光源角度
- **Specular Intensity**（0.0 – 2.0）：Phong / Blinn-Phong / GGX 共享的高光强度倍率
- **Toggle: 显示 cos 曲线 overlay**：在画布角落画一个小图，显示 N·L 和 N·H 随角度的曲线

参数变化 MUST 实时反映到所有扇区。

#### Scenario: 光源旋转
- **WHEN** 用户拖动 Light Yaw 从 0° 到 90°
- **THEN** 5 个扇区的高光/漫反射同步移动到对应位置
- **AND** Lambert 扇区的明暗交界线移动
- **AND** GGX 扇区的高光斑从一侧移到另一侧

#### Scenario: cos 曲线 overlay
- **WHEN** 用户开启"显示 cos 曲线"
- **THEN** 画布角落出现一个小坐标系，x 轴是角度（0° – 90°），y 轴是 [0, 1]
- **AND** 图中画两条曲线：`N·L`（线性下降）和 `(N·H)^n`（在 0° 附近有尖峰）
- **AND** 当前光源角度在曲线上有红色标记点

### Requirement: BRDF 公式 HUD

侧栏底部 HUD MUST 显示当前**选中扇区**的 BRDF 公式：
- Lambert: `f_d = albedo / π`
- Phong: `f_s = k_s · (R·V)^n`
- Blinn-Phong: `f_s = k_s · (N·H)^n`，`H = normalize(L + V)`
- GGX: `f_s = D · F · V / (4 · |N·L| · |N·V|)`，`D = α² / (π · ((N·H)² · (α² − 1) + 1)²)`
- Oren-Nayar: `f_d = (A + B · s · t)`，`A = 1 − σ²/(2σ² + 0.33)`，依此类推

公式 MUST 用 Unicode + 等宽字体。点击不同扇区切换 HUD。

#### Scenario: HUD 跟随扇区选择
- **WHEN** 用户点击球的 GGX 扇区
- **THEN** HUD 显示 GGX 公式（D / F / V 三项展开）
- **AND** 切换到 Lambert 扇区时 HUD 切换为 `albedo / π`

### Requirement: 演示场景与上下文提示

模块 MUST 通过 `src/tours/registry.ts` 注册至少 4 个 tour：
1. **能量守恒对比** — 高光强度拉满，看 Phong"过曝"而 GGX 守恒
2. **Roughness 扫描** — 串行演示 roughness 0.1 → 0.5 → 0.9，对比 GGX 与 Oren-Nayar 的形态变化
3. **掠射角 Fresnel** — 光源到掠射，看 GGX 扇区在边缘的高光强化
4. **Lambert vs Oren-Nayar** — 把 roughness 拉到 1.0，看两种漫反射模型的暗部差异

模块 MUST 通过 `src/hints/` 注册至少 3 个提示：
- `brdf-phong-no-conservation`: specular intensity > 1.5 时（仅对 Phong 扇区可见）触发，提示"Phong 不守恒能量，高光会被烧死"
- `brdf-oren-nayar-roughness`: roughness > 0.8 时触发，提示"Oren-Nayar 在高粗糙度下与 Lambert 明显不同"
- `brdf-ggx-tail`: roughness < 0.3 时触发，提示"GGX 的高光'尾巴'比 Blinn-Phong 长得多"

#### Scenario: tour 与 hint 注册
- **WHEN** 用户首次进入 BRDF 对比模块并打开演示场景下拉
- **THEN** 下拉中列出至少 4 个预设
- **AND** 用户调 specular intensity > 1.5 时看到对应提示（每个用户最多一次）

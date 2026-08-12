## ADDED Requirements

### Requirement: 字母 F 物体几何

场景 MUST 渲染一个字母 F 形状的物体（由三个 BoxGeometry 合并成 BufferGeometry），尺寸约 3 单位高、2 单位宽。F MUST 不对称——上下不同、左右不同、正反不同，让任何旋转/缩放都能一眼看出方向。

#### Scenario: 默认 F 形状
- **WHEN** 用户首次进入变换模块
- **THEN** 看到一个字母 F 在画布中心，朝向 +Z（正面可见）
- **AND** F 的"竖直干"在左侧、"顶部水平臂"在右上、"中部水平臂"在右中
- **AND** F 是单一颜色（亮色，避免不同方向的色块混淆旋转感）

### Requirement: 双物体对比（原始 vs 变换后）

场景 MUST 同时显示两个 F：左侧**半透明灰色**的"原始" F（永远不动），右侧**亮色**的"变换后" F（应用所有变换）。学习者 MUST 能同时看到两者对比。

#### Scenario: 原始 F 不可动
- **WHEN** 用户调节任何变换滑杆
- **THEN** 左侧半透明 F 保持原始位置和姿态
- **AND** 右侧亮色 F 实时应用变换
- **AND** 两者始终同时可见

### Requirement: Translate / Rotate / Scale 滑杆

侧栏 MUST 提供三组滑杆：Translate X/Y/Z（-3 到 +3）、Rotate X/Y/Z（0–360°）、Scale X/Y/Z（0.1–3）。每个滑杆 MUST 实时更新右侧 F 的姿态。

#### Scenario: 平移
- **WHEN** 用户拖 Translate X 从 0 到 2
- **THEN** 右侧 F 向右移动 2 单位
- **AND** 矩阵显示的最后一列第一行（m41）从 0 变成 2

#### Scenario: 旋转
- **WHEN** 用户拖 Rotate Y 从 0 到 90°
- **THEN** 右侧 F 绕 Y 轴旋转 90°（侧面朝相机）
- **AND** 矩阵显示的 sin/cos 值可见（m11=0, m13=1, m31=-1, m33=0 等位置）

#### Scenario: 缩放
- **WHEN** 用户拖 Scale Y 从 1 到 2
- **THEN** 右侧 F 高度变成原来的 2 倍
- **AND** 矩阵对角线上第二行（m22）从 1 变成 2

### Requirement: 4×4 矩阵实时表格

侧栏底部 MUST 显示一个 4×4 数字表格，每个单元格显示变换矩阵的对应元素（保留 3 位小数）。**任何滑杆变化时**表格 MUST 立即更新。当前正在变化的元素的单元格 MUST 高亮（背景色变化）。

#### Scenario: 矩阵随滑杆更新
- **WHEN** 用户拖动 Translate X 滑杆
- **THEN** 矩阵表格的第 1 行第 4 列（顶行最右）实时跟随变化
- **AND** 该单元格背景色短暂变亮（提示"这个值正在变"）

#### Scenario: 默认矩阵
- **WHEN** 所有滑杆在初始值（T=0, R=0, S=1）
- **THEN** 矩阵表格显示单位矩阵（对角线 1，其余 0）

### Requirement: 变换顺序切换

侧栏 MUST 提供变换顺序切换：TRS / TSR / RTS / RST / STR / SRT。切换后右侧 F 的姿态 MUST 反映新顺序，矩阵 MUST 同步更新。

#### Scenario: 顺序不可交换
- **WHEN** 当前顺序 TRS，T=(2,0,0), Rz=45°, S=(1,1,1)
- **AND** 用户切换到 RTS
- **THEN** 右侧 F 的位置和姿态可能变化（具体取决于参数）
- **AND** 矩阵表格的数值改变
- **AND** 旁白或 HUD 提示"矩阵乘法顺序不可交换"

#### Scenario: 仅 T+R 时顺序差异
- **WHEN** T=(1,0,0), Rz=90°, S=(1,1,1)
- **AND** 用户从 TRS 切换到 RTS
- **THEN** 右侧 F 的最终位置不同（先旋转后平移 vs 先平移后旋转）
- **AND** 矩阵最后一列第一行的数值改变

### Requirement: 重置按钮

侧栏 MUST 提供一个"重置"按钮，点击后所有滑杆回到默认值（T=0, R=0, S=1）。

#### Scenario: 重置
- **WHEN** 用户点击重置
- **THEN** 所有滑杆回到默认
- **AND** 矩阵变成单位矩阵
- **AND** 右侧 F 回到原始位置（与左侧 F 重合）

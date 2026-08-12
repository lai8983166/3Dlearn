## ADDED Requirements

### Requirement: 精准触发点定义

系统 MUST 定义 5 个精准触发点，每个对应一个关键教学时刻。触发点 MUST 基于具体的 store 状态匹配（不是基于时间或猜测），每个提示 MUST 有唯一 id 用于去重。

5 个触发点 MUST 涵盖以下场景：
1. `hint-focal-crossing`：光学模块，物体被拖到焦点附近（|u - f| < 0.15）
2. `hint-all-layers-off`：PBR 模块，所有 4 个层都关闭
3. `hint-metalness-full`：PBR 模块，Metalness 拉到 1.0
4. `hint-concave-lens`：光学模块，首次切换到凹透镜
5. `hint-blinn-phong`：PBR 模块，首次切换到 Blinn-Phong 模型

#### Scenario: 物体跨过焦点
- **WHEN** 光学模块激活，用户拖动物体使 |objectX - (-focalLength)| < 0.15
- **AND** 提示 `hint-focal-crossing` 此前未触发过（localStorage `seenHints` 不包含此 id）
- **THEN** 屏幕右下角出现 toast："物体在焦点上了——看像距 v 趋向无穷，再拖一点就会切换到虚像"
- **AND** toast 显示一个"明白了"关闭按钮
- **AND** localStorage 中 `seenHints` 加入 `hint-focal-crossing`

#### Scenario: 已触发过的提示不再显示
- **WHEN** 用户第二次拖物体到焦点附近
- **THEN** 不再显示 `hint-focal-crossing` toast

### Requirement: Toast 视觉与行为

Toast MUST 出现在屏幕右下角（避开顶部 header 和左侧栏），半透明背景、最大宽度 320px、文字 12-14px。Toast MUST 在出现后 6 秒自动消失，或用户点击"明白了"立即消失。Toast MUST NOT 遮罩、阻塞、或拦截 canvas 上的鼠标事件。

#### Scenario: 自动消失
- **WHEN** 一个 toast 显示 6 秒后未被用户手动关闭
- **THEN** toast 在 300ms 内淡出消失

#### Scenario: 不阻塞操作
- **WHEN** toast 显示期间用户拖动物体或调整滑杆
- **THEN** 用户操作正常生效，toast 保持在原位直到超时或手动关闭

### Requirement: 同一时刻只显示一个 Toast

同一时刻 MUST 最多只有一个 contextual hint toast 显示。如果新提示触发时已有 toast 在显示，MUST 立即关闭旧 toast 显示新提示。

#### Scenario: 提示排队不堆积
- **WHEN** 用户连续两个动作触发两个不同的提示
- **THEN** 第一个 toast 立即被第二个取代，不出现两个 toast 同时显示

### Requirement: 提示状态可重置

帮助面板 MUST 提供"重置提示"按钮。点击后 MUST 清空 localStorage 中的 `seenHints` 数组，使所有提示下次满足条件时重新触发。

#### Scenario: 重置后再触发
- **WHEN** 用户点击"重置提示"，然后拖物体到焦点附近
- **THEN** `hint-focal-crossing` toast 再次显示

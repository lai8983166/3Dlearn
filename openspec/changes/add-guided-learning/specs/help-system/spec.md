## ADDED Requirements

### Requirement: 顶部帮助按钮

应用顶部 header 右侧 MUST 有一个圆形 "?" 图标按钮。点击 MUST 打开一个居中的 modal 帮助面板。按钮 MUST 在两个模块下都可见且位置一致。

#### Scenario: 打开帮助
- **WHEN** 用户点击 header 中的 "?" 按钮
- **THEN** 屏幕中央出现一个 modal，背景半透明遮罩
- **AND** modal 内容根据当前 activeModule 显示对应模块的说明
- **AND** Esc 键或点击遮罩关闭 modal

### Requirement: 帮助面板内容结构

帮助面板 MUST 包含四个区域，按顺序排列：
1. **模块概述**：当前模块的核心概念（3-5 句话，不超过 80 字）
2. **操作指南**：3-4 条要点（怎么拖、怎么切、怎么调）
3. **演示场景入口**：列出当前模块的所有 tour 预设，点击直接启动并关闭 modal
4. **教学提示管理**：显示"已看 X/5 个提示"，提供"重置提示"按钮

#### Scenario: 演示场景入口
- **WHEN** 帮助面板打开，用户点击"演示场景"区域中的"看 Fresnel"按钮
- **THEN** 帮助 modal 立即关闭
- **AND** PBR 模块的"看 Fresnel"演示场景开始执行（旁白条出现）

#### Scenario: 提示计数显示
- **WHEN** 用户已触发过 3 个提示（localStorage `seenHints` 数组长度为 3），打开帮助面板
- **THEN** "教学提示管理"区域显示"已看 3/5 个提示"

### Requirement: 帮助面板与模块路由同步

帮助面板打开时，如果用户切换了顶部 Tab（PBR ↔ Optics），modal 内容 MUST 立即更新为新模块的说明。或者，关闭 modal 并要求重新打开——任选其一作为可预测的行为。

#### Scenario: 切换模块时面板更新
- **WHEN** 帮助 modal 打开（显示 PBR 内容），用户点击 Optics Tab
- **THEN** modal 内容切换为光学模块的说明
- **AND** modal 仍然保持打开状态

### Requirement: 可访问性

帮助 modal MUST 满足基本无障碍要求：modal 打开时键盘焦点 MUST 移入 modal，Tab 键 MUST 在 modal 内循环，Esc 键 MUST 关闭 modal。

#### Scenario: Esc 关闭
- **WHEN** modal 打开，用户按 Esc
- **THEN** modal 立即关闭，键盘焦点回到打开它的 "?" 按钮

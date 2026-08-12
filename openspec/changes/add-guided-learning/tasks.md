## 1. Phase 1 — 焦点管理层 + 帮助系统骨架

目标：建立教学元素的"单一焦点"管理机制，让后续的演示场景和提示有共同的底座。Phase 1 结束后 "?" 按钮可用，能切换模块并看到对应说明。

- [ ] 1.1 扩展 `src/store.ts`：加 `activeInterruption`、`seenHints: string[]`、`lastUpdater: 'user' | 'tour' | 'system'` 字段，加 `setActiveInterruption` / `markHintSeen` / `resetHints` actions（~45 min）
- [ ] 1.2 写 `src/ui/HelpModal.tsx`：modal 框架（背景遮罩、Esc 关闭、Tab 循环、focus trap），先放占位内容（~75 min）
- [ ] 1.3 在 `src/App.tsx` header 加 "?" 按钮，点击打开 modal；modal 内容根据 activeModule 切换（~45 min）
- [ ] 1.4 写 `src/ui/helpContent.ts`：PBR 与 Optics 各自的"模块概述"+"操作指南"文案（~60 min）
- [ ] 1.5 把"已看 X/5 提示"+"重置提示"按钮放到 modal，先接通 `resetHints` action（实际计数等 Phase 3 接）（~30 min）
- [ ] 1.6 Phase 1 验收：开 modal、切模块看内容更新、Esc 关闭、点重置不报错（~20 min）

## 2. Phase 2 — 演示场景引擎与 PBR 预设

目标：PBR 模块的 4 个一键演示场景可用。Phase 2 结束后用户可以从帮助面板或侧边栏下拉触发演示。

- [ ] 2.1 写 `src/tours/types.ts`：定义 `TourStep`、`Tour`、`TourRunner` 接口（~30 min）
- [ ] 2.2 写 `src/tours/runner.ts`：执行引擎，串行 await 步骤，每步用 `requestAnimationFrame` 做数值字段线性插值、布尔/字符串字段立即跳变（~120 min）
- [ ] 2.3 实现中断机制：runner 订阅 store，若 `lastUpdater === 'user'` 且当前 tour 活跃则停止；Esc 键和"跳过"按钮也作为中断源（~75 min）
- [ ] 2.4 写 `src/tours/pbrTours.ts`：4 个 PBR 场景定义（分层揭示、Fresnel 掠射、GGX vs BP、金属 vs 非金属）（~90 min）
- [ ] 2.5 写 `src/ui/TourOverlay.tsx`：画布顶部旁白条 + 跳过按钮 + 还原按钮（运行中才显示）（~60 min）
- [ ] 2.6 在帮助 modal 加"演示场景"区域，点击启动并关闭 modal（~30 min）
- [ ] 2.7 PBR 模块侧边栏顶部加"演示场景"下拉（Phase 1 spec 要求；与帮助面板入口并存）（~45 min）
- [ ] 2.8 Phase 2 验收：跑完 4 个 PBR 场景、每个旁白正确、跳过按钮可用、手动操作能中断（~30 min）

## 3. Phase 3 — 光学预设与上下文提示

目标：光学的 3 个演示场景可用；5 个上下文提示精准触发。

- [ ] 3.1 写 `src/tours/opticsTours.ts`：3 个光学场景（薄透镜方程验证、实像→虚像切换、凹透镜发散）。光学 tour 需要扩展支持"自定义动画路径"（物体 x 沿曲线移动而非线性），因为实像→虚像场景要在焦点附近减速（~120 min）
- [ ] 3.2 把光学场景下拉入口加到光学侧边栏顶部 + 帮助 modal（~30 min）
- [ ] 3.3 写 `src/ui/Hint.tsx`：toast 组件（右下角、半透明、最大 320px、6 秒自动消失、300ms 淡入淡出）（~60 min）
- [ ] 3.4 写 `src/hints/definitions.ts`：5 个 hint 定义（id、appliesTo、condition、message）（~60 min）
- [ ] 3.5 写 `src/hints/trigger.ts`：store subscription，监听变化时遍历 hints，找到第一个满足条件且未 seen 的，触发 toast 并加 id 到 seenHints（~75 min）
- [ ] 3.6 在 activeInterruption 状态机里集成 hint：tour 或 help 活跃时 hint 不触发；hint 触发时设置 activeInterruption = hint，结束回到 none（~45 min）
- [ ] 3.7 Phase 3 验收：依次手动满足 5 个 hint 条件，看到 5 个不同的 toast；第二次满足条件不再触发；点重置后可重新触发（~30 min）

## 4. Phase 4 — 打磨与回归

目标：边界情况、可访问性、最终验收。

- [ ] 4.1 验证 localStorage 持久化：刷新后 seenHints、已演示过的 tour 标记保留（不需要"已看完"成就，但 activeInterruption 必须重置为 none）（~30 min）
- [ ] 4.2 验证模块切换时所有教学元素正确清理：切到 Optics 时 PBR tour 中断、PBR hint 不触发（~30 min）
- [ ] 4.3 加键盘可访问性：tour 旁白条跳过按钮、hint toast 关闭按钮、modal 内 Tab 循环都通过 Tab/Esc 测试（~45 min）
- [ ] 4.4 加演示场景的"还原到演示前"功能：tour 启动时快照当前 store 状态到内存，点还原恢复（不持久化，刷新后失效）（~45 min）
- [ ] 4.5 在 README 加"教学引导"章节：列出 4+3 个演示场景名称、5 个提示触发点的简短列表（不剧透完整文案，让用户自己遇到）（~30 min）
- [ ] 4.6 最终验收：按 README 验收清单跑一遍，确认所有原 Phase 1-3 功能（PBR、光学、HDRI、持久化）未被引导层破坏（~30 min）

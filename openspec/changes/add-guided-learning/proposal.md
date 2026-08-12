## Why

演示器功能本身已经能跑（PBR 分层、光学追迹都按 spec 验收），但作为**教学工具**它还差关键一环：**没有引导机制**。

现状是一个新用户打开应用后看到的是：

- 一堆滑杆、开关、下拉，没有"从哪儿开始"的指引
- 公式 HUD 在侧边栏底部，但和"现在该看什么"无关
- 拖物体、切 HDRI 这些操作的真实教学价值（比如"拖到焦点附近会看到实像→虚像切换"）没有揭示

学习者面对一堆可调参数，不知道哪些组合有教学意义。把所有提示都堆上去又会让屏幕变得嘈杂——违反演示器"逐步揭示"的核心哲学。

我们需要的是一个**克制的引导层**：默认隐藏，关键时刻出现，主动入口可达。

## What Changes

引入三个互相独立但风格一致的教学辅助能力：

1. **Guided Tour Scenes（一键演示场景）**：每个模块预设 3-4 个脚本化场景，点击后自动调整所有参数到目标状态、动画化过渡、配旁白说明。"看 Fresnel"按钮比一段文字解释更有效。
2. **Contextual Hints（上下文精准触发提示）**：5 个精选触发点，当用户走到这些状态时弹出 toast 提示（如"物体跨过焦点 → 像距跳到无穷"）。每个最多触发一次，localStorage 记录。
3. **Help System（帮助面板）**：顶部 "?" 按钮，弹出当前模块的核心概念、操作指南、演示场景入口、提示重置。

## Capabilities

### New Capabilities
- `guided-tours`: 脚本化的一键演示场景；每个场景定义一组步骤（参数目标 + 旁白 + 停留时间），自动驱动 store 与场景视角
- `contextual-hints`: 5 个精准触发的 toast 提示，每个用户最多看一次；不阻塞、不遮罩、可手动关闭
- `help-system`: "?" 按钮弹出的教学面板，整合模块概念说明、操作指南、演示场景入口、提示状态管理

### Modified Capabilities
- `scene-shell`: 顶部 header 加 "?" 按钮和"演示场景"下拉；帮助弹窗作为顶层 modal
- `pbr-layer-explainer`: 新增 4 个 tour 预设（看分层、看 Fresnel、GGX vs BP、金属 vs 非金属）
- `optics-simulation`: 新增 3 个 tour 预设（薄透镜方程、实像→虚像、凹透镜发散）

## Impact

- **新增代码**：
  - `src/tours/`：场景定义 + 执行引擎
  - `src/ui/Hint.tsx`：toast 组件
  - `src/ui/HelpModal.tsx`：帮助弹窗
  - `src/ui/TourOverlay.tsx`：演示场景的旁白条 + 跳过按钮
  - `src/store.ts` 扩展：tour 状态、已显示提示集合
- **新增依赖**：无（用现有 React + Zustand + Tailwind 即可，不引入 intro.js / shepherd 等外部库）
- **localStorage 增加**：
  - `seenHints: string[]`：已显示过的提示 id
- **可访问性**：所有 toast 和 modal 必须能用 Esc 关闭、能用 Tab 在内部导航

## Non-Goals

1. **不做 intro.js 风格的强制 tour**。首次启动不弹遮罩、不要求看完步骤——纯主动入口。
2. **不做行为分析/AI 推荐**。提示触发是硬编码的 5 个状态匹配，不试图理解用户"在做什么"。
3. **不做视频/音频教学**。所有内容用文字 + 动画化参数过渡，避免引入二进制资源。
4. **不做用户账号/进度同步**。提示状态只用 localStorage，刷新后保留，清缓存后重置。
5. **不重写公式 HUD**。现有 HUD 已经够用；tour 只是触发其高亮，不改动其结构。

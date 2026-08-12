## Context

3DLearn 应用已经能跑通两个模块（PBR + Optics），所有交互（滑杆、开关、拖拽、HDRI 切换）都按 spec 验收。功能完整，但**作为教学工具**它默认假设用户自己能找到所有这些功能的教学价值——这对图形学/光学新手不成立。

本设计增加一层**克制**的引导：默认隐藏，关键时刻出现，主动入口可达。核心是把"教学动作"从"教学文字"提炼出来——一键演示场景（让用户看现象）比一段说明（让用户读文字）有效得多。

不引入外部引导库（intro.js / shepherd / react-joyride），用现有的 React + Zustand + Tailwind 实现，避免增加依赖与样式冲突。

## Goals / Non-Goals

**Goals:**
- 让首次用户能在 30 秒内理解"这个工具能教我什么"
- 让所有用户都能通过"一键演示场景"看到核心教学时刻
- 让 5 个关键学习节点能精准触发提示，不早不晚
- 保持"逐步揭示"哲学——默认隐藏教学元素，关键时刻才出现

**Non-Goals:**
- 不做行为追踪、不试图理解用户"现在在学什么"
- 不做"通关式"教学（学完第 5 课才能看第 6 课）
- 不重写公式 HUD 或现有控件

## Decisions

### Decision 1: 一键演示场景 = 参数脚本 + 旁白，不是视频/动画框架

每个 tour 是一个**步骤数组**：

```typescript
interface TourStep {
  /** 目标 store 状态（部分更新，类似 Zustand 的 set 模式）。 */
  target: Partial<PbrState> | Partial<OpticsState>;
  /** 动画过渡时长（ms）。0 = 立即跳变。 */
  durationMs: number;
  /** 步骤开始时显示的旁白。 */
  narration: string;
  /** 步骤结束后停留时间（ms），让用户消化。 */
  holdMs?: number;
}

interface Tour {
  id: string;
  label: string;
  description: string;
  steps: TourStep[];
}
```

**执行引擎**串行 await 各步骤，每步内部用 `requestAnimationFrame` 在 `durationMs` 内把 store 状态从当前值线性插值到目标值（数值字段）或立即跳变（布尔/字符串字段）。

**理由**：
- 不引入 GSAP / Framer Motion（每个 100KB+）
- 参数动画化比文字解释更直观（"看相机移动到掠射角"比"想象相机移到掠射角"好）
- 直接驱动 store，让用户在场景运行期间手动操作时立即看到 store 变化触发中断（天然的逃生口）

### Decision 2: 上下文提示用 selector subscription，不用 setInterval 轮询

每个 hint 是一个**纯函数**，输入当前 store 状态返回 boolean（是否应该触发）：

```typescript
interface Hint {
  id: string;
  appliesTo: 'pbr' | 'optics';
  condition: (state: AppState) => boolean;
  message: string;
}
```

订阅层在 store 变化时检查所有 hint，触发条件满足且 id 未在 `seenHints` 中的第一个 hint，显示 toast 并把 id 加入 `seenHints`。

**理由**：
- Zustand subscribe 已有，零额外成本
- 不需要节流，因为条件匹配只在状态变化时跑一次
- 顺序保证："同一时刻只显示一个 toast" 用单一 hint queue 实现，新触发的提示直接覆盖旧的

### Decision 3: 演示场景与上下文提示使用同一个"焦点管理层"

应用顶层 MUST 维护一个 `activeInterruption` 状态：

```typescript
type ActiveInterruption =
  | { kind: 'none' }
  | { kind: 'tour'; tourId: string }
  | { kind: 'hint'; hintId: string }
  | { kind: 'help' };
```

任何时刻只能有一个活跃。规则：

- tour 活跃时，hint 不触发（tour 自己会驱动 store，会触发各种 hint 条件，必须屏蔽）
- help modal 打开时，hint 不触发
- tour 活跃时按 Esc / 点跳过 / 用户手动操作 store → 中断 tour，回到 none
- 用户手动操作（任何 `setPbr` / `setOptics` 调用）如果不是来自 tour 引擎 → 中断 tour

**理由**：避免教学元素互相打架。曾经见过 tour 自动调参数 → hint 同时弹"你刚才的操作"→ 用户根本不知道点哪里关。一个时刻一个教学动作。

### Decision 4: 中断检测用 "agent" 标记 store 更新来源

Zustand 的 `set` 函数支持传入一个 meta。我们用一个轻量 trick：tour 引擎更新 store 时设置 `lastUpdater: 'tour'`，UI 控件更新时设置 `lastUpdater: 'user'`。tour 引擎订阅 store 变化，如果 `lastUpdater === 'user'` 则立即中断。

**理由**：不需要事件总线，不需要订阅每个 UI 控件，单点检测。

### Decision 5: 帮助 modal 内嵌演示场景入口

帮助面板的"演示场景"区域列出当前模块的所有 tour。点击直接启动并关闭 modal。**理由**：

- 用户最可能从"?" 进入寻求帮助，把演示场景放在那里最高 ROI
- 避免在侧边栏顶部又加一个独立的"演示"按钮（会让侧边栏更乱）

侧边栏本身**不放** tour 入口，避免首屏就被教学元素占领。但帮助按钮永久可见。

### Decision 6: 不做"已看完所有提示"的成就系统

每个提示最多触发一次，用户可能看完 5 个，也可能一个都没看到就关掉。**不**做"恭喜你看完所有 5 个提示"的成就，因为：
- 提示是被动触发的，用户不应该被"我应该多看点提示"绑架
- 这违背"不打扰"哲学

帮助面板显示"已看 X/5"纯粹是状态可见性，不是进度条。

## Risks / Trade-offs

### Risk 1: 演示场景的参数过渡可能与用户已有状态冲突
**风险**：用户调了一堆参数，点演示场景，自动覆盖掉他的状态。
**缓解**：演示场景结束后**不**还原状态（spec 已规定）。如果用户想恢复，可以刷新（localStorage 持久化会重置——等等，localStorage 是持久化的，刷新不会重置）。

**最终决定**：在演示场景旁白条加一个"还原到演示前"按钮（仅在场景运行期间可见）。这样用户既可"演示完继续探索"也可"还原"。增加 ~20 行代码，值得。

### Risk 2: 上下文提示触发时机可能尴尬
**风险**：用户拖物体跨过焦点是为了别的事，弹个提示打扰他。
**缓解**：toast 是非阻塞的（spec 已规定），不阻止操作，6 秒自动消失。第一次打扰是教学，第二次以后就静默（seenHints 去重）。

### Risk 3: 中断检测的 false positive
**风险**：tour 引擎自己 set store 时，因为 React 异步批量更新，可能被误判为用户操作。
**缓解**：tour 引擎内部用 `set({ ..., lastUpdater: 'tour' })` 显式标记。UI 控件用 `set({ ..., lastUpdater: 'user' })`。中断检测器只在 `lastUpdater === 'user'` 且当前 tour 活跃时触发。可控。

### Risk 4: 5 个提示条件可能写得不够精准
**风险**：例如 `hint-metalness-full` 条件写成 `metalness === 1.0`，用户从 0.99 拖到 1.0 的滑杆精度可能跳不到精确 1.0。
**缓解**：条件用 `metalness >= 0.99`。所有数值条件都留一点 buffer。

### Trade-off: 演示场景预设是硬编码，不是配置
**代价**：未来要加新场景需要改代码、重新部署。
**收益**：每个场景可以包含精确的旁白文案和参数目标，不需要做"场景编辑器"这种过度工程化的功能。3-4 个预设就够，多了反而稀释每个的教学价值。

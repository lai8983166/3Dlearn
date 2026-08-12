## Context

当前仓库是空白工程（仅 `openspec/` 目录与 `.claude/` 配置），无任何前端代码。本设计从零开始定义一个 Three.js + React 的教学演示器，分两个模块（PBR 拆解器、光学沙盒）。

技术栈（与 `openspec/config.yaml` 一致）：Three.js + Vite + React 18 + TypeScript + Zustand + Tailwind。仅 Web，无 Tauri/Electron。

## Goals / Non-Goals

**Goals:**
- 让 PBR 参数的"每一层贡献"可单独观察、可单独调节
- 让薄透镜成像的光路与像点形成过程"看得见、拖得动"
- 60fps 在普通笔记本 GPU 上稳定运行
- 物理计算（光学）与渲染层解耦，便于单元测试
- 首次加载体验良好——不强制下载 HDRI

**Non-Goals:**
- 不做自定义 GLSL 编辑器（详见 proposal）
- 不做光谱/波动光学
- 不做移动端
- 不做后端服务

## Decisions

### Decision 1: 不使用 @react-three/fiber，用裸 Three.js + React 薄封装

**理由**：教学场景的核心价值是"让原理可见"。@react-three/fiber 把 Three.js 包装成声明式 JSX，对生产应用很好，但对学习者来说：
- 它遮挡了场景图（Scene Graph）的构建过程——学习者看到 `<mesh><boxGeometry/></mesh>` 不会理解 `scene.add(mesh)` 的本质
- 它的 reconciler 让"对象生命周期"变得隐式，调试 PBR shader 时反而增加心智负担
- 我们需要"每个 PBR 层关闭就立刻看到差异"，这种命令式控制用裸 Three.js 更直接

**做法**：
- React 只负责 DOM 侧边栏（滑杆、开关、HUD 数值）
- Three.js 场景由独立的 `SceneModule` 类管理，通过 `useEffect` 在 canvas 挂载时实例化
- React 与 Three 之间用 **Zustand store** 单向同步：UI 改 store → SceneModule 订阅 store 变化 → Three 更新；Three 内部交互（如 OrbitControls）需要回写 UI 时，调用 store 的 action

### Decision 2: PBR 分层用"单 ShaderMaterial + uniform 开关"，不用多 Mesh 叠加

考虑过的替代方案：4 个半透明球壳叠加，每层一个 Mesh。**否决**，因为：
- 半透明叠加会引入混合顺序问题
- 学习者拖动相机时层与层可能视觉上"分离"
- Normal Map 必须在 fragment shader 里扰动法线，无法用叠加几何实现

**最终方案**：一个自定义 `ShaderMaterial`（基于 Three.js 的 `onBeforeCompile` 修改 `MeshStandardMaterial`，或完全手写）：
- Uniforms：`uDiffuseEnabled`、`uSpecularEnabled`、`uNormalEnabled`、`uEnvEnabled`（bool）
- Uniforms：`uDiffuseColor`、`uSpecularColor`、`uSpecularIntensity`、`uRoughness`、`uMetalness`
- Uniforms：`uNormalMap`、`uEnvMap`
- Fragment shader 中每段贡献乘以 boolean uniform：`diffuseContribution *= uDiffuseEnabled ? 1.0 : 0.0;`

**好处**：
- 切换开关只改一个 uniform，零几何变化，60fps 不掉帧
- 学习者看到的"分层"是真的数学层面分层（不是几何戏法）

### Decision 3: 光学计算放纯 TS 模块，不耦合 Three.js

`src/physics/optics.ts` 导出纯函数：

```typescript
type LensType = 'biconvex' | 'planoconvex' | 'biconcave' | 'planoconcave';
interface LensConfig { type: LensType; focalLength: number; } // f 可正可负

interface Ray { origin: [number, number]; direction: [number, number]; }
function refractThroughThinLens(ray: Ray, lens: LensConfig, opticalAxisY: number): Ray;

interface ImagingResult { imageDistance: number; magnification: number; isReal: boolean; isUpright: boolean; }
function computeThinLensImaging(objectDistance: number, focalLength: number): ImagingResult;
```

**理由**：
- 可写单元测试验证 1/v - 1/u = 1/f
- 不依赖 WebGL，可在 Node 跑
- Three.js 只负责把 `Ray[]` 画成黄色线段

### Decision 4: 光线绘制用 BufferGeometry 实时更新，不用 LineSegments 重创建

光学模块每帧都可能改变光线（用户拖动物体），重新创建 `LineSegments` 会触发 GPU 缓冲上传。**做法**：预分配 `BufferAttribute`（maxRays * 2 * 3 顶点），每帧只更新 `needsUpdate = true`。

### Decision 5: HDRI 加载策略

按 spec 要求，HDRI 是按需下载。流程：
1. 首次进入 PBR 模块 → 用 `RoomEnvironment`（Three.js 内置 `PMREMGenerator` 处理）作为零下载回退
2. 用户点击"切换 HDRI" → 显示文件大小 → 确认后用 `RGBELoader` 加载
3. 下载的 ArrayBuffer 存 IndexedDB（key = 文件名）
4. 二次切换 → 先查 IndexedDB → 命中则直接 `RGBELoader.parse(arrayBuffer)`

**为什么 IndexedDB 而非 localStorage**：HDRI 文件 5–20MB，localStorage 上限 5–10MB，且存字符串会触发 base64 膨胀。

### Decision 6: 模块切换的资源清理

`SceneModule` 接口：

```typescript
interface SceneModule {
  init(container: HTMLDivElement): void;
  dispose(): void;  // 释放所有 geometry/material/texture
  update(): void;   // 每帧调用
}
```

切换模块时调用旧模块的 `dispose()`，遍历 `scene.traverse` 调用 `geometry.dispose()`、`material.dispose()`、对 texture 调用 `texture.dispose()`。验证标准：`renderer.info.memory.textures` 在切换后归零（或回到环境贴图基准）。

## Risks / Trade-offs

### Risk 1: 自定义 Shader 的复杂度
**风险**：从零写 PBR shader 容易踩坑（能量守恒、Fresnel 边界条件）。
**缓解**：首选 `MeshStandardMaterial` + `onBeforeCompile` 注入分层 uniform，而不是完全重写。只在必要时（如 Blinn-Phong ↔ GGX 切换）替换 shader chunk。教学价值不打折，因为"分层开关"才是教学点，不是 shader 实现细节。

### Risk 2: polyhaven HDRI 可能 CORS 受限或网络慢
**风险**：国内访问 polyhaven.com 可能慢或不稳定。
**缓解**：
- 提供 jsdelivr / UNPKG 上的镜像作为备选源
- 明确告知用户首次下载需等待，提供取消按钮
- 默认 RoomEnvironment 足够教学，HDRI 是锦上添花

### Risk 3: 薄透镜近似的视觉欺骗
**风险**：薄透镜假设光线在透镜平面"瞬时折射"，但教学场景下用户可能放大于透镜的物体，看到光线"穿过"透镜内部时不偏折会困惑。
**缓解**：在透镜内部画一段"假"过渡线（光线进入和出来之间画一段弯曲），并在 HUD 注明"教学近似：薄透镜"。

### Risk 4: React 18 严格模式双调用与 Three.js 资源泄漏
**风险**：开发模式下 React 18 StrictMode 会双调用 `useEffect`，可能导致 Three.js renderer 被创建两次。
**缓解**：在 effect cleanup 中正确 dispose renderer（`renderer.dispose()`、`renderer.forceContextLoss()`），并用 `useRef` 防止重入。

### Trade-off: 不用 react-three-fiber 增加了少量样板代码
**代价**：每个模块多写 ~50 行场景初始化代码。
**收益**：教学透明度大幅提升，学习者读源码能直接看到 `scene.add(mesh)`、`renderer.render(scene, camera)` 这些本质操作。

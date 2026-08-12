## Context

3DLearn 已经有 4 个 SceneModule（PBR / 光学 / 阴影 / 纹理）+ 完整教学引导层。新增两个场景（变换、色彩）沿用现有架构，主要工作量在场景内容本身。

零新依赖：字母 F 用 BufferGeometry 拼三个 BoxGeometry；tone mapping 用 Three.js 内置 `renderer.toneMapping`。

## Goals / Non-Goals

**Goals:**
- 让"矩阵乘法顺序不可交换"这个抽象概念**变成肉眼可见的对比**
- 让 4×4 矩阵的 16 个元素**不再是黑箱**——拖滑杆看到对应元素变化
- 让 HDR / tone mapping / gamma 校正**一次看懂**——同一场景对比三种 tonemap
- 让"为什么我的渲染输出看起来颜色错"这种常见 bug**自我诊断**——关 gamma 校正看错误效果，再开看正确

**Non-Goals:**
- 不做四元数 / gimbal lock（详见 proposal）
- 不做透视投影矩阵拆解
- 不做 LUT 编辑器
- 不做鼠标拾色器

## Decisions

### Decision 1: 字母 F 由三个 BoxGeometry 合并成 BufferGeometry

字母 F 是图形学经典教学形状（参考《Fundamentals of Computer Graphics》），不对称到让任何旋转/缩放的方向都可见。构造方式：

```typescript
const stem = new BoxGeometry(0.4, 3.0, 0.2).toNonIndexed();
const topArm = new BoxGeometry(1.6, 0.4, 0.2).toNonIndexed();
topArm.translate(0.6, 1.3, 0);  // offset so it attaches to upper stem
const midArm = new BoxGeometry(1.2, 0.4, 0.2).toNonIndexed();
midArm.translate(0.4, 0.0, 0);  // middle

mergeGeometries([stem, topArm, midArm]);
```

`BufferGeometryUtils.mergeGeometries` 来自 `three/addons/utils/BufferGeometryUtils.js`。

### Decision 2: 双物体对比 = 半透明 F（原始）+ 不透明 F（变换后）

两个独立的 Mesh 共享同一个 BufferGeometry，但 material 不同：
- 原始 F：`MeshBasicMaterial` 半透明（opacity 0.25），灰色，无光照
- 变换后 F：`MeshStandardMaterial` 不透明，亮色（如 #4ade80），有光照

两个 mesh 都加到 scene，但只有变换后 F 应用 matrix。

**理由**：双物体对比让"原始位置在哪"始终可见——单物体变换时学习者会忘记原始位置。

### Decision 3: 矩阵显示用 React 表格组件，不是 Canvas

侧边栏 4×4 表格用 HTML/CSS 实现：
- 16 个 `<div>` 单元格，CSS Grid 排成 4×4
- 每个单元格 `font-mono` 显示数值（保留 3 位小数）
- 当前正在变化的单元格背景色变化（CSS transition）

**理由**：HTML 表格的可访问性、响应式、字体渲染都优于 Canvas 实现。每次 store 变化时 React 自然重渲染。

### Decision 4: 矩阵顺序的实现用 Three.js Matrix4.makeComposition

Three.js 的 Matrix4 提供：
- `makeTranslation(x, y, z)`
- `makeRotationX/Y/Z(rad)`
- `makeScale(x, y, z)`
- `multiply(matrix)` 矩阵乘法

每种顺序（TRS 等）按对应顺序调用 `multiply`：

```typescript
const result = new THREE.Matrix4();
const T = new THREE.Matrix4().makeTranslation(tx, ty, tz);
const R = new THREE.Matrix4().makeRotationEuler(...);
const S = new THREE.Matrix4().makeScale(sx, sy, sz);

switch (order) {
  case 'TRS': result.multiply(T).multiply(R).multiply(S); break;
  case 'TSR': result.multiply(T).multiply(S).multiply(R); break;
  // ...
}
mesh.matrix.copy(result);
mesh.matrixAutoUpdate = false;
```

关闭 `matrixAutoUpdate` 让我们直接控制 matrix，不被 Three.js 自动重新计算。

### Decision 5: Color Pipeline 用 Three.js renderer.toneMapping

Three.js 内置：
- `renderer.toneMapping = THREE.NoToneMapping`
- `THREE.ReinhardToneMapping`
- `THREE.ACESFilmicToneMapping`
- `renderer.toneMappingExposure = 1.0`
- `renderer.outputColorSpace = THREE.SRGBColorSpace` 或 `THREE.LinearSRGBColorSpace`

切换 tonemap 类型时需要 `renderer.shadowMap.needsUpdate = true`？实际上 tonemap 不需要——它是 fragment 末段的 uniform，shader 编译时已经分支处理。切换 exposure 直接生效。

### Decision 6: 高光 clip 可视化用自定义后处理 fragment shader

不做完整 EffectComposer，只加一个最小的 onBeforeCompile 钩子，在 MeshStandardMaterial 的 fragment 末段加：

```glsl
if (gl_FragColor.r >= 0.999 && gl_FragColor.g >= 0.999 && gl_FragColor.b >= 0.999) {
  gl_FragColor = vec4(1.0, 0.0, 1.0, 1.0); // magenta override
}
```

只在"clip 可视化开关"开启时激活（uniform）。

**理由**：完整 EffectComposer 引入两个 RenderTarget + 一堆 copy pass，工程量大；onBeforeCompile 已经在 PBR 模块用过，模式一致。

### Decision 7: 6 个 Tab 文字缩短

顶部 Tab 文字：PBR / 光学 / 阴影 / 纹理 / 变换 / 色彩。每个 Tab 大约 60-80px 宽，6 个总宽 ~400px，1024px 屏宽下舒服。

### Decision 8: 多球场景的相机位置

相机略微俯视，让一行球（X 轴排列）的高光区域清晰可见。光照来自右上前方（key）+ 左侧填充，让最亮球面的高光（HDR 区域）在视野内。

## Risks / Trade-offs

### Risk 1: 字母 F 形状合并可能产生 z-fighting
**风险**：三个 box 在边界处可能 z-fight。
**缓解**：让 box 之间略微重叠（0.01 单位），且 z 厚度一致；不使用 polygon offset。

### Risk 2: 切换变换顺序时 R 顺序还按 XYZ 可能让某些组合难以预测
**风险**：欧拉角顺序本身也有顺序问题（XYZ vs ZYX）。
**缓解**：本演示只暴露 T/R/S 之间的顺序，R 内部固定 XYZ。如果学习者关心欧拉角顺序，那是另一个主题（gimbal lock）。

### Risk 3: clip 可视化的 onBeforeCompile 可能跟其他修改冲突
**风险**：如果将来在 ColorModule 也用 onBeforeCompile 改其他东西，链式替换要小心。
**缓解**：用一个清晰的 chunk 名（`#include <tonemapping_fragment>` 后插入）避免冲突。Phase 2 实施时验证。

### Risk 4: ACES tonemap 让"对比 None 和 ACES"的中间调看起来差异小
**风险**：ACES 主要压缩高光，中间调变化微妙，初学者看不出差异。
**缓解**：tour "ACES vs Reinhard" 把 exposure 推到 +1.5 让高光范围扩大，差异变明显。Spec 已经要求 exposure 在 +1 状态下能看出差异。

### Trade-off: 不做 Inspector 像素拾色器
**代价**：学习者不能精确知道"这个像素的 HDR 值是多少"。
**收益**：避免 RenderTarget 读取 + 鼠标坐标转换的工程量。"被 clip 像素"的可视化已经能传达核心概念。

### Trade-off: 6 个 Tab 在 1024px 略挤但可容纳
**代价**：1024px 屏宽下顶部 Tab 占比变高。
**收益**：避免"分类下拉"多一次点击，6 个场景一眼可见。

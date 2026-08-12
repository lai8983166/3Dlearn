## Context

3DLearn 已经有 PBR 和光学两个独立 SceneModule + 一套完整的教学引导层（tour runner + hint controller + help modal）。新增两个场景（阴影映射、纹理/UV）的技术风险低——主要工作量在场景内容本身，UI 和教学层是"加更多条目"。

技术栈不变：Three.js + React + Zustand + Tailwind，零新依赖。

## Goals / Non-Goals

**Goals:**
- 让阴影映射的 4 个核心问题（acne、peter panning、PCF、分辨率）**看得见、能对比**
- 让纹理过滤的 4 种模式（Nearest/Linear/Mipmap/Anisotropic）和 3 种 wrapping 在**同一场景**里可切换对比
- UV 概念通过"3D 表面网格 + 2D 纹理角落预览"的双视图设计传达
- 复用现有架构，避免新发明

**Non-Goals:**
- 不做聚光灯 / 点光源阴影（详见 proposal）
- 不做 UV 展开动画
- 不做用户写 shader 的 playground

## Decisions

### Decision 1: 直接复用现有架构，不引入新抽象

两个新场景 = 两个新 SceneModule + 两个新 store state 切片 + 两个新 tour 文件 + 几个新 hint。**不需要**新框架、新事件总线、新 reducer。复用：

- `SceneManager` / `RendererCanvas`：零改动
- `SceneModule` 接口：零改动
- `tourRunner`：注册更多 tour 即可
- `hintController`：在 `HINTS` 数组加更多条目
- `HELP_CONTENT`：加两个新模块的文案

唯一可能要小幅扩展的是顶部 Tab——4 个 Tab 加文字缩短。

### Decision 2: 阴影模块用 Three.js 原生 DirectionalLight.shadow

Three.js 的 `DirectionalLight` 已内置 shadow map：
- `light.shadow.mapSize.set(w, h)` 控制分辨率
- `light.shadow.bias` 控制 bias
- `renderer.shadowMap.type = THREE.PCFSoftShadowMap` 启用 PCF
- `light.shadow.radius` 控制 PCF 半径（仅 PCFSoft 模式）

**PCF 模式切换的实现**：Three.js 的 shadowMap.type 是 renderer 级别，不能按光源切。所以"None / 1×1 / 3×3 / 5×5"映射到：
- None → `BasicShadowMap`（无滤波）
- 1×1 → `PCFShadowMap`（一次采样）
- 3×3 / 5×5 → `PCFSoftShadowMap` + `shadow.radius` 调节

切换 type 需要 `renderer.shadowMap.needsUpdate = true`，会触发重编译。可接受。

### Decision 3: Shadow Map 角落预览用独立正交相机 + 子渲染

主渲染循环里加一步：
1. 主相机渲染场景到默认 framebuffer
2. 用 `renderer.setViewport(cornerX, cornerY, 160, 120)` 设置角落区域
3. 用 `renderer.clearDepth()` 清深度
4. 用一个**正交相机**对着一个**贴了 shadow map 纹理的全屏四边形**渲染
5. `renderer.setViewport(0, 0, fullWidth, fullHeight)` 恢复

不嵌套 EffectComposer / RenderTarget 链——直接复用 shadow map 纹理本身（`light.shadow.map.texture`）作为四边形的 map。

### Decision 4: 纹理模块用 CanvasTexture 程序化生成 checkerboard

```typescript
const canvas = document.createElement('canvas');
canvas.width = canvas.height = 256;
const ctx = canvas.getContext('2d')!;
for (let y = 0; y < cells; y++) {
  for (let x = 0; x < cells; x++) {
    ctx.fillStyle = (x + y) % 2 === 0 ? '#ffffff' : '#000000';
    ctx.fillRect(x * size, y * size, size, size);
  }
}
const texture = new THREE.CanvasTexture(canvas);
texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
```

切换 checker 单元数 / 过滤模式 / wrapping 都通过修改 texture 属性 + `texture.needsUpdate = true`。

### Decision 5: UV 网格叠加用 LineSegments 子物体

在 plane 的几何上加一个 LineSegments 子物体：
- 顶点位置对应 UV (0, 0.125, 0.25, ..., 1.0) 在 3D 空间的位置（计算 plane 顶点的 UV → position 映射）
- 颜色亮黄半透明
- 调节 tiling 时，要么缩放网格（tiling 越大网格越密），要么重建顶点

实现简单：用 BufferGeometry + LineBasicMaterial。tiling 改变时通过 `scale.set(tiling, tiling, 1)` 等比缩放网格（这等于"UV 空间的网格密度翻倍"，符合直觉）。

### Decision 6: 2D 纹理角落预览用同一 viewport 技术

与 Decision 3 相同的方法：主渲染后用正交相机渲染一个贴了 checker 纹理的四边形到角落，再叠加 UV 网格线。复用同一套 viewport + overlayQuad 工具。

抽一个共享 utility `src/three/cornerPreview.ts`：`drawCornerQuad(renderer, texture, { x, y, w, h, overlayLines? })`。

### Decision 7: 顶部 Tab 文字缩短 + 响应式

当前文字：
- "PBR Shader 拆解器" (~10 字符)
- "几何光学沙盒" (6 字符)

改成：
- "PBR"
- "光学"
- "阴影"
- "纹理"

加 `flex-wrap` 或 `overflow-x-auto`。1024px 屏宽下 4 个 Tab 紧凑但能放下。

### Decision 8: 阴影模块的"角落预览位置冲突"

阴影模块的角落预览和纹理模块的角落预览都占右下角，但两个模块互斥（一次只显示一个），所以位置不冲突。Hint toast 也在右下角——但 hint 是短暂出现的浮层，会盖在角落预览上方 6 秒后消失。可接受。

或者把角落预览放在左下角，避开 hint。倾向于**左下角**，因为 hint 是右下角。

## Risks / Trade-offs

### Risk 1: shadow map 预览的 texture 引用稳定性
**风险**：Three.js 在 shadow map 尺寸变化时会重建 RenderTarget，`light.shadow.map` 引用变化。
**缓解**：每帧都从 `light.shadow.map?.texture` 取最新引用；如果为 null（首次未渲染），跳过预览。

### Risk 2: PCF radius 与 needsUpdate 的副作用
**风险**：切换 shadowMap.type 会触发所有材质重编译，可能在低端 GPU 上卡顿。
**缓解**：PCF 切换是教学时刻，短暂卡顿可接受。如果实测影响体验，可以预先编译所有变体（多 renderer?），但首版不做。

### Risk 3: Anisotropic 过滤的 GPU 上限
**风险**：不同 GPU 支持的 anisotropy 最大值不同（一般 1-16）。滑杆调到 16 但 GPU 只支持 4 时怎么办？
**缓解**：初始化时读 `renderer.capabilities.getMaxAnisotropy()`，滑杆上限设为该值。HUD 显示"anisotropy = X / max Y"。

### Risk 4: UV 网格密度过高导致线段重叠不可读
**风险**：tiling=8 时 UV 网格 8×8 = 64 格，每格再画 8 条线（0.125 单位）= 64 条线，密集到看不清。
**缓解**：UV 网格步长不缩放（始终 0.125 UV 单位），只让"主网格"（每 1.0 UV 单位）跟着 tiling 走。或者 tiling > 4 时降低网格细分。Phase 3 polish 时调参。

### Trade-off: 不做"用户上传纹理"
**代价**：用户不能用自己的图测试过滤模式。
**收益**：checkerboard 是教学最有效的纹理（结构清晰、容易数格子），用户上传会引入与教学无关的复杂度（文件读取、CORS、尺寸限制）。

### Trade-off: 4 个 Tab 在 1024px 略挤
**代价**：1024px 屏宽下顶部 Tab 紧凑。
**收益**：避免引入"分类下拉"多一次点击的复杂度，所有场景一眼可见。如果实测过挤，Phase 3 polish 改成短文字 + 图标。

# 光学与渲染原理演示器

> Interactive Optics & Shader Explainer — 一个浏览器里跑的教学演示器，让学习者**看见每一层 PBR 渲染贡献**，并**拖动透镜成像的光路**。

## 这是什么？

填一个具体的空白：教材是静态截图（讲不清 Fresnel 边缘反射），DCC 软件（Blender / Unity）是终极合成（看不到单独的 Specular 高光对最终结果的贡献是多少）。本演示器在两者之间——每一层（Diffuse / Specular / Normal Map / Env Reflection）都有独立开关，关闭后立即看到差异。

光学部分同理：薄透镜方程 `1/v − 1/u = 1/f` 是抽象的，但拖动物体看到像点跟着移动、跨过焦点时瞬间从实像切到虚像，是具体的。

## 快速开始

```bash
# 安装依赖（约 105 MB node_modules）
npm install

# 开发服务器
npm run dev
# → 浏览器打开 http://localhost:5173

# 生产构建
npm run build

# 物理模块单元测试（11 个，Node 内置 test runner）
npm test
```

技术栈：Vite + React 18 + TypeScript + Tailwind + Three.js (r165) + Zustand。无后端，纯静态托管。

## 两个模块

### PBR Shader 拆解器

一个球体，四个图层（可独立开关）：

| Layer | 教学要点 | 数学 |
|---|---|---|
| Diffuse | Lambertian 漫反射——基色如何被直接光打亮 | `I = (N·L) · albedo / π` |
| Specular | 高光——可切换 Blinn-Phong（入门）与 GGX/Cook-Torrance（物理正确） | BP: `k_s·(N·H)^n` / GGX: `D·F·G / (4·N·L·N·V)` |
| Normal Map | 法线贴图如何"骗过"光照计算（程序化生成 3 张预设：光滑 / 砖墙 / hammered metal） | `N' = normalize(TBN · (nmap·2−1))` |
| Env Reflection | Fresnel-Schlick 调制的环境反射——球边缘反射强、中心反射弱 | `F = F0 + (1−F0)·(1−N·V)⁵` |

侧边栏底部 HUD 实时显示当前激活层对应的公式。切换 Blinn-Phong ↔ GGX 时，UI 会自动换出 Roughness / Shininess 滑杆。

**HDRI 切换**：默认使用 Three.js 内置的 `RoomEnvironment`（程序化，零下载）。点击侧边栏的 HDRI 列表可下载 5 个预设之一（每个约 1–1.5 MB，来自 threejs.org CDN 和 polyhaven.com，CORS 均开放），首次下载后会缓存到 IndexedDB，二次切换走本地缓存。

### 几何光学沙盒

俯视 2D 视图，光轴水平。可放置：

- **透镜**：双凸 / 平凸 / 双凹 / 平凹（4 种剖面，半透明玻璃质感）
- **物体**：橙色垂直箭头，可直接拖拽改变物距 u
- **光源**：平行光（模拟太阳）或点光源（从箭头尖端发射扇形）
- **光线**：3–21 条可调，黄色高亮，实时根据薄透镜规则折射

实时 HUD 显示：

- 焦距 f、物距 u、像距 v（以 f 为单位，如 `v = +2.0f`）
- 放大率 m（带符号，负号 = 倒立）
- 像类型（实像 / 虚像）、朝向（直立 / 倒立）、尺寸（放大 / 缩小 / 等大）

**教学要点验证**：
- 拖物体经过焦点 → 像距瞬间跳到无穷再切回（实像 ↔ 虚像的标志）
- 切凹透镜 → 平行光经透镜后发散，反向延长线交于异侧焦点
- 拖物体到 `u = 2f` → 像距 `v = 2f`、放大率 `m = -1`（倒立等大）

### 阴影映射拆解

方向光 + 立方体 + 球 + 地面。可调：

- **Shadow Map 分辨率**：256 / 512 / 1024 / 2048
- **Bias**：0 – 0.01（看 shadow acne / peter panning 权衡）
- **PCF 软阴影**：None / 1×1 / 3×3 / 5×5
- **光源 Yaw / Pitch**：低 pitch = 长阴影 + 明显锯齿

画布左下角实时显示 shadow map（光源视角的深度图）。

**教学要点验证**：
- bias = 0 → 物体表面条纹状自阴影（acne）
- bias > 0.008 → 物体与阴影脱离（peter panning）
- PCF None → 5×5 → 硬阴影到软阴影过渡
- 256 → 2048 → 阴影边缘锯齿消失

### 纹理 / UV 教学

倾斜平面 + 程序化 checkerboard 纹理。可调：

- **过滤模式**：Nearest / Linear / Mipmap N / Mipmap L
- **Anisotropic**：1 – 16（GPU 上限自动 clamp）
- **Wrapping**：Repeat / Mirror / Clamp
- **UV Tiling / Offset**
- **Checker 单元数**：2 – 16
- **UV 网格叠加**开关

画布左下角实时显示 2D checker + UV 网格，与 3D 表面对应。

**教学要点验证**：
- Nearest → 像素锯齿；Mipmap Linear → 远处平滑无闪烁
- Anisotropy 1 → 16 → 斜视角远处明显更清晰
- Repeat → Mirror → 相邻 tile 是否翻转
- 开 UV 网格 → 看到 3D 表面与 2D 纹理空间的映射关系

### 几何变换拆解

左侧灰色"鬼影" F 是原始姿态（永不动），右侧亮色 F 实时跟随 T/R/S 滑杆。底部 4×4 矩阵表格显示当前组合矩阵的 16 个元素，变化的单元格高亮。可调：

- **Translate / Rotate / Scale**：每轴独立滑杆
- **乘法顺序**：TRS / TSR / RTS / RST / STR / SRT 六种
- **重置**按钮一键回到单位矩阵

**教学要点验证**：
- 拖 Translate X → 矩阵 m41（最后一列）跟随
- 拖 Rotate Y → 矩阵的 sin/cos 出现在 m11/m13/m31/m33
- Scale X 负值 → 镜像翻转
- 切换 TRS ↔ RTS（T=(1,0,0), Rz=90°）→ 同参数姿态完全不同（矩阵乘法不可交换）

### 色彩管线 / Tone Mapping

6 个不同 albedo（0.05 – 1.0）的球，被高强度光照推入 HDR 范围。可调：

- **Tone Mapping**：None / Reinhard / ACES Filmic
- **Exposure**：-2 ~ +2 stops（光线乘 2^x）
- **Gamma 校正**：开/关（sRGB vs Linear 输出）
- **显示被 clip 的像素**：洋红色覆盖 >1.0 的 HDR 像素

底部 pipeline 摘要实时更新（如 "Linear scene → ACES tonemap → sRGB output ✓"）。

**教学要点验证**：
- tonemap=None + exposure=+1 + 开 clip → 大量洋红色（被烧死的像素）
- 切 ACES → 洋红色消失（高光被柔和压缩）
- 关 gamma → 整体偏暗（典型的"为什么渲染看起来颜色错"）

## 架构

```
src/
├── three/
│   ├── SceneModule.ts          接口：init / update / dispose / onResize
│   ├── SceneManager.ts         拥有 WebGLRenderer + 渲染循环
│   └── RendererCanvas.tsx      React 包装，StrictMode 安全
├── scenes/
│   ├── pbr/                    PBR 模块（分层 shader + 程序化法线贴图）
│   └── optics/                 光学模块（透镜几何 + 光线绘制 + 物体拖拽）
├── physics/
│   ├── optics.ts               纯函数：薄透镜方程 + paraxial 折射
│   └── optics.test.ts          11 个单元测试（Node --test）
├── shared/
│   ├── hdriCatalog.ts          5 个 HDRI 元数据
│   ├── hdriCache.ts            IndexedDB 缓存
│   └── loadHDRI.ts             fetch + 进度 + RGBE + PMREM
├── ui/                         React 控件（Slider / ColorInput / Panel / HUD / Picker / 错误边界）
├── store.ts                    Zustand store（持久化到 localStorage）
├── App.tsx                     顶部 Tab + 模块路由
└── main.tsx
```

**关键设计决策**（详见 `openspec/changes/add-optics-shader-explainer/design.md`）：

1. **不用 @react-three/fiber**，用裸 Three.js + React 薄封装。教学价值优先——学习者读源码能直接看到 `scene.add(mesh)`、`renderer.render()` 这些本质操作。
2. **PBR 分层用单 ShaderMaterial + uniform 开关**，不是多 Mesh 叠加。`MeshStandardMaterial.onBeforeCompile` 注入四个 boolean uniform，每段贡献相乘即可。切换零开销。
3. **物理计算放纯 TS 模块**（`physics/optics.ts`），不耦合 Three.js。可写单元测试，可在 Node 跑。
4. **HDRI 用 IndexedDB 而非 localStorage**——HDRI 文件 1–20 MB 二进制，localStorage 5 MB 配额且 base64 膨胀。
5. **法线贴图程序化生成**——零下载、零外部依赖、教学场景下足够清晰。

## 资源与归属

- **HDRI**：
  - threejs.org examples（pedestrian_overpass, quarry_01）— CC0
  - polyhaven.com（studio_small_08, old_hall, rathaus）— CC0
- **依赖**：Three.js (MIT), React (MIT), Zustand (MIT), Vite (MIT), Tailwind (MIT)
- **代码**：本项目源码可自由使用

## 测试与验收

```bash
npm test      # 11/11 通过（薄透镜方程边界、paraxial 折射规则、凹透镜、焦点奇点）
npm run build # ~640 KB JS / 173 KB gzipped（几乎全是 Three.js）
```

**手动验收清单**：
- [ ] PBR：依次开 Diffuse → Specular → Normal → Env，球体经历 4 个明显视觉阶段
- [ ] PBR：关 Diffuse 后只剩高光与反射；关 Env 后边缘反射消失
- [ ] PBR：切 Blinn-Phong → GGX，高光形态变化、UI 滑杆切换
- [ ] PBR：切 HDRI → 弹出体积确认 → 进度条 → 应用；切走再切回不重新下载（IndexedDB 命中）
- [ ] PBR：DevTools 控制台查看 `renderer.info.memory.textures` 在多次 HDRI 切换后保持稳定
- [ ] 光学：拖物体从 `u = 3f` 到 `u < f`，像距先移向无穷再切到虚像模式
- [ ] 光学：切换凹透镜，平行光经透镜后发散，反向延长线交于异侧焦点
- [ ] 光学：HUD 的 u/v/m 数值与肉眼观察的光路一致
- [ ] 模块切换：PBR ↔ Optics 连续切 10 次，浏览器 DevTools Performance 无内存增长
- [ ] 刷新页面：参数（layer toggles、focal length 等）从 localStorage 恢复

## 教学引导

演示器内建**克制的教学引导层**——默认隐藏，关键时刻出现：

### 一键演示场景（顶部"演示场景 ▾"下拉或"?"按钮内）

每个场景是一段脚本：自动调整参数 + 顶部旁白条说明要点 + 跳过按钮。手动操作任意滑杆会立即中断场景。

**PBR 模块（4 个）**：
- **分层贡献揭示** — 全黑后依次开 4 层，看每一项对最终渲染的贡献
- **看 Fresnel** — 只留 Diffuse + Env，观察球边缘反射比中心强
- **GGX vs Blinn-Phong** — 同参数下两种高光模型对比
- **金属 vs 非金属** — Metalness 0 → 1，看漫反射消失、反射被染色

**光学模块（3 个）**：
- **薄透镜方程验证** — u=2f → v=2f, m=-1 的等大倒立实像
- **实像 → 虚像切换** — 5 步动画跨过焦点，看像距跳到无穷再切到虚像
- **凹透镜发散** — 切凹透镜，平行光经透镜后发散

**阴影模块（4 个）**：
- **Shadow Map 是什么** — 可视化光源视角的深度图
- **Shadow Acne 与 Bias** — bias 0 → 合适 → 过大，看三种状态
- **硬阴影 vs 软阴影** — PCF None → 5×5 渐进
- **分辨率与锯齿** — 256 → 2048 + 低光源角度

**纹理模块（4 个）**：
- **UV 是什么** — 开 UV 网格 + 角落预览，对照 3D 表面与 2D 纹理
- **Nearest / Linear / Mipmap** — 三种过滤模式循环对比
- **Anisotropic 提升** — 1 → 16 看斜视角远处清晰度
- **Wrapping 对比** — Repeat / Mirror / Clamp 在 tiling=4 下

**变换模块（4 个）**：
- **平移 → m41** — Translate X 拖动看矩阵最后一列
- **旋转 → sin/cos** — Rotate Y 到 90° 看矩阵的 sin/cos 出现
- **缩放 → 对角线** — Scale Y 看矩阵对角线变化
- **顺序不可交换** — TRS vs RTS 在 T+R 时姿态完全不同

**色彩模块（4 个）**：
- **为什么需要 Tone Mapping** — 关 tonemap 看高光烧死
- **ACES vs Reinhard** — 两种 tonemap 的视觉差异
- **Exposure 调节** — -2 → +1.5 stops 看光线变化
- **Linear vs sRGB** — 关 gamma 校正看错误输出

### 18 个上下文提示（精准触发，每个用户最多看一次）

走到以下状态时右下角弹 toast：

| 触发条件 | 提示要点 |
|---|---|
| 物体拖到焦点附近 | 看像距 v 趋向无穷，再拖就切到虚像 |
| PBR 4 层全关 | 分层让你看清贡献 |
| Metalness 拉到 1 | 金属：漫反射消失，反射被染色 |
| 首次切到凹透镜 | f < 0，平行光发散 |
| 首次切到 Blinn-Phong | 经典模型，无能量守恒 |
| 阴影 bias ≈ 0 | 看 shadow acne，加 bias 到 0.001 消除 |
| 阴影分辨率 = 256 | 边缘锯齿清晰可见 |
| 阴影光源 pitch < 20° | 长阴影 + perspective aliasing |
| 纹理过滤 = Nearest | 像素锯齿、远处 moiré 闪烁 |
| 纹理过滤 = Mipmap | 远处自动平滑，闪烁消失 |
| 纹理 Anisotropic ≥ 8 | 斜视角远处不被 Mipmap 过度模糊 |
| 纹理 wrapping = Mirror | 相邻 tile 翻转方向 |
| Rotate Y 接近 90° | 矩阵 m11/m13/m31/m33 出现 sin/cos |
| 变换顺序非 TRS | 同 T/R/S 不同顺序 → 不同矩阵 |
| 变换 scale 出现负数 | 负 scale = 镜像翻转 |
| Tone Mapping = None | HDR 像素被 clip 烧死 |
| Exposure > +1.5 | 大量像素进入 HDR 范围 |
| 关 Gamma 校正 | 场景变暗、中间调压缩 |

看过的提示会进 localStorage，刷新后不再弹；可在帮助面板"重置提示"。

### 帮助面板（右上角"?"按钮）

按模块动态显示：核心概念、操作指南、演示场景入口、提示计数与重置。

## 项目规划

本项目用 [OpenSpec](https://github.com/fission-ai/openspec) 规划。规划文档在 `openspec/`：

```
openspec/specs/                          已完成并归档的 capability
├── asset-pipeline/spec.md               HDRI 加载
├── optics-simulation/spec.md            光学沙盒
├── pbr-layer-explainer/spec.md          PBR 分层
└── scene-shell/spec.md                  应用外壳

openspec/changes/
├── archive/2026-08-12-add-optics-shader-explainer/   已归档：PBR + 光学 + HDRI
└── add-guided-learning/                               当前：教学引导层
    ├── proposal.md         动机、目标、Non-goals
    ├── design.md           注意力管理策略 + 6 个关键决策
    ├── tasks.md            4 个 Phase 的实施清单
    └── specs/              3 个 capability（tours / hints / help）
```

实施过程中的一些偏离（已记录在 commit message 中）：
- 法线贴图从"下载/打包"改为**程序化生成**（零下载）
- 公式 HUD 用 Unicode + 等宽字体而非 KaTeX（省 250 KB）
- 单元测试用 Node 内置 `--experimental-strip-types` 而非 vitest（省 50 MB）
- HDRI 实际体积 1–1.5 MB（远小于预估的 5–20 MB）
- 演示场景不动画相机（OrbitControls 是模块私有的），改为设置参数让学习者自己拖

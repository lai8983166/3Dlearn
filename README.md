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

## 项目规划

本项目用 [OpenSpec](https://github.com/fission-ai/openspec) 规划。规划文档在 `openspec/`：

```
openspec/changes/add-optics-shader-explainer/
├── proposal.md         动机、目标、Non-goals
├── design.md           6 个关键架构决策 + 风险/权衡
├── tasks.md            4 个 Phase 的实施清单
└── specs/              4 个 capability 的可验收规格（WHEN/THEN）
```

实施过程中的一些偏离（已记录在 commit message 中）：
- 法线贴图从"下载/打包"改为**程序化生成**（零下载）
- 公式 HUD 用 Unicode + 等宽字体而非 KaTeX（省 250 KB）
- 单元测试用 Node 内置 `--experimental-strip-types` 而非 vitest（省 50 MB）
- HDRI 实际体积 1–1.5 MB（远小于预估的 5–20 MB）

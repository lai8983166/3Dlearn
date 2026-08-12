import type { ModuleId } from '@/store';

/**
 * Static help copy for each module. Rendered by HelpModal in two
 * sections (concept overview + operation guide). Tour entries are
 * attached lazily in Phase 2 when the tour catalog exists.
 */
export interface HelpContent {
  /** Short module title shown at the top of the modal. */
  title: string;
  /** 3–5 sentence concept overview — what this module teaches. */
  concept: string;
  /** 3–4 concrete operation tips. */
  operations: string[];
}

export const HELP_CONTENT: Record<ModuleId, HelpContent> = {
  pbr: {
    title: 'PBR Shader 拆解器',
    concept:
      '一个球体的最终渲染 = Diffuse + Specular + Normal Map 扰动 + Environment Reflection。' +
      '教科书里这些项是公式，编辑器里它们全混在一起。这个模块把它们拆开——' +
      '关掉一项，立即看到这一层对最终结果的贡献消失。理解了每一层做什么，' +
      '再去看 Blender / Unity / Unreal 的材质编辑器就不会迷路。',
    operations: [
      '左侧栏顶部 4 个 layer toggle：分别开关 Diffuse / Specular / Normal / Env。',
      '切 GGX ↔ Blinn-Phong 看高光形态从物理正确的 fallop 变成经典的硬圆形。',
      '调 Metalness = 1 看金属如何"失去漫反射、获得染色反射"。',
      '点击 HDRI 列表换环境贴图（首次会弹体积确认；下载后缓存在 IndexedDB）。',
    ],
  },
  optics: {
    title: '几何光学沙盒',
    concept:
      '薄透镜方程 1/v − 1/u = 1/f 是抽象的，但拖动物体看像点跟着移动、跨过焦点时' +
      '瞬间从实像切到虚像，是具体的。这个模块把光路画出来：每条黄色光线从光源' +
      '出发，在透镜处按薄透镜规则折射（平行光过焦点 / 过光心不偏 / 过焦点平行出射），' +
      '出射光的交点就是像点。',
    operations: [
      '直接拖动橙色物体箭头改变物距 u——像点和光路会实时更新。',
      '切换透镜类型（双凸 / 平凸 / 双凹 / 平凹）看焦距符号变化如何改变成像。',
      'HUD 显示 u / v / m（以 f 为单位）和像类型，与肉眼看到的光路一致。',
      '光源可在平行光与点光源（从箭头尖端发射扇形）之间切换。',
    ],
  },
  shadows: {
    title: '阴影映射拆解',
    concept:
      'Shadow Map 算法两步走：先把场景从光源视角渲染成深度图，再在主相机渲染时' +
      '比较每个片元的深度。比深度图远的片元在阴影里。这套机制的 4 个经典问题——' +
      'acne（自阴影条纹）、peter panning（阴影脱离物体）、锯齿、硬边——都可以' +
      '用 bias、PCF、分辨率三个旋钮调好。本模块让你看到坏掉的样子，再调好。',
    operations: [
      '调 bias = 0 看 shadow acne，缓慢加到 0.001–0.003 让它消失，再继续加看 peter panning。',
      '切换 PCF None ↔ 5×5 看硬阴影到软阴影的过渡。',
      '切换分辨率 256 ↔ 2048 看阴影边缘锯齿的明显程度。',
      '调 Pitch = 15° 看长阴影（傍晚效果），并观察此时锯齿更明显（perspective aliasing）。',
      '画布左下角实时显示 shadow map（光源视角的深度图）。',
    ],
  },
  textures: {
    title: '纹理与 UV',
    concept:
      'UV 坐标把 3D 表面映射到 2D 纹理空间。过滤模式决定采样时如何"混合"相邻像素——' +
      'Nearest 锐利但锯齿、Linear 平滑、Mipmap 让远处不闪烁、Anisotropic 让斜视角' +
      '依然清晰。Wrapping 决定 UV 超出 [0,1] 时的行为。',
    operations: [
      '切换过滤模式 Nearest ↔ Mipmap Linear，相机斜视角看远处——Mipmap 平滑得多。',
      '调 Anisotropic 从 1 → 16，斜视角下远处 checker 明显更清晰。',
      '切 Wrapping Repeat ↔ Mirror 看 tile 朝向是否翻转。',
      '开 UV 网格叠加，对照画布左下角的 2D 纹理 + UV 网格理解 3D 表面到 UV 空间的映射。',
    ],
  },
  transforms: {
    title: '几何变换拆解',
    concept:
      '所有 3D 物体的姿态都由 4×4 齐次坐标矩阵描述。Translate / Rotate / Scale 三种基本变换' +
      '可以组合，但矩阵乘法不可交换——T·R ≠ R·T。左侧灰色 F 是原始姿态的"鬼影"，右侧' +
      '亮色 F 实时反映当前组合的矩阵。把矩阵的 16 个数和物体的姿态对应起来，就理解了' +
      '图形学第一课。',
    operations: [
      '拖 Translate X → 看矩阵最后一列第 1 行（m41）跟随变化',
      '拖 Rotate Y → 看矩阵的 sin/cos 出现在 m11/m13/m31/m33',
      '拖 Scale Y → 看对角线 m22 变化',
      '切换 TRS / RTS 等顺序 → 看同一组参数产生不同矩阵和不同姿态',
      '重置按钮一键回到单位矩阵（原始姿态）',
    ],
  },
  colors: {
    title: '色彩管线 / Tone Mapping',
    concept:
      '真实世界光的强度没有上限（HDR），但显示器只能显示 [0,1]（LDR）。Tone mapping 是' +
      'HDR → LDR 的映射，决定高光怎么压缩、暗部怎么提亮。sRGB / Linear 是色彩空间' +
      '的工作流——错误的色彩空间会让暗部发灰、颜色错位。一次对比演示就懂。',
    operations: [
      '切 Tone Mapping None → ACES → 看高光从"烧死"变成有细节的过渡',
      '调 Exposure +1 / -1 stop → 看光线翻倍/减半（类似相机光圈）',
      '关 Gamma 校正 → 看错误的 Linear 直接输出（整体偏暗、中间调压缩）',
      '开"显示被 clip 的像素" → 洋红色覆盖任何 >1.0 的 HDR 像素，切 ACES 看它们消失',
    ],
  },
};

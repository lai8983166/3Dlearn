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
};

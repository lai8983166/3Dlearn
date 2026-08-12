# pbr-layer-explainer Specification

## Purpose
TBD - created by archiving change add-optics-shader-explainer. Update Purpose after archive.
## Requirements
### Requirement: 分层 PBR 渲染管线

球体 MUST 由四个可独立开关的渲染贡献叠加而成：Diffuse、Specular、Normal Map 扰动、Environment Reflection（Fresnel 调制）。每层 MUST 有一个布尔开关与一组参数；关闭任一层时，球体外观 MUST 立即反映该层贡献为零。

#### Scenario: 全部关闭到全开
- **WHEN** 用户依次打开 Diffuse → Specular → Normal → Env Reflection 四层
- **THEN** 球体外观经历四个明显可辨的视觉阶段（哑光 → 高光 → 表面起伏 → 镜面反射环境）
- **AND** 每一阶段切换在 < 16ms 内完成（不卡帧）

#### Scenario: 仅 Diffuse 开启
- **WHEN** 只有 Diffuse 层开启（其他三层关闭）
- **THEN** 球体呈现纯 Lambertian 漫反射，无任何高光、表面平坦、不反射环境

### Requirement: Diffuse 层参数

Diffuse 层 MUST 暴露：基础颜色（color picker）、亮度倍数（0–2 滑杆，默认 1）。

#### Scenario: 调整颜色
- **WHEN** 用户将基础颜色改为红色 (#ff0000)
- **THEN** 球体在白光照射下呈现红色漫反射

### Requirement: Specular 层参数与模型选择

Specular 层 MUST 支持两种高光模型切换：Blinn-Phong（教学入门）和 GGX（物理正确）。参数 MUST 包括：高光颜色、高光强度（0–5）；Roughness MUST 仅在 GGX 模式下出现（0–1）。

#### Scenario: 切换高光模型
- **WHEN** 用户从 Blinn-Phong 切换到 GGX
- **THEN** 球体高光从硬圆形变为带有 falloff 的新月形分布（同等 Roughness 下视觉差异明显）
- **AND** UI 侧边栏多出 "Roughness" 滑杆

### Requirement: Normal Map 层

Normal Map 层 MUST 允许用户加载预设的三张法线贴图（"光滑"、"砖墙"、"hammered metal"），切换后球体表面光影 MUST 根据法线扰动重新计算。

#### Scenario: 切换法线贴图
- **WHEN** 用户从"光滑"切到"砖墙"法线贴图
- **THEN** 球体表面出现砖墙纹路的凹凸光影
- **AND** 凹凸方向在光照移动时正确反转（光源移动到另一侧时，原本凸起处视觉上变凹陷是不允许的——这是法线一致性检查）

### Requirement: Environment Reflection 与 Fresnel

Env Reflection 层 MUST 使用当前场景的 HDRI 环境贴图作为反射源，反射强度 MUST 由 Fresnel（Schlick 近似）按视角调制：垂直入射（球心）反射弱，掠射角（球边缘）反射强。

#### Scenario: 观察菲涅尔效应
- **WHEN** 用户开启 Env Reflection、关闭 Normal Map，从正面观察球体
- **THEN** 球体边缘明显比中心反射更多环境（边缘可见 HDRI 颜色，中心呈现 Diffuse 基色）

#### Scenario: Metalness 切换
- **WHEN** 用户开启 Metalness = 1.0（金属）
- **THEN** Diffuse 颜色被用作反射色调染色，球体不再有漫反射灰白基色
- **AND** 即使 Diffuse 层"开启"，金属球的漫反射贡献按 Metalness 因子趋近于零

### Requirement: 教学性 HUD 叠加

侧边栏底部 MUST 显示当前激活层的公式（LaTeX 渲染或预截图），如开启 Specular 时 MUST 显示 Blinn-Phong 公式 `k_s (R·V)^α` 或 GGX 的 D_GGX·F·G 项。

#### Scenario: 公式随激活层更新
- **WHEN** 用户切换 Specular 模型从 Blinn-Phong 到 GGX
- **THEN** HUD 中显示的公式从 Blinn-Phong 形式变为 GGX 形式


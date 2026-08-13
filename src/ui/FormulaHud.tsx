import { useAppStore } from '@/store';

/**
 * Active-layer formulas rendered as preformatted Unicode text in a monospace
 * block. We avoid pulling in KaTeX (~250 KB) because the formulas are short
 * and the font-mono rendering reads fine at the sidebar width.
 *
 * Module-aware: the same component renders PBR's per-layer formulas, Depth's
 * depth-distribution formula, Bloom's per-pass formulas, and BRDF's
 * per-sector formulas. The PBR branch is the only one that depends on
 * multiple toggles; the others track a single "active" entity (activePassId
 * / selectedSector / reversedZ).
 */
export function FormulaHud() {
  const activeModule = useAppStore((s) => s.activeModule);

  if (activeModule === 'pbr') return <PbrFormulaHud />;
  if (activeModule === 'depth') return <DepthFormulaHud />;
  if (activeModule === 'bloom') return <BloomFormulaHud />;
  if (activeModule === 'brdf') return <BrdfFormulaHud />;
  return null;
}

function PbrFormulaHud() {
  const { layers, specularModel } = useAppStore((s) => s.pbr);

  return (
    <section>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
        Active Formulas
      </h2>
      <div className="space-y-2">
        {layers.diffuse && <FormulaBlock title="Diffuse (Lambertian)" formula={DIFFUSE} />}
        {layers.specular &&
          (specularModel === 'ggx' ? (
            <FormulaBlock title="Specular (GGX / Cook-Torrance)" formula={GGX} />
          ) : (
            <FormulaBlock title="Specular (Blinn-Phong)" formula={BLINN_PHONG} />
          ))}
        {layers.normal && (
          <FormulaBlock title="Normal Map perturbation" formula={NORMAL_MAP} />
        )}
        {layers.env && (
          <FormulaBlock title="Env Reflection (Fresnel / Schlick)" formula={FRESNEL} />
        )}
        {!layers.diffuse &&
          !layers.specular &&
          !layers.normal &&
          !layers.env && (
            <p className="rounded bg-panel-light px-3 py-3 text-xs text-gray-500">
              All layers disabled — sphere renders with emissive only.
            </p>
          )}
      </div>
    </section>
  );
}

function DepthFormulaHud() {
  const reversedZ = useAppStore((s) => s.depth.reversedZ);
  return (
    <section>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
        Depth Mapping
      </h2>
      <FormulaBlock
        title={reversedZ ? 'Logarithmic Depth (reverse-Z equivalent)' : 'Traditional Z (hyperbolic)'}
        formula={reversedZ ? DEPTH_LOG : DEPTH_TRADITIONAL}
      />
      <p className="mt-2 rounded bg-panel-light px-3 py-2 text-[10px] text-gray-500">
        传统 Z 把 eye-space z 非线性压到 [0,1]，远处精度密集在 0.99 附近——
        所以远距离 z-fighting 比近距离明显得多。Logarithmic depth 让分布近对数，
        远距离精度大幅提升。
      </p>
    </section>
  );
}

function BloomFormulaHud() {
  const activePassId = useAppStore((s) => s.bloom.activePassId);
  const entry = BLOOM_FORMULAS[activePassId];
  return (
    <section>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
        Bloom Pipeline — {entry.title}
      </h2>
      <FormulaBlock title={entry.title} formula={entry.formula} />
      <p className="mt-2 rounded bg-panel-light px-3 py-2 text-[10px] text-gray-500">
        点左侧的 pass 标签切换公式。每个 pass 都可独立 toggle——关掉立即看到它对
        最终结果的贡献消失。
      </p>
    </section>
  );
}

function BrdfFormulaHud() {
  const sector = useAppStore((s) => s.brdf.selectedSector);
  const entry = BRDF_FORMULAS[sector];
  return (
    <section>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
        BRDF — {entry.title}
      </h2>
      <FormulaBlock title={entry.title} formula={entry.formula} />
      <p className="mt-2 rounded bg-panel-light px-3 py-2 text-[10px] text-gray-500">
        点击球的不同扇区切换公式。5 个 BRDF 共享 roughness / albedo / 光源，
        唯一差异是高光与漫反射的模型选择。
      </p>
    </section>
  );
}

function FormulaBlock({ title, formula }: { title: string; formula: string }) {
  return (
    <div className="rounded bg-panel-light px-3 py-2">
      <div className="mb-1 text-[10px] uppercase tracking-wider text-accent-dim">
        {title}
      </div>
      <pre className="overflow-x-auto whitespace-pre font-mono text-[11px] leading-relaxed text-gray-200">
        {formula}
      </pre>
    </div>
  );
}

const DIFFUSE = `I_d = (N · L) · albedo / π

N  surface normal (unit)
L  direction to light (unit)
albedo  base diffuse color`;

const GGX = `I_s = (D · F · G) / (4 · N·L · N·V)

D  = a² / (π · ((N·H)² · (a²−1) + 1)²)   (Trowbridge-Reitz)
F  = F0 + (1 − F0) · (1 − N·V)⁵          (Schlick)
G  = Smith GGX geometry term
a  = roughness²
H  = halfway vector`;

const BLINN_PHONG = `I_s = k_s · (N · H)^shininess

k_s        specular color (intensity-scaled)
H          halfway vector = normalize(L + V)
shininess  surface polish (1–256)`;

const NORMAL_MAP = `N_perturbed = normalize(tangent · (nmap · 2 − 1))

nmap    tangent-space normal RGB
tangent TBN basis (T, B, N)
final normal = mix(N, N_perturbed, uNormalEnabled)`;

const FRESNEL = `I_env = envSample · F(N·V)

F     = F0 + (1 − F0) · (1 − N·V)⁵
F0    = mix(0.04, albedo, metalness)
edge  → N·V ≈ 0   (grazing angle, full reflection)
center → N·V ≈ 1  (F0, faint reflection)`;

const DEPTH_TRADITIONAL = `z_ndc = (f+n)/(f−n) − 2fn/(f−n) · 1/z_eye

z_eye  view-space depth (positive)
n, f   near / far clip planes
z_ndc  ∈ [0, 1] stored in depth buffer

→ Hyperbolic: most precision crammed near z_eye = n,
  far objects share a tiny range near z_ndc = 1.0
  (this is why distant z-fighting is so bad).`;

const DEPTH_LOG = `z_log = log2(z_eye + 1) / log2(f + 1)

Equivalent in effect to reverse-Z: distribute
depth quasi-logarithmically so far objects get
meaningfully distinct z values.

→ Near still wins on precision, but the falloff is
  much gentler — distant z-fighting largely disappears.`;

const BLOOM_FORMULAS: Record<string, { title: string; formula: string }> = {
  scene: {
    title: '1. HDR Scene',
    formula: `color = shade(scene)  ∈ [0, ∞)

Render the original 3D scene to a half-float
render target. Without HDR, light > 1.0 would
be clipped before bright-pass even runs.`,
  },
  bright: {
    title: '2. Bright Pass',
    formula: `lum    = dot(color, vec3(0.2126, 0.7152, 0.0722))
knee   = soft_knee · smoothstep(threshold − knee, threshold + knee, lum)
bright = max(color · knee − threshold, 0)

Extracts the parts of the scene bright enough
to "leak" into surroundings. Soft knee smooths
the threshold edge so it doesn't look binary.`,
  },
  'blurDown': {
    title: '3. Blur Down (pyramid)',
    formula: `down₀ = bright
downₙ = gaussian_filter(downₙ₋₁) at ½ resolution

Each level halves the resolution, so a fixed
kernel covers exponentially more screen space.
5 levels ≈ blur radius ×32 at the top.`,
  },
  'blurUp': {
    title: '4. Blur Up (composite pyramid)',
    formula: `up_N   = upsample(down_N)
upₙ₋₁ = up_N + gaussian(downₙ₋₁)

Bilinear upsample + accumulate. Each level
re-adds the down-pyramid's detail at that
scale, giving a smooth falloff.`,
  },
  'composite': {
    title: '5. Composite + Tonemap',
    formula: `hdr   = scene + strength · up₀
ldr   = ACES(hdr)              (tonemap)
out   = sRGB(ldr)              (gamma)

HDR → LDR is the bridge to the display.
Without ACES, anything >1.0 clips to white.`,
  },
};

const BRDF_FORMULAS: Record<string, { title: string; formula: string }> = {
  lambert: {
    title: 'Lambert (pure diffuse)',
    formula: `f_d = albedo / π

Constant in every direction — no specular
term at all. The baseline model; ignores
roughness entirely.`,
  },
  phong: {
    title: 'Phong (non-conserving)',
    formula: `f_s = k_s · (R · V)^n

R  = reflect(−L, N)
n  = shininess (1–128)

Classic 1975 model. Energy is NOT conserved:
cranking k_s past 1 makes highlights blow out.`,
  },
  'blinn-phong': {
    title: 'Blinn-Phong (halfway)',
    formula: `f_s = k_s · (N · H)^n

H  = normalize(L + V)   (halfway vector)

Same cost as Phong, but the highlight sits
at the correct physical location. Still not
energy-conserving.`,
  },
  ggx: {
    title: 'GGX / Cook-Torrance',
    formula: `f_s = D · F · V / (4 · |N·L| · |N·V|)

D  = α² / (π · ((N·H)²(α²−1)+1)²)
F  = F0 + (1−F0)(1−N·V)⁵
V  = Smith G₂ / (4·N·L·N·V)
α  = roughness²

Microfacet model. Energy-conserving,
has a long "tail" past the highlight peak.`,
  },
  'oren-nayar': {
    title: 'Oren-Nayar (rough diffuse)',
    formula: `f_d = (A + B · s · t · g) / π

A = 1 − 0.5σ²/(σ² + 0.33)
B = 0.45σ²/(σ² + 0.09)
σ  = roughness (radians)
s  = max(N·V, N·L)
t  = sin(angle between L, V in tangent plane)

Treats surface as V-shaped cavities.
At roughness 0 → Lambert; high roughness
flattens the diffuse term dramatically.`,
  },
};

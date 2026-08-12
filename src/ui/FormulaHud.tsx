import { useAppStore } from '@/store';

/**
 * Active-layer formulas rendered as preformatted Unicode text in a monospace
 * block. We avoid pulling in KaTeX (~250 KB) because the formulas are short
 * and the font-mono rendering reads fine at the sidebar width.
 *
 * Only formulas for currently-enabled layers are shown, so the HUD doubles
 * as a "what's contributing right now" summary.
 */
export function FormulaHud() {
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

import * as THREE from 'three';
import type { SpecularModel } from '@/store';

/**
 * Uniforms that gate each PBR layer. Stored on the material's userData
 * so callers (the scene module) can update them from the Zustand store
 * without keeping a separate reference book.
 */
export interface LayerUniforms {
  uDiffuseEnabled: THREE.IUniform;
  uSpecularEnabled: THREE.IUniform;
  uNormalEnabled: THREE.IUniform;
  uEnvEnabled: THREE.IUniform;
}

/**
 * Build a layered material by patching Three.js's built-in physical material.
 *
 * Each layer is gated by a float uniform (0 or 1):
 *   - uDiffuseEnabled   → gates reflectedLight.directDiffuse + indirectDiffuse
 *   - uSpecularEnabled  → gates reflectedLight.directSpecular (light highlights)
 *   - uEnvEnabled       → gates reflectedLight.indirectSpecular (env reflections)
 *   - uNormalEnabled    → mixes between unperturbed and normal-mapped normal
 *
 * For Blinn-Phong mode we swap to MeshPhongMaterial (which uses the classic
 * Blinn-Phong BRDF). Both materials receive the same patch so the layer
 * toggles behave identically.
 */
export function createLayeredMaterial(model: SpecularModel): THREE.Material {
  const base =
    model === 'ggx'
      ? new THREE.MeshStandardMaterial({
          color: '#b0b0b0',
          roughness: 0.4,
          metalness: 0.0,
          envMapIntensity: 1.0,
        })
      : new THREE.MeshPhongMaterial({
          color: '#b0b0b0',
          shininess: 80,
          specular: '#ffffff',
        });

  const uniforms: LayerUniforms = {
    uDiffuseEnabled: { value: 1 },
    uSpecularEnabled: { value: 1 },
    uNormalEnabled: { value: 0 },
    uEnvEnabled: { value: 1 },
  };

  base.userData.layerUniforms = uniforms;
  base.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);

    shader.fragmentShader = shader.fragmentShader.replace(
      'void main() {',
      `
      uniform float uDiffuseEnabled;
      uniform float uSpecularEnabled;
      uniform float uNormalEnabled;
      uniform float uEnvEnabled;
      void main() {
      `,
    );

    // Save the unperturbed normal, then mix toward perturbed only when enabled.
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <normal_fragment_maps>',
      `
      vec3 layerUnperturbedNormal = normal;
      #include <normal_fragment_maps>
      normal = mix(layerUnperturbedNormal, normal, uNormalEnabled);
      `,
    );

    // After light accumulation, gate each contribution.
    // For MeshStandardMaterial: reflectedLight has direct/indirect diffuse/specular.
    // For MeshPhongMaterial: same struct, but indirectSpecular comes from env_map_fragment.
    // Both populate reflectedLight before <lights_fragment_end> finishes.
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <lights_fragment_end>',
      `
      #include <lights_fragment_end>
      reflectedLight.directDiffuse *= uDiffuseEnabled;
      reflectedLight.indirectDiffuse *= uDiffuseEnabled;
      reflectedLight.directSpecular *= uSpecularEnabled;
      reflectedLight.indirectSpecular *= uEnvEnabled;
      `,
    );
  };

  // Ensure the material recompiles when env map is assigned later.
  base.needsUpdate = true;
  return base;
}

/**
 * Push the current layer-state + specular-model-independent params
 * (color, roughness, metalness, shininess, etc.) into the material.
 */
export function applyMaterialParams(
  material: THREE.Material,
  params: {
    diffuseColor: string;
    diffuseIntensity: number;
    specularColor: string;
    specularIntensity: number;
    roughness: number;
    metalness: number;
    shininess: number;
    layers: { diffuse: boolean; specular: boolean; normal: boolean; env: boolean };
  },
) {
  const uniforms = material.userData.layerUniforms as LayerUniforms | undefined;
  if (uniforms) {
    uniforms.uDiffuseEnabled.value = params.layers.diffuse ? 1 : 0;
    uniforms.uSpecularEnabled.value = params.layers.specular ? 1 : 0;
    uniforms.uNormalEnabled.value = params.layers.normal ? 1 : 0;
    uniforms.uEnvEnabled.value = params.layers.env ? 1 : 0;
  }

  const diffuse = new THREE.Color(params.diffuseColor).multiplyScalar(
    params.diffuseIntensity,
  );

  if (material instanceof THREE.MeshStandardMaterial) {
    material.color = diffuse;
    material.roughness = params.roughness;
    material.metalness = params.metalness;
    // Approximate specular-intensity for GGX by scaling envMapIntensity and
    // a separate FCEXT uniform is out of scope; we lean on roughness + light
    // intensity for visual differentiation.
  } else if (material instanceof THREE.MeshPhongMaterial) {
    material.color = diffuse;
    material.specular = new THREE.Color(params.specularColor).multiplyScalar(
      params.specularIntensity,
    );
    material.shininess = params.shininess;
  }
}

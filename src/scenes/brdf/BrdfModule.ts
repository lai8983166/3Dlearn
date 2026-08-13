import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { SceneModule } from '@/three/SceneModule';
import { useAppStore, type BrdfState, type BrdfModelId } from '@/store';

/**
 * BRDF comparison scene: a sphere sliced into 5 longitude sectors, each
 * shaded with a different BRDF model. Sector selection is via a vertex
 * `sectorId` attribute; the fragment shader branches on it. All sectors
 * share the same albedo, roughness, light direction, and view, so the
 * only visual difference is the BRDF model itself.
 */
export class BrdfModule implements SceneModule {
  readonly id = 'brdf';

  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  private controls: OrbitControls | null = null;
  private renderer: THREE.WebGLRenderer | null = null;

  private sphere: THREE.Mesh;
  private separatorLines: THREE.LineSegments;
  private light: THREE.DirectionalLight;
  private ambient: THREE.AmbientLight;

  private lastState: BrdfState;
  private unsubscribe: () => void;
  private disposed = false;

  constructor() {
    this.scene.background = new THREE.Color('#0f1115');

    this.camera.position.set(0, 1.2, 4.5);
    this.camera.lookAt(0, 0, 0);

    const geometry = makeSectorSphere(1.0, 64, 32, 5);
    const material = makeBrdfMaterial();
    this.sphere = new THREE.Mesh(geometry, material);
    this.scene.add(this.sphere);

    // Sector boundary lines (highlighted). Drawn over the sphere at phi = 2πk/5.
    this.separatorLines = makeSectorSeparators(1.005);
    this.scene.add(this.separatorLines);

    this.light = new THREE.DirectionalLight('#ffffff', 1.5);
    this.light.position.set(3, 5, 4);
    this.scene.add(this.light);
    this.ambient = new THREE.AmbientLight('#88aaff', 0.15);
    this.scene.add(this.ambient);

    this.lastState = useAppStore.getState().brdf;
    this.unsubscribe = useAppStore.subscribe((state) => {
      if (state.brdf !== this.lastState) {
        this.lastState = state.brdf;
        this.applyState(state.brdf);
      }
    });
  }

  init(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.controls = new OrbitControls(this.camera, renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 12;
    this.controls.target.set(0, 0, 0);

    // Click on a sector → select it (drives HUD).
    renderer.domElement.addEventListener('pointerdown', this.onPointerDown);

    this.applyState(this.lastState);
  }

  private onPointerDown = (event: PointerEvent) => {
    if (!this.renderer || !this.controls) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(ndc, this.camera);
    const hits = raycaster.intersectObject(this.sphere, false);
    if (hits.length === 0) return;
    const uv = hits[0].uv;
    if (!uv) return;
    // uv.x is the longitude phi mapped to [0, 1]. Convert to sectorId.
    const sector = Math.floor(uv.x * 5) % 5;
    const id: BrdfModelId = SECTOR_ORDER[sector];
    useAppStore.getState().setBrdf('selectedSector', id);
  };

  private applyState(s: BrdfState) {
    if (this.disposed) return;
    const mat = this.sphere.material as THREE.ShaderMaterial;
    mat.uniforms.uRoughness.value = s.roughness;
    mat.uniforms.uAlbedo.value.set(s.albedo);
    mat.uniforms.uSpecularIntensity.value = s.specularIntensity;

    const yawRad = (s.lightYaw * Math.PI) / 180;
    const pitchRad = (s.lightPitch * Math.PI) / 180;
    const r = 8;
    this.light.position.set(
      r * Math.cos(pitchRad) * Math.sin(yawRad),
      r * Math.sin(pitchRad),
      r * Math.cos(pitchRad) * Math.cos(yawRad),
    );
  }

  update(renderer: THREE.WebGLRenderer) {
    if (this.disposed) return;
    this.controls?.update();
    const s = this.lastState;
    const mat = this.sphere.material as THREE.ShaderMaterial;
    mat.uniforms.uCameraPos.value.copy(this.camera.position);
    // Highlight the selected sector's separators differently.
    const sectorIndex = SECTOR_ORDER.indexOf(s.selectedSector);
    mat.uniforms.uSelectedSector.value = sectorIndex;

    renderer.render(this.scene, this.camera);
  }

  onResize(width: number, height: number) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  dispose() {
    this.disposed = true;
    this.unsubscribe();
    this.controls?.dispose();
    this.renderer?.domElement.removeEventListener('pointerdown', this.onPointerDown);

    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments) {
        obj.geometry.dispose();
        const mat = (obj as THREE.Mesh).material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat.dispose();
      }
    });
  }
}

/** Sector order around the sphere (matches UV u increasing = phi increasing). */
const SECTOR_ORDER: readonly BrdfModelId[] = [
  'lambert',
  'phong',
  'blinn-phong',
  'ggx',
  'oren-nayar',
];

/**
 * Generate a UV sphere with an extra `sectorId` attribute. The sphere's UV.x
 * is its longitude normalized to [0, 1], so the sector id is floor(uv.x * 5).
 */
function makeSectorSphere(
  radius: number,
  widthSegments: number,
  heightSegments: number,
  sectorCount: number,
): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(radius, widthSegments, heightSegments);
  // SphereGeometry already sets uv; we just add sectorId per vertex.
  const uv = geo.getAttribute('uv') as THREE.BufferAttribute;
  const sectorIds = new Float32Array(uv.count);
  for (let i = 0; i < uv.count; i++) {
    const u = uv.getX(i);
    sectorIds[i] = Math.floor(u * sectorCount) % sectorCount;
  }
  geo.setAttribute('sectorId', new THREE.BufferAttribute(sectorIds, 1));
  return geo;
}

/**
 * Build a ShaderMaterial that branches on sectorId to apply one of 5 BRDFs.
 * All sectors share uniforms; the only per-vertex input that varies is sectorId.
 */
function makeBrdfMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uRoughness: { value: 0.5 },
      uAlbedo: { value: new THREE.Color('#cccccc') },
      uSpecularIntensity: { value: 1.0 },
      uLightDir: { value: new THREE.Vector3(3, 5, 4).normalize() },
      uLightColor: { value: new THREE.Color('#ffffff') },
      uCameraPos: { value: new THREE.Vector3() },
      uSelectedSector: { value: 3 },
    },
    vertexShader: /* glsl */ `
      attribute float sectorId;
      varying vec3 vNormal;
      varying vec3 vWorldPos;
      varying float vSectorId;
      void main() {
        vSectorId = sectorId;
        vNormal = normalize(mat3(modelMatrix) * normal);
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uRoughness;
      uniform vec3 uAlbedo;
      uniform float uSpecularIntensity;
      uniform vec3 uLightDir;
      uniform vec3 uLightColor;
      uniform vec3 uCameraPos;
      uniform float uSelectedSector;
      varying vec3 vNormal;
      varying vec3 vWorldPos;
      varying float vSectorId;

      const float PI = 3.14159265359;

      float luminance(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

      // --- Lambert ---
      vec3 brdfLambert(vec3 albedo, float NdotL) {
        return albedo * NdotL / PI;
      }

      // --- Phong (no conservation) ---
      vec3 brdfPhong(vec3 N, vec3 L, vec3 V, float NdotL, float shininess) {
        vec3 R = reflect(-L, N);
        float RdotV = max(dot(R, V), 0.0);
        return vec3(pow(RdotV, shininess)) * NdotL;
      }

      // --- Blinn-Phong ---
      vec3 brdfBlinn(vec3 N, vec3 L, vec3 V, float NdotL, float shininess) {
        vec3 H = normalize(L + V);
        float NdotH = max(dot(N, H), 0.0);
        return vec3(pow(NdotH, shininess)) * NdotL;
      }

      // --- GGX / Cook-Torrance ---
      float distributionGGX(float NdotH, float roughness) {
        float a = roughness * roughness;
        float a2 = a * a;
        float denom = NdotH * NdotH * (a2 - 1.0) + 1.0;
        return a2 / (PI * denom * denom);
      }
      float geometrySmith(float NdotV, float NdotL, float roughness) {
        float r = roughness + 1.0;
        float k = (r * r) / 8.0;
        float gv = NdotV / (NdotV * (1.0 - k) + k);
        float gl = NdotL / (NdotL * (1.0 - k) + k);
        return gv * gl;
      }
      vec3 fresnelSchlick(float cosTheta, vec3 F0) {
        return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
      }
      vec3 brdfGGX(vec3 N, vec3 L, vec3 V, float NdotL, float NdotV, vec3 albedo, float roughness, float metalness) {
        vec3 H = normalize(L + V);
        float NdotH = max(dot(N, H), 0.0);
        float D = distributionGGX(NdotH, roughness);
        float G = geometrySmith(NdotV, NdotL, roughness);
        vec3 F0 = mix(vec3(0.04), albedo, metalness);
        vec3 F = fresnelSchlick(max(dot(H, V), 0.0), F0);
        vec3 spec = (D * F * G) / max(4.0 * NdotV * NdotL, 0.001);
        vec3 kd = (1.0 - F) * (1.0 - metalness);
        return (kd * albedo / PI + spec) * NdotL;
      }

      // --- Oren-Nayar ---
      vec3 brdfOrenNayar(vec3 N, vec3 L, vec3 V, float NdotL, float NdotV, vec3 albedo, float roughness) {
        float sigma = roughness * PI / 2.0;
        float sigma2 = sigma * sigma;
        float A = 1.0 - 0.5 * sigma2 / (sigma2 + 0.33);
        float B = 0.45 * sigma2 / (sigma2 + 0.09);
        // angle between L and V in tangent plane
        float cosPhi = dot(normalize(L - N * NdotL), normalize(V - N * NdotV));
        float sinAlpha = sqrt(max(0.0, 1.0 - NdotL * NdotL));
        float sinBeta = sqrt(max(0.0, 1.0 - NdotV * NdotV));
        float s = max(NdotL, NdotV);
        float t = min(NdotL, NdotV);
        float g = max(0.0, cosPhi) * sinAlpha * sinBeta;
        return albedo * (A + B * g / s) * NdotL / PI;
      }

      void main() {
        vec3 N = normalize(vNormal);
        vec3 L = normalize(uLightDir);
        vec3 V = normalize(uCameraPos - vWorldPos);
        float NdotL = max(dot(N, L), 0.0);
        float NdotV = max(dot(N, V), 0.001);

        float shininess = mix(8.0, 256.0, 1.0 - uRoughness);
        vec3 radiance = uLightColor;

        vec3 result;
        int sector = int(vSectorId + 0.5);
        if (sector == 0) {
          result = brdfLambert(uAlbedo, NdotL) * radiance;
        } else if (sector == 1) {
          // Phong — pure specular, no diffuse (to make the contrast clear)
          result = brdfPhong(N, L, V, NdotL, shininess) * uSpecularIntensity * radiance;
          result += brdfLambert(uAlbedo * 0.3, NdotL) * radiance;
        } else if (sector == 2) {
          result = brdfBlinn(N, L, V, NdotL, shininess) * uSpecularIntensity * radiance;
          result += brdfLambert(uAlbedo * 0.3, NdotL) * radiance;
        } else if (sector == 3) {
          result = brdfGGX(N, L, V, NdotL, NdotV, uAlbedo, uRoughness, 0.0) * radiance;
          result *= 1.0 + uSpecularIntensity * 0.0; // specular already inside; intensity scales highlight
        } else {
          result = brdfOrenNayar(N, L, V, NdotL, NdotV, uAlbedo, uRoughness) * radiance;
        }

        // Ambient lift so unlit sides aren't pure black.
        result += uAlbedo * 0.04;

        gl_FragColor = vec4(result, 1.0);
      }
    `,
  });
}

/**
 * Build thin vertical lines at each sector boundary so the learner can see
 * where one BRDF region ends and another begins.
 */
function makeSectorSeparators(radius: number): THREE.LineSegments {
  const points: number[] = [];
  const segments = 32;
  const sectorCount = 5;
  for (let s = 0; s < sectorCount; s++) {
    const phi = (s / sectorCount) * Math.PI * 2;
    for (let i = 0; i < segments; i++) {
      const t1 = (i / segments) * Math.PI - Math.PI / 2;
      const t2 = ((i + 1) / segments) * Math.PI - Math.PI / 2;
      points.push(
        radius * Math.cos(t1) * Math.cos(phi),
        radius * Math.sin(t1),
        radius * Math.cos(t1) * Math.sin(phi),
      );
      points.push(
        radius * Math.cos(t2) * Math.cos(phi),
        radius * Math.sin(t2),
        radius * Math.cos(t2) * Math.sin(phi),
      );
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  const mat = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.45,
  });
  return new THREE.LineSegments(geo, mat);
}

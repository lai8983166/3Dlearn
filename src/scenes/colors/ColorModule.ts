import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { SceneModule } from '@/three/SceneModule';
import {
  useAppStore,
  type ColorsState,
  type ToneMappingType,
} from '@/store';

const ALBEDOS: readonly number[] = [0.05, 0.1, 0.2, 0.4, 0.7, 1.0];
const SPHERE_RADIUS = 0.65;
const SPACING = 1.8;

const TONEMAP_MAP: Record<ToneMappingType, THREE.ToneMapping> = {
  none: THREE.NoToneMapping,
  reinhard: THREE.ReinhardToneMapping,
  aces: THREE.ACESFilmicToneMapping,
};

interface Sphere {
  mesh: THREE.Mesh;
  material: THREE.MeshStandardMaterial;
}

/**
 * Color-pipeline explainer. A row of six spheres with albedos 0.05 → 1.0
 * lit by a strong key light, so the brightest highlights push into the
 * HDR range (>1.0 pre-tonemap). The renderer's tone mapping, exposure,
 * and output colour space are store-driven; a fragment-shader patch
 * (uniform-gated) tints "would-be-clipped" pixels magenta so the
 * learner sees exactly which fragments the tonemap is rescuing.
 */
export class ColorModule implements SceneModule {
  readonly id = 'colors';

  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  private controls: OrbitControls | null = null;
  private renderer: THREE.WebGLRenderer | null = null;

  private spheres: Sphere[] = [];
  private keyLight: THREE.DirectionalLight;
  private ground: THREE.Mesh;

  private lastState: ColorsState;
  private unsubscribe: () => void;
  private disposed = false;

  constructor() {
    this.scene.background = new THREE.Color('#0f1115');

    this.camera.position.set(0, 1.8, 8);
    this.camera.lookAt(0, 0, 0);

    // Spheres.
    const startX = (-(ALBEDOS.length - 1) * SPACING) / 2;
    ALBEDOS.forEach((albedo, i) => {
      const color = new THREE.Color(albedo, albedo, albedo);
      const material = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.35,
        metalness: 0.0,
      });
      applyClipPatch(material);
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(SPHERE_RADIUS, 48, 48),
        material,
      );
      mesh.position.set(startX + i * SPACING, 0, 0);
      this.scene.add(mesh);
      this.spheres.push({ mesh, material });
    });

    // Strong key light from upper-right-front to drive highlights > 1.0.
    this.keyLight = new THREE.DirectionalLight('#ffffff', 3.5);
    this.keyLight.position.set(4, 5, 4);
    this.scene.add(this.keyLight);

    // Soft fill so unlit hemispheres aren't pure black.
    const fill = new THREE.DirectionalLight('#aabbff', 0.5);
    fill.position.set(-3, 1, 2);
    this.scene.add(fill);
    this.scene.add(new THREE.AmbientLight('#ffffff', 0.05));

    // Ground plane to catch a subtle shadow of the spheres.
    const groundMat = new THREE.MeshStandardMaterial({
      color: '#202430',
      roughness: 0.95,
      metalness: 0.0,
    });
    this.ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), groundMat);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.y = -SPHERE_RADIUS - 0.01;
    this.scene.add(this.ground);

    this.lastState = useAppStore.getState().colors;
    this.unsubscribe = useAppStore.subscribe((state) => {
      if (state.colors !== this.lastState) {
        this.lastState = state.colors;
        this.applyState(state.colors);
      }
    });
  }

  init(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer;
    this.controls = new OrbitControls(this.camera, renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 4;
    this.controls.maxDistance = 25;
    this.controls.target.set(0, 0, 0);

    this.applyState(this.lastState);
  }

  private applyState(s: ColorsState) {
    if (this.disposed || !this.renderer) return;

    const desiredTonemap = TONEMAP_MAP[s.toneMapping];
    const desiredColorSpace = s.gammaCorrect
      ? THREE.SRGBColorSpace
      : THREE.LinearSRGBColorSpace;

    const tonemapChanged = this.renderer.toneMapping !== desiredTonemap;
    const colorSpaceChanged = this.renderer.outputColorSpace !== desiredColorSpace;

    this.renderer.toneMapping = desiredTonemap;
    this.renderer.toneMappingExposure = Math.pow(2, s.exposure);
    this.renderer.outputColorSpace = desiredColorSpace;

    if (tonemapChanged || colorSpaceChanged) {
      // Tone mapping and output colour space both compile into the
      // shader via #define — recompile materials to pick up the change.
      this.scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) obj.material.needsUpdate = true;
      });
    }

    // Toggle clip-overlay uniform.
    const value = s.showClipping ? 1 : 0;
    for (const { material } of this.spheres) {
      const u = material.userData.clipUniform as THREE.IUniform<number> | undefined;
      if (u) u.value = value;
    }
  }

  update(renderer: THREE.WebGLRenderer) {
    if (this.disposed) return;
    this.controls?.update();
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

    if (this.renderer) {
      // Reset to module-neutral defaults so the next module starts clean.
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.0;
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    }

    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
  }
}

/**
 * Patch a MeshStandardMaterial so that fragments whose pre-tonemap
 * linear colour exceeds 1.0 (i.e. would be clipped at output) are
 * tinted magenta. The patch is gated by a `uShowClipping` uniform
 * stored on `material.userData.clipUniform` so the caller can toggle
 * it at runtime without recompiling.
 *
 * We capture `outgoingLight` (the pre-tonemap linear HDR value) just
 * before the `<tonemapping_fragment>` include runs, then check the
 * captured value after the include and override gl_FragColor.
 */
function applyClipPatch(material: THREE.MeshStandardMaterial) {
  const uniform: THREE.IUniform<number> = { value: 0 };
  material.userData.clipUniform = uniform;

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uShowClipping = uniform;

    shader.fragmentShader = shader.fragmentShader.replace(
      'void main() {',
      `uniform float uShowClipping;
       void main() {`,
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <tonemapping_fragment>',
      `vec3 cPreTonemapLight = outgoingLight;
       #include <tonemapping_fragment>
       if (uShowClipping > 0.5) {
         bool overExposed =
           cPreTonemapLight.r > 1.0 ||
           cPreTonemapLight.g > 1.0 ||
           cPreTonemapLight.b > 1.0;
         if (overExposed) {
           gl_FragColor.rgb = vec3(1.0, 0.0, 1.0);
         }
       }`,
    );
  };
  material.needsUpdate = true;
}

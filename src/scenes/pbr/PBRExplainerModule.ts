import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { SceneModule } from '@/three/SceneModule';
import { createLayeredMaterial, applyMaterialParams } from './createLayeredMaterial';
import { getNormalMap, disposeNormalMaps } from './proceduralNormalMaps';
import { loadHDRI } from '@/shared/loadHDRI';
import { useAppStore, type PbrState } from '@/store';

/**
 * The PBR Shader Explainer scene: a single sphere on a neutral background,
 * lit by a key + fill directional light, with RoomEnvironment used as the
 * default IBL source. The sphere's material is patched to expose four
 * layer toggles. The user can swap in a downloaded HDRI via the picker UI.
 */
export class PBRExplainerModule implements SceneModule {
  readonly id = 'pbr';
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  private controls: OrbitControls | null = null;
  private sphere: THREE.Mesh<THREE.BufferGeometry, THREE.Material>;
  private pmremGenerator: THREE.PMREMGenerator;
  private envTexture: THREE.Texture;
  private unsubscribe: () => void;
  private lastPbr: PbrState;
  /** Bumped on every swap to cancel stale in-flight loads. */
  private loadGeneration = 0;
  /** Set true on dispose() so async load callbacks can bail out cleanly. */
  private disposed = false;

  constructor() {
    this.camera.position.set(0, 0, 4);

    this.scene.background = new THREE.Color('#0f1115');

    // PMREM generator lives for the module's lifetime so we can reuse it
    // for HDRI swaps. The RoomEnvironment default is built from a temp
    // renderer-independent scene; subsequent fromEquirectangular calls
    // need the actual renderer (passed via init()).
    const tmpRenderer = new THREE.WebGLRenderer();
    this.pmremGenerator = new THREE.PMREMGenerator(tmpRenderer);
    this.envTexture = this.pmremGenerator.fromScene(
      new RoomEnvironment(),
      0.04,
    ).texture;
    tmpRenderer.dispose();
    this.scene.environment = this.envTexture;

    // Sphere with layered material.
    const geometry = new THREE.SphereGeometry(1, 64, 64);
    const initial = useAppStore.getState().pbr;
    this.lastPbr = initial;
    const material = createLayeredMaterial(initial.specularModel);
    this.sphere = new THREE.Mesh(geometry, material);
    this.scene.add(this.sphere);

    // Lighting — three-point setup so layer differences read clearly even
    // before the user enables HDRI reflections.
    const key = new THREE.DirectionalLight('#ffffff', 2.0);
    key.position.set(3, 3, 4);
    this.scene.add(key);

    const fill = new THREE.DirectionalLight('#88aaff', 0.6);
    fill.position.set(-3, -1, 2);
    this.scene.add(fill);

    const rim = new THREE.DirectionalLight('#ffaa66', 0.8);
    rim.position.set(0, 2, -3);
    this.scene.add(rim);

    this.scene.add(new THREE.AmbientLight('#ffffff', 0.05));

    // Ground reference disc.
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(3, 64),
      new THREE.MeshBasicMaterial({
        color: '#1a1d24',
        transparent: true,
        opacity: 0.6,
      }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.05;
    this.scene.add(ground);

    this.unsubscribe = useAppStore.subscribe((state) => {
      if (state.pbr === this.lastPbr) return;
      const hdriChanged = state.pbr.hdriId !== this.lastPbr.hdriId;
      this.lastPbr = state.pbr;
      if (hdriChanged) {
        void this.swapHdri(state.pbr.hdriId);
      }
      this.applyState(state.pbr);
    });
    this.applyState(initial);
  }

  /**
   * Swap the scene's environment map to the requested HDRI id, or back to
   * the procedural RoomEnvironment when id is null. Disposes the previous
   * env texture after the swap so GPU memory stays flat across repeated
   * switches.
   */
  private async swapHdri(id: string | null) {
    const gen = ++this.loadGeneration;

    if (id === null) {
      const oldEnv = this.envTexture;
      this.envTexture = this.pmremGenerator.fromScene(
        new RoomEnvironment(),
        0.04,
      ).texture;
      this.scene.environment = this.envTexture;
      oldEnv.dispose();
      this.logTextureCount('reverted to RoomEnvironment');
      useAppStore.getState().setHdriStatus({ state: 'idle' });
      return;
    }

    useAppStore.getState().setHdriStatus({
      state: 'loading',
      id,
      receivedBytes: 0,
      totalBytes: 0,
    });

    try {
      const { envTexture } = await loadHDRI(id, this.pmremGenerator, (p) => {
        if (gen !== this.loadGeneration || this.disposed) return;
        useAppStore.getState().setHdriStatus({
          state: 'loading',
          id,
          receivedBytes: p.receivedBytes,
          totalBytes: p.totalBytes,
        });
      });

      if (gen !== this.loadGeneration || this.disposed) {
        envTexture.dispose();
        return;
      }

      const oldEnv = this.envTexture;
      this.envTexture = envTexture;
      this.scene.environment = this.envTexture;
      oldEnv.dispose();
      this.logTextureCount(`swapped to ${id}`);
      useAppStore.getState().setHdriStatus({ state: 'ready', id });
    } catch (err) {
      if (gen !== this.loadGeneration || this.disposed) return;
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`[pbr] HDRI load failed for ${id}:`, message);
      useAppStore.getState().setHdriStatus({ state: 'error', id, message });
      useAppStore.getState().setPbr('hdriId', null);
    }
  }

  /**
   * Dev-only diagnostic: surface the renderer's texture-memory counter so
   * we can verify that repeated HDRI swaps don't leak. In production this
   * is a no-op.
   */
  private logTextureCount(label: string) {
    if (!import.meta.env.DEV) return;
    const textures = this.lastRendererInfo?.info.memory.textures;
    console.log(
      `[pbr] env ${label} · renderer.info.memory.textures = ${
        textures ?? '(no renderer yet)'
      }`,
    );
  }
  private lastRendererInfo: THREE.WebGLRenderer | null = null;

  private applyState(pbr: PbrState) {
    const material = this.sphere.material;
    const currentModel =
      material instanceof THREE.MeshStandardMaterial
        ? 'ggx'
        : material instanceof THREE.MeshPhongMaterial
        ? 'blinn-phong'
        : null;
    if (currentModel !== pbr.specularModel) {
      material.dispose();
      this.sphere.material = createLayeredMaterial(pbr.specularModel);
    }

    const normalMap = getNormalMap(pbr.normalMapPreset);
    const mat = this.sphere.material as THREE.MeshStandardMaterial;
    if (mat.normalMap !== normalMap) {
      mat.normalMap = normalMap;
      mat.normalScale = new THREE.Vector2(1, 1);
      mat.needsUpdate = true;
    }

    applyMaterialParams(this.sphere.material, {
      diffuseColor: pbr.diffuseColor,
      diffuseIntensity: pbr.diffuseIntensity,
      specularColor: pbr.specularColor,
      specularIntensity: pbr.specularIntensity,
      roughness: pbr.roughness,
      metalness: pbr.metalness,
      shininess: pbr.shininess,
      layers: pbr.layers,
    });

    this.sphere.material.needsUpdate = true;
  }

  init(renderer: THREE.WebGLRenderer) {
    this.lastRendererInfo = renderer;
    this.controls = new OrbitControls(this.camera, renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 10;
  }

  update(renderer: THREE.WebGLRenderer) {
    this.controls?.update();
    renderer.render(this.scene, this.camera);
  }

  onResize(width: number, height: number) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  dispose() {
    // Cancel any in-flight load by bumping the generation; the await will
    // resolve but its result will be discarded.
    this.disposed = true;
    this.loadGeneration++;
    this.unsubscribe();
    this.controls?.dispose();
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
    disposeNormalMaps();
    this.envTexture.dispose();
    this.pmremGenerator.dispose();
  }
}

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { SceneModule } from '@/three/SceneModule';
import { useAppStore, type DepthState, type DepthFuncType } from '@/store';
import { drawCornerQuad } from '@/three/cornerPreview';

const DEPTH_FUNC_MAP: Record<DepthFuncType, THREE.DepthModes> = {
  less: THREE.LessDepth,
  equal: THREE.EqualDepth,
  always: THREE.AlwaysDepth,
};

/**
 * Depth-buffer explainer scene. Two near-coplanar triangles demonstrate
 * z-fighting; cube + sphere give context. Depth visualisation renders
 * the scene a second time with MeshDepthMaterial into a render target
 * that the corner preview displays.
 *
 * The logarithmic-depth "reverse-Z equivalent" is implemented via
 * gl_FragDepth injection through onBeforeCompile — three.js has no
 * first-class reverse-Z switch.
 */
export class DepthModule implements SceneModule {
  readonly id = 'depth';

  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  private controls: OrbitControls | null = null;

  private triRed: THREE.Mesh;
  private triGreen: THREE.Mesh;
  private cube: THREE.Mesh;
  private sphere: THREE.Mesh;
  private ground: THREE.Mesh;

  private depthTarget: THREE.WebGLRenderTarget | null = null;
  private depthMaterial: THREE.MeshDepthMaterial;

  /** All meshes that share depthFunc/depthWrite changes. */
  private meshList: THREE.Mesh[] = [];

  private lastState: DepthState;
  private unsubscribe: () => void;
  private disposed = false;

  constructor() {
    this.scene.background = new THREE.Color('#0f1115');

    this.camera.position.set(0, 1.5, 5);
    this.camera.lookAt(0, 0, 0);

    // --- Two near-coplanar triangles (z-fighting demo) ---
    // Laid in the XY plane at z=0, with a tiny depth offset baked into
    // vertex positions (so default state already shows z-fighting).
    const triSize = 1.2;
    const triGeoA = makeTriangleGeometry(triSize, 0.0);
    const triGeoB = makeTriangleGeometry(triSize * 0.85, 0.001);

    const triRedMat = new THREE.MeshBasicMaterial({
      color: '#e85d75',
      side: THREE.DoubleSide,
    });
    triRedMat.polygonOffset = true;
    this.triRed = new THREE.Mesh(triGeoA, triRedMat);
    this.triRed.position.set(-0.15, 0.6, 0);
    this.scene.add(this.triRed);
    this.meshList.push(this.triRed);

    const triGreenMat = new THREE.MeshBasicMaterial({
      color: '#4ade80',
      side: THREE.DoubleSide,
    });
    this.triGreen = new THREE.Mesh(triGeoB, triGreenMat);
    this.triGreen.position.set(0.0, 0.6, 0);
    this.scene.add(this.triGreen);
    this.meshList.push(this.triGreen);

    // --- Cube + sphere for context ---
    const cubeGeo = new THREE.BoxGeometry(1.0, 1.0, 1.0);
    const cubeMat = new THREE.MeshStandardMaterial({
      color: '#60a5fa',
      roughness: 0.5,
      metalness: 0.1,
    });
    this.cube = new THREE.Mesh(cubeGeo, cubeMat);
    this.cube.position.set(-1.8, 0.5, -0.5);
    this.scene.add(this.cube);
    this.meshList.push(this.cube);

    const sphereGeo = new THREE.SphereGeometry(0.6, 48, 48);
    const sphereMat = new THREE.MeshStandardMaterial({
      color: '#fbbf24',
      roughness: 0.35,
      metalness: 0.05,
    });
    this.sphere = new THREE.Mesh(sphereGeo, sphereMat);
    this.sphere.position.set(1.8, 0.6, -0.3);
    this.scene.add(this.sphere);
    this.meshList.push(this.sphere);

    // --- Ground plane (catches light, gives depth context) ---
    const groundGeo = new THREE.PlaneGeometry(20, 20);
    const groundMat = new THREE.MeshStandardMaterial({
      color: '#1a1d24',
      roughness: 0.95,
      metalness: 0.0,
    });
    this.ground = new THREE.Mesh(groundGeo, groundMat);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.y = -0.5;
    this.scene.add(this.ground);
    this.meshList.push(this.ground);

    // Single ambient + directional for the shaded view.
    const ambient = new THREE.AmbientLight('#88aaff', 0.4);
    this.scene.add(ambient);
    const dir = new THREE.DirectionalLight('#ffffff', 1.5);
    dir.position.set(3, 5, 4);
    this.scene.add(dir);

    // --- Depth-only scene: same meshes, depth material override ---
    this.depthMaterial = new THREE.MeshDepthMaterial({
      depthPacking: THREE.BasicDepthPacking,
    });

    this.lastState = useAppStore.getState().depth;
    this.unsubscribe = useAppStore.subscribe((state) => {
      if (state.depth !== this.lastState) {
        this.lastState = state.depth;
        this.applyState(state.depth);
      }
    });
  }

  init(renderer: THREE.WebGLRenderer) {
    this.controls = new OrbitControls(this.camera, renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 30;
    this.controls.target.set(0, 0.5, 0);

    this.applyState(this.lastState);
  }

  private applyState(s: DepthState) {
    if (this.disposed) return;

    // depthFunc + depthWrite apply to every mesh material.
    const depthFunc = DEPTH_FUNC_MAP[s.depthFunc];
    for (const mesh of this.meshList) {
      const mat = mesh.material as THREE.Material;
      mat.depthFunc = depthFunc;
      mat.depthWrite = s.depthWrite;
      // Re-inject logarithmic depth on material change.
      this.applyLogarithmicDepth(mat, s.reversedZ);
      mat.needsUpdate = true;
    }

    // Polygon offset only on the red triangle — leaves green as the
    // "stuck" reference so learners see red pushed in/out.
    const triRedMat = this.triRed.material as THREE.MeshBasicMaterial;
    triRedMat.polygonOffset = true;
    triRedMat.polygonOffsetFactor = s.polygonOffsetFactor;
    triRedMat.polygonOffsetUnits = s.polygonOffsetFactor * 0.5;

    // Camera distance drives the z-fighting intensity demo.
    const dist = s.cameraDistance;
    const dir = new THREE.Vector3()
      .subVectors(this.camera.position, this.controls?.target ?? new THREE.Vector3(0, 0.5, 0))
      .normalize();
    if (dir.lengthSq() < 0.01) dir.set(0, 0.3, 1).normalize();
    this.camera.position.copy(dir.multiplyScalar(dist));
  }

  /**
   * Inject logarithmic gl_FragDepth via onBeforeCompile. Toggle by
   * recompiling the material (needsUpdate = true after).
   */
  private applyLogarithmicDepth(mat: THREE.Material, enabled: boolean) {
    if (!('onBeforeCompile' in mat)) return;
    const anyMat = mat as unknown as { __logDepthInjected?: boolean };
    if (enabled && !anyMat.__logDepthInjected) {
      mat.onBeforeCompile = (shader) => {
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <clipping_planes_fragment>',
          `#include <clipping_planes_fragment>
           float zLog = log2(gl_FragCoord.z * gl_FragCoord.w + 1.0) / log2(100.0 + 1.0);
           gl_FragDepth = zLog;`,
        );
      };
      anyMat.__logDepthInjected = true;
    } else if (!enabled && anyMat.__logDepthInjected) {
      mat.onBeforeCompile = () => {};
      anyMat.__logDepthInjected = false;
    }
  }

  update(renderer: THREE.WebGLRenderer) {
    if (this.disposed) return;
    this.controls?.update();

    const showDepth = this.lastState.showDepthBuffer;
    if (showDepth) {
      // Render depth-only scene to the main canvas.
      this.scene.overrideMaterial = this.depthMaterial;
      renderer.render(this.scene, this.camera);
      this.scene.overrideMaterial = null;
    } else {
      renderer.render(this.scene, this.camera);
    }

    // Always show the depth preview in the corner — independent of main view mode.
    const depthTexture = this.ensureDepthTarget(renderer).texture;
    renderer.setRenderTarget(this.depthTarget);
    renderer.clear();
    this.scene.overrideMaterial = this.depthMaterial;
    renderer.render(this.scene, this.camera);
    this.scene.overrideMaterial = null;
    renderer.setRenderTarget(null);

    drawCornerQuad(renderer, {
      texture: depthTexture,
      x: 16,
      y: 16,
      w: 200,
      h: 150,
      fallbackColor: 0x1a1d24,
    });
  }

  private ensureDepthTarget(renderer: THREE.WebGLRenderer): THREE.WebGLRenderTarget {
    const w = renderer.domElement.width || 512;
    const h = renderer.domElement.height || 512;
    if (!this.depthTarget || this.depthTarget.width !== w || this.depthTarget.height !== h) {
      this.depthTarget?.dispose();
      this.depthTarget = new THREE.WebGLRenderTarget(w, h, {
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        type: THREE.UnsignedByteType,
      });
    }
    return this.depthTarget;
  }

  onResize(width: number, height: number) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  dispose() {
    this.disposed = true;
    this.unsubscribe();
    this.controls?.dispose();
    this.depthTarget?.dispose();

    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        const mat = obj.material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat.dispose();
      }
    });
    this.depthMaterial.dispose();
  }
}

function makeTriangleGeometry(size: number, z: number): THREE.BufferGeometry {
  const half = size / 2;
  const full = size;
  const positions = new Float32Array([
    0, full, z,
    -half, 0, z,
    half, 0, z,
  ]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  return geo;
}

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { SceneModule } from '@/three/SceneModule';
import { useAppStore, type ShadowsState, type ShadowPcfMode } from '@/store';
import { drawCornerQuad } from '@/three/cornerPreview';

const PCF_RADIUS: Record<ShadowPcfMode, number> = {
  none: 0,
  'pcf-1': 0,
  'pcf-3': 2.5,
  'pcf-5': 5,
};

/**
 * Shadow-mapping explainer scene. DirectionalLight with shadow.camera
 * configured to cover the scene; ground plane + cube + sphere provide
 * clear shadow geometry. After the main render, a corner quad draws
 * the live shadow map so the learner sees what the light "sees".
 *
 * All shadow params (resolution / bias / PCF / light angle) are
 * store-driven and applied without recreating the scene.
 */
export class ShadowModule implements SceneModule {
  readonly id = 'shadows';

  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  private controls: OrbitControls | null = null;
  private renderer: THREE.WebGLRenderer | null = null;

  private light: THREE.DirectionalLight;
  private ambient: THREE.AmbientLight;
  private ground: THREE.Mesh;

  private lastState: ShadowsState;
  private unsubscribe: () => void;
  private disposed = false;

  constructor() {
    this.scene.background = new THREE.Color('#0f1115');

    this.camera.position.set(5, 4, 7);
    this.camera.lookAt(0, 0.5, 0);

    // Ground plane (catches shadows).
    const groundGeo = new THREE.PlaneGeometry(20, 20);
    const groundMat = new THREE.MeshStandardMaterial({
      color: '#a8a8a8',
      roughness: 0.95,
      metalness: 0.0,
    });
    this.ground = new THREE.Mesh(groundGeo, groundMat);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);

    // Cube + sphere cast shadows.
    const cubeGeo = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    const cubeMat = new THREE.MeshStandardMaterial({
      color: '#e85d75',
      roughness: 0.55,
      metalness: 0.05,
    });
    const cube = new THREE.Mesh(cubeGeo, cubeMat);
    cube.position.set(-1.6, 0.75, 0.4);
    cube.castShadow = true;
    cube.receiveShadow = true;
    this.scene.add(cube);

    const sphereGeo = new THREE.SphereGeometry(0.85, 48, 48);
    const sphereMat = new THREE.MeshStandardMaterial({
      color: '#4ade80',
      roughness: 0.35,
      metalness: 0.1,
    });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    sphere.position.set(1.4, 0.85, -0.6);
    sphere.castShadow = true;
    sphere.receiveShadow = true;
    this.scene.add(sphere);

    // DirectionalLight — the only shadow caster in this scene.
    this.light = new THREE.DirectionalLight('#ffffff', 2.2);
    this.light.castShadow = true;
    this.light.shadow.mapSize.set(1024, 1024);
    this.light.shadow.camera.left = -6;
    this.light.shadow.camera.right = 6;
    this.light.shadow.camera.top = 6;
    this.light.shadow.camera.bottom = -6;
    this.light.shadow.camera.near = 0.1;
    this.light.shadow.camera.far = 30;
    this.light.shadow.bias = 0.0008;
    this.scene.add(this.light);
    this.scene.add(this.light.target);

    // Soft ambient so unlit faces aren't pure black.
    this.ambient = new THREE.AmbientLight('#88aaff', 0.25);
    this.scene.add(this.ambient);

    this.lastState = useAppStore.getState().shadows;
    this.unsubscribe = useAppStore.subscribe((state) => {
      if (state.shadows !== this.lastState) {
        this.lastState = state.shadows;
        this.applyState(state.shadows);
      }
    });
  }

  init(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer;
    renderer.shadowMap.enabled = true;
    this.applyPcfMode(this.lastState.pcfMode, /* force = */ true);

    this.controls = new OrbitControls(this.camera, renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 20;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.05;
    this.controls.target.set(0, 0.5, 0);

    // Apply initial state now that renderer is available.
    this.applyState(this.lastState);
  }

  private applyState(s: ShadowsState) {
    if (this.disposed) return;

    // Resolution: rebuild shadow map.
    const currentSize = this.light.shadow.mapSize;
    if (currentSize.width !== s.resolution || currentSize.height !== s.resolution) {
      currentSize.set(s.resolution, s.resolution);
      // Force Three.js to recreate the shadow RenderTarget.
      this.light.shadow.map?.dispose();
      this.light.shadow.map = null;
    }

    // Bias.
    this.light.shadow.bias = s.bias;

    // PCF.
    this.applyPcfMode(s.pcfMode);

    // Light position from yaw/pitch ( spherical ).
    const yawRad = (s.lightYaw * Math.PI) / 180;
    const pitchRad = (s.lightPitch * Math.PI) / 180;
    const r = 10;
    this.light.position.set(
      r * Math.cos(pitchRad) * Math.sin(yawRad),
      r * Math.sin(pitchRad),
      r * Math.cos(pitchRad) * Math.cos(yawRad),
    );
    this.light.target.position.set(0, 0, 0);
  }

  private applyPcfMode(mode: ShadowPcfMode, force = false) {
    if (!this.renderer) return;
    const prevType = this.renderer.shadowMap.type;
    let nextType: THREE.ShadowMapType;
    switch (mode) {
      case 'none':
        nextType = THREE.BasicShadowMap;
        break;
      case 'pcf-1':
        nextType = THREE.PCFShadowMap;
        break;
      case 'pcf-3':
      case 'pcf-5':
        nextType = THREE.PCFSoftShadowMap;
        break;
    }
    if (force || prevType !== nextType) {
      this.renderer.shadowMap.type = nextType;
      this.renderer.shadowMap.needsUpdate = true;
      // Materials need recompile to pick up the new shadow type.
      this.scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) obj.material.needsUpdate = true;
      });
    }
    // radius is only used by PCFSoftShadowMap.
    this.light.shadow.radius = PCF_RADIUS[mode];
  }

  update(renderer: THREE.WebGLRenderer) {
    if (this.disposed) return;
    this.controls?.update();
    renderer.render(this.scene, this.camera);

    // Draw the live shadow map into the bottom-left corner.
    const shadowTexture = this.light.shadow.map?.texture ?? null;
    drawCornerQuad(renderer, {
      texture: shadowTexture,
      x: 16,
      y: 16,
      w: 200,
      h: 150,
      fallbackColor: 0x1a1d24,
    });
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
      // Reset to defaults so the next module starts clean.
      this.renderer.shadowMap.enabled = false;
      this.renderer.shadowMap.type = THREE.PCFShadowMap;
      this.renderer.shadowMap.needsUpdate = true;
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
    this.light.shadow.map?.dispose();
  }
}

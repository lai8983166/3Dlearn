import * as THREE from 'three';
import type { SceneModule } from '@/three/SceneModule';

/**
 * Minimal scene used while scaffolding. Renders a spinning cube on a flat
 * background so we can verify the renderer + module lifecycle end-to-end
 * before the real PBR scene is implemented.
 */
export class PlaceholderModule implements SceneModule {
  readonly id = 'placeholder';
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  private cube: THREE.Mesh;

  constructor() {
    this.scene.background = new THREE.Color('#0f1115');
    this.camera.position.set(0, 0, 4);

    const geo = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    const mat = new THREE.MeshStandardMaterial({
      color: '#4ade80',
      roughness: 0.5,
      metalness: 0.1,
    });
    this.cube = new THREE.Mesh(geo, mat);
    this.scene.add(this.cube);

    const light = new THREE.DirectionalLight('#ffffff', 1.5);
    light.position.set(2, 2, 3);
    this.scene.add(light);
    this.scene.add(new THREE.AmbientLight('#ffffff', 0.3));
  }

  init() {}
  update(_renderer: THREE.WebGLRenderer, delta: number) {
    this.cube.rotation.x += delta * 0.5;
    this.cube.rotation.y += delta * 0.7;
    _renderer.render(this.scene, this.camera);
  }
  onResize(width: number, height: number) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }
  dispose() {
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

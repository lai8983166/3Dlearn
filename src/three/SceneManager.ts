import * as THREE from 'three';
import type { SceneModule } from './SceneModule';

/**
 * Owns the WebGLRenderer, animation loop, and the currently-active SceneModule.
 * Module swaps dispose the old module before initialising the new one so that
 * GPU memory (`renderer.info.memory`) actually drops between scenes.
 */
export class SceneManager {
  private renderer: THREE.WebGLRenderer;
  private current: SceneModule | null = null;
  private clock = new THREE.Clock();
  private animationFrameId: number | null = null;
  private width = 1;
  private height = 1;
  private disposed = false;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
  }

  setModule(module: SceneModule) {
    if (this.current) {
      this.current.dispose();
      this.current = null;
    }
    this.current = module;
    this.current.init(this.renderer);
    this.current.onResize(this.width, this.height);
  }

  setSize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.renderer.setSize(width, height, false);
    this.current?.onResize(width, height);
  }

  start() {
    if (this.animationFrameId !== null) return;
    const loop = () => {
      if (this.disposed) return;
      this.animationFrameId = requestAnimationFrame(loop);
      const delta = this.clock.getDelta();
      this.current?.update(this.renderer, delta);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  dispose() {
    this.disposed = true;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.current?.dispose();
    this.current = null;
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }

  get info() {
    return this.renderer.info;
  }
}

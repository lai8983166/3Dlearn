import type { WebGLRenderer } from 'three';

/**
 * A self-contained 3D scene that can be mounted into the shared renderer.
 *
 * Lifecycle:
 *   init(renderer) → update() each frame → dispose() before unmount or swap.
 *
 * Implementations own their own Scene, Camera, and scene-graph objects.
 * The shared renderer and animation loop are managed by SceneManager.
 */
export interface SceneModule {
  readonly id: string;
  init(renderer: WebGLRenderer): void;
  update(renderer: WebGLRenderer, deltaSeconds: number): void;
  onResize(width: number, height: number): void;
  dispose(): void;
}

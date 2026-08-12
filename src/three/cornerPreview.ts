import * as THREE from 'three';

/**
 * Shared renderer-side utility for drawing a textured quad into a small
 * corner viewport, on top of the main render. Used by:
 *   - ShadowModule: shows the live shadow map (depth texture from the
 *     directional light's shadow camera).
 *   - TextureModule: shows the 2D checker texture plus an optional UV
 *     grid overlay so the learner can match 3D surfaces to UV space.
 *
 * Implementation notes:
 *   - The scene + camera + quad are singletons; we just swap the texture
 *     each call.
 *   - Viewport/scissor state is saved and restored so callers don't have
 *     to know about GL state.
 *   - Bottom-left origin (Three.js convention): pass y=16 to sit 16px
 *     above the canvas bottom.
 */

export interface CornerPreviewOpts {
  texture: THREE.Texture | null;
  /** Viewport rect (bottom-left origin, px). */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Optional UV grid overlay: draws N+1 lines per axis where N = tiling*subdivisions. */
  overlayGrid?: {
    tiling: number;
    subdivisions: number;
  };
  /** Optional label color used as fallback when texture is null. */
  fallbackColor?: number;
}

let _scene: THREE.Scene | null = null;
let _camera: THREE.OrthographicCamera | null = null;
let _quad: THREE.Mesh | null = null;
let _grid: THREE.LineSegments | null = null;
let _gridGeo: THREE.BufferGeometry | null = null;

function ensureSingleton() {
  if (_scene) return;
  _scene = new THREE.Scene();
  _camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  _camera.position.z = 0.5;

  const quadGeo = new THREE.PlaneGeometry(2, 2);
  const quadMat = new THREE.MeshBasicMaterial();
  _quad = new THREE.Mesh(quadGeo, quadMat);
  _scene.add(_quad);

  // UV grid: 9 lines per axis (at 0, 0.125, 0.25, ..., 1.0). Scaled at
  // draw time to reflect the current tiling.
  const positions: number[] = [];
  const STEPS = 8;
  for (let i = 0; i <= STEPS; i++) {
    const t = -1 + (2 * i) / STEPS;
    positions.push(-1, t, 0.02, 1, t, 0.02);
    positions.push(t, -1, 0.02, t, 1, 0.02);
  }
  _gridGeo = new THREE.BufferGeometry();
  _gridGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const gridMat = new THREE.LineBasicMaterial({
    color: 0xffe066,
    transparent: true,
    opacity: 0.55,
  });
  _grid = new THREE.LineSegments(_gridGeo, gridMat);
  _grid.visible = false;
  _scene.add(_grid);
}

const _vp = new THREE.Vector4();
const _sc = new THREE.Vector4();

export function drawCornerQuad(
  renderer: THREE.WebGLRenderer,
  opts: CornerPreviewOpts,
) {
  ensureSingleton();
  if (!_scene || !_camera || !_quad || !_grid) return;

  const mat = _quad.material as THREE.MeshBasicMaterial;
  if (opts.texture) {
    mat.map = opts.texture;
    mat.color.setHex(0xffffff);
  } else {
    mat.map = null;
    mat.color.setHex(opts.fallbackColor ?? 0x1a1d24);
  }
  mat.needsUpdate = true;

  if (opts.overlayGrid && opts.overlayGrid.tiling > 0) {
    _grid.visible = true;
    _grid.scale.set(opts.overlayGrid.tiling, opts.overlayGrid.tiling, 1);
  } else {
    _grid.visible = false;
  }

  const hadScTest = renderer.getScissorTest();
  renderer.getViewport(_vp);
  renderer.getScissor(_sc);

  renderer.setScissorTest(true);
  renderer.setViewport(opts.x, opts.y, opts.w, opts.h);
  renderer.setScissor(opts.x, opts.y, opts.w, opts.h);
  // Auto-clear depth so the quad doesn't lose to the scene's depth buffer.
  renderer.clearDepth();
  renderer.render(_scene, _camera);

  renderer.setScissorTest(hadScTest);
  renderer.setViewport(_vp.x, _vp.y, _vp.z, _vp.w);
  renderer.setScissor(_sc.x, _sc.y, _sc.z, _sc.w);
}

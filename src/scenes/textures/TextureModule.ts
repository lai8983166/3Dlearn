import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { SceneModule } from '@/three/SceneModule';
import {
  useAppStore,
  type TexturesState,
  type TextureFilterMode,
  type TextureWrapping,
} from '@/store';
import { generateCheckerTexture } from './checkerTexture';
import { drawCornerQuad } from '@/three/cornerPreview';

const PLANE_WIDTH = 12;
const PLANE_DEPTH = 12;
const UV_GRID_SUBDIVISIONS = 8;

const FILTER_MAP: Record<
  TextureFilterMode,
  { min: THREE.MinificationTextureFilter; mag: THREE.MagnificationTextureFilter; mipmaps: boolean }
> = {
  nearest: {
    min: THREE.NearestFilter,
    mag: THREE.NearestFilter,
    mipmaps: false,
  },
  linear: {
    min: THREE.LinearFilter,
    mag: THREE.LinearFilter,
    mipmaps: false,
  },
  'mipmap-nearest': {
    min: THREE.NearestMipmapNearestFilter,
    mag: THREE.LinearFilter,
    mipmaps: true,
  },
  'mipmap-linear': {
    min: THREE.LinearMipmapLinearFilter,
    mag: THREE.LinearFilter,
    mipmaps: true,
  },
};

const WRAP_MAP: Record<TextureWrapping, THREE.Wrapping> = {
  repeat: THREE.RepeatWrapping,
  mirror: THREE.MirroredRepeatWrapping,
  clamp: THREE.ClampToEdgeWrapping,
};

/**
 * Texture & UV explainer scene. A large tilted plane with a procedural
 * checker texture. Every filter / wrapping / tiling / offset knob is
 * store-driven and applied to the texture without rebuilding geometry.
 *
 * The plane has a UV grid overlay (LineSegments) that the learner can
 * toggle to see how 3D surface maps to 2D UV space. The corner preview
 * shows the 2D texture + the same UV grid so the correspondence is
 * explicit.
 */
export class TextureModule implements SceneModule {
  readonly id = 'textures';

  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  private controls: OrbitControls | null = null;

  private plane: THREE.Mesh;
  private texture: THREE.CanvasTexture;
  private material: THREE.MeshStandardMaterial;
  private uvGrid: THREE.LineSegments;
  private maxAnisotropy = 1;
  private _lastCells = -1;

  private lastState: TexturesState;
  private unsubscribe: () => void;
  private disposed = false;

  constructor() {
    this.scene.background = new THREE.Color('#0f1115');

    this.camera.position.set(0, 4, 8);
    this.camera.lookAt(0, 0, 0);

    // Light — single directional + soft ambient so unlit checker cells
    // remain distinguishable (pure black/white doesn't teach shading).
    const key = new THREE.DirectionalLight('#ffffff', 1.6);
    key.position.set(4, 6, 4);
    this.scene.add(key);
    this.scene.add(new THREE.AmbientLight('#ffffff', 0.4));

    this.lastState = useAppStore.getState().textures;
    this.texture = generateCheckerTexture(this.lastState.checkerCells);

    this.material = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      map: this.texture,
      roughness: 0.85,
      metalness: 0.0,
    });

    // Tilted plane: rotate around X so it lies mostly flat but is
    // visible from the camera at a low-ish angle.
    const planeGeo = new THREE.PlaneGeometry(PLANE_WIDTH, PLANE_DEPTH, 1, 1);
    this.plane = new THREE.Mesh(planeGeo, this.material);
    this.plane.rotation.x = -Math.PI / 2.1;
    this.plane.position.y = 0;
    this.scene.add(this.plane);

    // UV grid overlay.
    this.uvGrid = new THREE.LineSegments(
      this.buildUvGridGeometry(this.lastState.tiling),
      new THREE.LineBasicMaterial({
        color: '#ffe066',
        transparent: true,
        opacity: 0.75,
      }),
    );
    this.uvGrid.visible = this.lastState.showUvGrid;
    this.plane.add(this.uvGrid);

    this.unsubscribe = useAppStore.subscribe((state) => {
      if (state.textures !== this.lastState) {
        this.lastState = state.textures;
        this.applyState(state.textures);
      }
    });
  }

  private buildUvGridGeometry(tiling: number): THREE.BufferGeometry {
    const positions: number[] = [];
    const linesPerAxis = UV_GRID_SUBDIVISIONS * tiling;
    const halfW = PLANE_WIDTH / 2;
    const halfH = PLANE_DEPTH / 2;
    for (let i = 0; i <= linesPerAxis; i++) {
      const t = i / linesPerAxis;
      const x = -halfW + t * PLANE_WIDTH;
      const y = -halfH + t * PLANE_DEPTH;
      // PlaneGeometry local space is XY before rotation; the plane is
      // rotated -PI/2.1 around X by the parent, so we work in the
      // plane's local (un-rotated) coordinates.
      positions.push(x, y, 0.01, x, -halfH + 0, 0.01); // not used; replaced below
    }
    // Clear and rebuild properly — above placeholder array confuses readers.
    positions.length = 0;
    for (let i = 0; i <= linesPerAxis; i++) {
      const t = i / linesPerAxis;
      const x = -halfW + t * PLANE_WIDTH;
      const y = -halfH + t * PLANE_DEPTH;
      // Vertical line (constant x in plane local space).
      positions.push(x, -halfH, 0.01, x, halfH, 0.01);
      // Horizontal line (constant y).
      positions.push(-halfW, y, 0.01, halfW, y, 0.01);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return geo;
  }

  init(renderer: THREE.WebGLRenderer) {
    this.maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    // Clamp stored anisotropy to GPU max.
    if (this.lastState.anisotropy > this.maxAnisotropy) {
      useAppStore.getState().setTextures('anisotropy', this.maxAnisotropy);
    }

    this.controls = new OrbitControls(this.camera, renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 30;
    this.controls.target.set(0, 0, 0);

    this.applyState(this.lastState);
  }

  private applyState(s: TexturesState) {
    if (this.disposed) return;

    // Checker cell count requires texture regeneration.
    if (this.texture.image.width !== 256 || s.checkerCells !== this._lastCells) {
      this._lastCells = s.checkerCells;
      const newTex = generateCheckerTexture(s.checkerCells);
      // Preserve filter/wrap settings onto the new texture.
      this.applyFilterToTexture(newTex, s);
      this.applyWrapToTexture(newTex, s);
      newTex.anisotropy = Math.min(s.anisotropy, this.maxAnisotropy);
      newTex.repeat.set(s.tiling, s.tiling);
      newTex.offset.set(s.offset, s.offset);
      newTex.needsUpdate = true;
      this.material.map = newTex;
      this.texture.dispose();
      this.texture = newTex;
      this.material.needsUpdate = true;
      return;
    }

    this.applyFilterToTexture(this.texture, s);
    this.applyWrapToTexture(this.texture, s);
    this.texture.anisotropy = Math.min(s.anisotropy, this.maxAnisotropy);
    this.texture.repeat.set(s.tiling, s.tiling);
    this.texture.offset.set(s.offset, s.offset);
    this.texture.needsUpdate = true;

    // UV grid visibility / density.
    this.uvGrid.visible = s.showUvGrid;
    if (this.uvGrid.userData.tiling !== s.tiling) {
      this.uvGrid.geometry.dispose();
      this.uvGrid.geometry = this.buildUvGridGeometry(s.tiling);
      this.uvGrid.userData.tiling = s.tiling;
    }
  }

  private applyFilterToTexture(tex: THREE.Texture, s: TexturesState) {
    const m = FILTER_MAP[s.filterMode];
    tex.minFilter = m.min;
    tex.magFilter = m.mag;
    tex.generateMipmaps = m.mipmaps;
  }

  private applyWrapToTexture(tex: THREE.Texture, s: TexturesState) {
    const w = WRAP_MAP[s.wrapping];
    tex.wrapS = w;
    tex.wrapT = w;
  }

  update(renderer: THREE.WebGLRenderer) {
    if (this.disposed) return;
    this.controls?.update();
    renderer.render(this.scene, this.camera);

    drawCornerQuad(renderer, {
      texture: this.texture,
      x: 16,
      y: 16,
      w: 180,
      h: 180,
      overlayGrid: this.lastState.showUvGrid
        ? { tiling: this.lastState.tiling, subdivisions: UV_GRID_SUBDIVISIONS }
        : undefined,
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
    this.uvGrid.geometry.dispose();
    (this.uvGrid.material as THREE.Material).dispose();
    this.texture.dispose();
  }
}

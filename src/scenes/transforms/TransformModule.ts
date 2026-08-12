import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { SceneModule } from '@/three/SceneModule';
import { useAppStore, type TransformsState, type TransformOrder } from '@/store';
import { buildFGeometry } from './fGeometry';

/**
 * Geometric transforms explainer. Two letter-F meshes share the same
 * BufferGeometry:
 *   - ghost F (left): half-opacity grey, fixed at the original pose, so
 *     the learner always sees "where the un-transformed F lives"
 *   - live F (right): bright colour, has matrixAutoUpdate off, gets a
 *     freshly composed T/R/S matrix every store change
 *
 * The composed matrix follows the configured multiplication order
 * (TRS / TSR / RTS / RST / STR / SRT) so the user can flip the order
 * and watch the result change in real time.
 */
export class TransformModule implements SceneModule {
  readonly id = 'transforms';

  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  private controls: OrbitControls | null = null;

  private ghostF: THREE.Mesh;
  private liveF: THREE.Mesh;
  private ghostMaterial: THREE.MeshBasicMaterial;
  private liveMaterial: THREE.MeshStandardMaterial;

  private lastState: TransformsState;
  private unsubscribe: () => void;
  private disposed = false;

  constructor() {
    this.scene.background = new THREE.Color('#0f1115');

    this.camera.position.set(0, 1.5, 7);
    this.camera.lookAt(0, 0, 0);

    // Lighting — three-point so the F's orientation is readable.
    const key = new THREE.DirectionalLight('#ffffff', 2.0);
    key.position.set(3, 4, 5);
    this.scene.add(key);
    const fill = new THREE.DirectionalLight('#88aaff', 0.5);
    fill.position.set(-3, -1, 2);
    this.scene.add(fill);
    const rim = new THREE.DirectionalLight('#ffaa66', 0.7);
    rim.position.set(0, 2, -4);
    this.scene.add(rim);
    this.scene.add(new THREE.AmbientLight('#ffffff', 0.1));

    const fGeo = buildFGeometry();

    // Ghost (original) F: half-opacity, basic material, fixed pose.
    this.ghostMaterial = new THREE.MeshBasicMaterial({
      color: '#9ca3af',
      transparent: true,
      opacity: 0.25,
      depthWrite: false,
    });
    this.ghostF = new THREE.Mesh(fGeo, this.ghostMaterial);
    this.ghostF.position.set(-2.5, 0, 0);
    this.scene.add(this.ghostF);

    // Live (transformed) F: bright, standard material, matrix driven
    // from store. matrixAutoUpdate=false so Three.js doesn't overwrite.
    this.liveMaterial = new THREE.MeshStandardMaterial({
      color: '#4ade80',
      roughness: 0.45,
      metalness: 0.05,
    });
    this.liveF = new THREE.Mesh(fGeo, this.liveMaterial);
    this.liveF.position.set(1.5, 0, 0);
    this.liveF.matrixAutoUpdate = false;
    this.scene.add(this.liveF);

    this.lastState = useAppStore.getState().transforms;
    this.unsubscribe = useAppStore.subscribe((state) => {
      if (state.transforms !== this.lastState) {
        this.lastState = state.transforms;
        this.applyState(state.transforms);
      }
    });
  }

  init(renderer: THREE.WebGLRenderer) {
    void renderer;
    this.controls = new OrbitControls(this.camera, renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 20;
    this.controls.target.set(0, 0, 0);

    // Apply initial state now that the mesh exists.
    this.applyState(this.lastState);
  }

  private applyState(s: TransformsState) {
    if (this.disposed) return;

    const m = composeMatrix(s);
    // Compose includes the live-F's base offset so position is baked in.
    this.liveF.matrix.copy(m);
    this.liveF.matrixWorldNeedsUpdate = true;
  }

  update(renderer: THREE.WebGLRenderer) {
    void renderer;
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
    const geo = this.ghostF.geometry; // shared with liveF
    geo.dispose();
    this.ghostMaterial.dispose();
    this.liveMaterial.dispose();
  }
}

/**
 * Compose the 4×4 model matrix from translate/rotate/scale according
 * to the configured multiplication order. The order string describes
 * left-to-right multiplication order (e.g. "TRS" → T * R * S).
 *
 * Three.js Matrix4 uses column-major layout and .multiply() performs
 * post-multiplication, so `result.multiply(T).multiply(R).multiply(S)`
 * yields `result = result * T * R * S` (which is just T*R*S if result
 * starts as identity).
 *
 * We also fold in the live-F's base position offset (1.5, 0, 0) as a
 * pre-multiplication, so the configured translate is on top of the
 * base offset rather than fighting it.
 */
function composeMatrix(s: TransformsState): THREE.Matrix4 {
  const base = new THREE.Matrix4().makeTranslation(1.5, 0, 0);

  const T = new THREE.Matrix4().makeTranslation(...s.translate);
  const euler = new THREE.Euler(
    (s.rotate[0] * Math.PI) / 180,
    (s.rotate[1] * Math.PI) / 180,
    (s.rotate[2] * Math.PI) / 180,
  );
  const R = new THREE.Matrix4().makeRotationFromEuler(euler);
  const S = new THREE.Matrix4().makeScale(...s.scale);

  const ops: Record<TransformOrder, () => THREE.Matrix4> = {
    TRS: () => new THREE.Matrix4().multiply(T).multiply(R).multiply(S),
    TSR: () => new THREE.Matrix4().multiply(T).multiply(S).multiply(R),
    RTS: () => new THREE.Matrix4().multiply(R).multiply(T).multiply(S),
    RST: () => new THREE.Matrix4().multiply(R).multiply(S).multiply(T),
    STR: () => new THREE.Matrix4().multiply(S).multiply(T).multiply(R),
    SRT: () => new THREE.Matrix4().multiply(S).multiply(R).multiply(T),
  };
  const trs = ops[s.order]();
  return base.multiply(trs);
}

/**
 * Read the row-major (i,j) element of a Three.js Matrix4.
 * Three.js stores elements in column-major Float32Array, so:
 *   elements[col * 4 + row]
 */
export function matrixElement(m: THREE.Matrix4, row: number, col: number): number {
  return m.elements[col * 4 + row];
}

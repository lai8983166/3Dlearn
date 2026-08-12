import * as THREE from 'three';
import type { SceneModule } from '@/three/SceneModule';
import {
  computeThinLensImaging,
  refractThroughThinLens,
  extendRayTo,
  buildParallelRayBundle,
  buildPointSourceRayBundle,
  type Ray2D,
  type LensType,
} from '@/physics/optics';
import { useAppStore, type OpticsState } from '@/store';
import { buildLensGeometry } from './LensGeometry';
import { ArrowObject } from './ArrowObject';
import { RayBundle } from './RayBundle';

/** Viewport extents in scene units. */
const VIEW_WIDTH = 22;
const VIEW_HEIGHT = 12;
const LENS_HALF_HEIGHT = 1.5;
const LENS_THICKNESS = 0.6;

/**
 * 2D optics sandbox. Orthographic camera looks at the XY plane from +Z.
 * Light travels +x; lens at x=0; object draggable along x.
 */
export class OpticsModule implements SceneModule {
  readonly id = 'optics';

  private scene = new THREE.Scene();
  private camera: THREE.OrthographicCamera;
  private raycaster = new THREE.Raycaster();
  private dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

  private lensMesh: THREE.Mesh;
  private lensMaterial: THREE.MeshBasicMaterial;
  private objectArrow: ArrowObject;
  private imageArrowReal: ArrowObject;
  private imageArrowVirtual: ArrowObject;
  private focalPoints: THREE.Group;
  private axisLine: THREE.Line;
  private rayBundle: RayBundle;

  private domElement: HTMLElement | null = null;
  private dragging = false;
  private pointerNDC = new THREE.Vector2();
  private tmpVec = new THREE.Vector3();

  private unsubscribe: () => void;
  private lastState: OpticsState;

  constructor() {
    this.scene.background = new THREE.Color('#0f1115');

    const aspect = 1;
    this.camera = new THREE.OrthographicCamera(
      -VIEW_WIDTH / 2 * aspect,
      VIEW_WIDTH / 2 * aspect,
      VIEW_HEIGHT / 2,
      -VIEW_HEIGHT / 2,
      0.1,
      100,
    );
    this.camera.position.set(0, 0, 10);
    this.camera.lookAt(0, 0, 0);

    // Optical axis (subtle grey line).
    const axisGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-VIEW_WIDTH / 2, 0, 0),
      new THREE.Vector3(VIEW_WIDTH / 2, 0, 0),
    ]);
    this.axisLine = new THREE.Line(
      axisGeo,
      new THREE.LineBasicMaterial({
        color: '#3a3f4b',
        transparent: true,
        opacity: 0.8,
      }),
    );
    this.scene.add(this.axisLine);

    // Grid for spatial reference.
    const grid = new THREE.GridHelper(VIEW_HEIGHT, 12, '#252932', '#1a1d24');
    grid.rotation.x = Math.PI / 2; // lay flat in XY plane
    grid.position.z = -0.1;
    this.scene.add(grid);

    // Lens mesh.
    const initial = useAppStore.getState().optics;
    this.lastState = initial;
    this.lensMaterial = new THREE.MeshBasicMaterial({
      color: '#7dd3fc',
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.lensMesh = new THREE.Mesh(
      buildLensGeometry(initial.lensType, LENS_HALF_HEIGHT, LENS_THICKNESS),
      this.lensMaterial,
    );
    this.scene.add(this.lensMesh);

    // Arrows.
    this.objectArrow = new ArrowObject('#f97316', 1.0); // orange
    this.objectArrow.group.scale.y = initial.objectHeight;
    this.objectArrow.group.position.x = initial.objectX;
    this.scene.add(this.objectArrow.group);

    this.imageArrowReal = new ArrowObject('#4ade80', 1.0); // green
    this.scene.add(this.imageArrowReal.group);

    this.imageArrowVirtual = new ArrowObject('#a78bfa', 0.5); // dim purple
    this.scene.add(this.imageArrowVirtual.group);

    // Focal points F and F'.
    this.focalPoints = new THREE.Group();
    this.scene.add(this.focalPoints);

    // Ray bundle (max 21 rays).
    this.rayBundle = new RayBundle(21);
    this.scene.add(this.rayBundle.lines);
    this.scene.add(this.rayBundle.virtualLines);

    this.unsubscribe = useAppStore.subscribe((state) => {
      if (state.optics !== this.lastState) {
        this.lastState = state.optics;
        this.applyState(state.optics);
      }
    });
    this.applyState(initial);
  }

  private applyState(s: OpticsState) {
    const currentType = (this.lensMesh.userData.type ?? null) as LensType | null;
    if (currentType !== s.lensType) {
      this.lensMesh.geometry.dispose();
      this.lensMesh.geometry = buildLensGeometry(
        s.lensType,
        LENS_HALF_HEIGHT,
        LENS_THICKNESS,
      );
      this.lensMesh.userData.type = s.lensType;
    }

    this.objectArrow.group.position.x = s.objectX;
    this.objectArrow.group.scale.y = s.objectHeight;

    this.recomputeRays(s);
    this.updateFocalPoints(s);
  }

  private updateFocalPoints(s: OpticsState) {
    // Clear previous markers.
    while (this.focalPoints.children.length > 0) {
      const c = this.focalPoints.children[0];
      if (c instanceof THREE.Mesh) c.geometry.dispose();
      this.focalPoints.remove(c);
    }

    const dotGeo = new THREE.CircleGeometry(0.08, 24);
    const makeDot = (x: number, color: string, label: string) => {
      const mat = new THREE.MeshBasicMaterial({ color });
      const mesh = new THREE.Mesh(dotGeo.clone(), mat);
      mesh.position.set(x, 0, 0.2);
      mesh.userData = { label };
      this.focalPoints.add(mesh);
    };
    makeDot(-Math.abs(s.focalLength), '#fbbf24', "F (object-side)");
    makeDot(Math.abs(s.focalLength), '#fbbf24', "F' (image-side)");
  }

  private recomputeRays(s: OpticsState) {
    const f = s.focalLength;
    const objectX = s.objectX;
    const objectHeight = s.objectHeight;

    // Compute image position.
    const imaging = computeThinLensImaging(objectX, f);
    const v = imaging.v;
    const imageHeight = objectHeight * imaging.magnification;

    // Update image arrow meshes.
    if (Number.isFinite(v) && imaging.isReal) {
      this.imageArrowReal.group.visible = true;
      this.imageArrowVirtual.group.visible = false;
      this.imageArrowReal.group.position.set(v, 0, 0.05);
      this.imageArrowReal.group.scale.y = imageHeight; // negative m flips arrow
    } else if (Number.isFinite(v) && !imaging.isReal) {
      this.imageArrowReal.group.visible = false;
      this.imageArrowVirtual.group.visible = true;
      this.imageArrowVirtual.group.position.set(v, 0, 0.05);
      this.imageArrowVirtual.group.scale.y = imageHeight;
    } else {
      // Image at infinity (object on focal point).
      this.imageArrowReal.group.visible = false;
      this.imageArrowVirtual.group.visible = false;
    }

    // Build incoming ray bundle.
    const sourceX = -VIEW_WIDTH / 2 + 0.5;
    let incomingRays: Ray2D[];
    if (s.lightSourceType === 'parallel') {
      incomingRays = buildParallelRayBundle(s.rayCount, LENS_HALF_HEIGHT, sourceX);
    } else {
      incomingRays = buildPointSourceRayBundle(
        s.rayCount,
        objectX,
        objectHeight, // tip of object acts as point source
        LENS_HALF_HEIGHT,
        0,
      );
    }

    // For parallel light, the "object" is effectively at -∞ so use a large
    // negative x for imaging. We still show the user's objectX arrow as the
    // marker; the rays do their own thing.
    const raysToDraw: Array<{
      incomingStart: THREE.Vector3;
      incomingEnd: THREE.Vector3;
      outgoingEnd: THREE.Vector3;
      virtualEnd?: THREE.Vector3;
    }> = [];

    const lensPlaneY = 0;
    const farX = VIEW_WIDTH / 2 - 0.5;

    for (const ray of incomingRays) {
      // Refract at lens plane.
      let outgoing: Ray2D;
      try {
        outgoing = refractThroughThinLens(ray, f);
      } catch {
        continue;
      }

      // Outgoing endpoint: at image plane (if real), else at viewport edge.
      let outgoingEndX: number;
      let virtualEnd: THREE.Vector3 | undefined;
      if (Number.isFinite(v)) {
        if (imaging.isReal) {
          outgoingEndX = v;
        } else {
          // Virtual image — outgoing ray travels to far edge; back-extends to v.
          outgoingEndX = farX;
          const backExt = extendRayTo(outgoing, v);
          virtualEnd = new THREE.Vector3(backExt.x, backExt.y, 0.05);
        }
      } else {
        // Image at infinity — outgoing rays are parallel, just go to edge.
        outgoingEndX = outgoing.dx > 0 ? farX : -farX;
      }

      const inStart = new THREE.Vector3(ray.x, ray.y, 0.05);
      const inEnd = new THREE.Vector3(0, lensPlaneY + ray.y * 0 + this.lensYAt(ray), 0.05);
      const outEnd = new THREE.Vector3(
        outgoingEndX,
        outgoing.y + outgoing.dy * ((outgoingEndX - outgoing.x) / outgoing.dx),
        0.05,
      );

      raysToDraw.push({
        incomingStart: inStart,
        incomingEnd: inEnd,
        outgoingEnd: outEnd,
        virtualEnd,
      });
    }

    this.rayBundle.update(raysToDraw);
  }

  /**
   * Returns the y at which the ray hits the lens plane (x = 0).
   * This is just ray.y propagated to x=0.
   */
  private lensYAt(ray: Ray2D): number {
    if (ray.dx === 0) return ray.y;
    const t = (0 - ray.x) / ray.dx;
    return ray.y + t * ray.dy;
  }

  init(renderer: THREE.WebGLRenderer) {
    this.domElement = renderer.domElement;
    this.domElement.addEventListener('pointerdown', this.onPointerDown);
    this.domElement.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
  }

  update(renderer: THREE.WebGLRenderer) {
    renderer.render(this.scene, this.camera);
  }

  onResize(width: number, height: number) {
    const aspect = width / height;
    const viewHeight = VIEW_HEIGHT;
    const viewWidth = viewHeight * aspect;
    this.camera.left = -viewWidth / 2;
    this.camera.right = viewWidth / 2;
    this.camera.top = viewHeight / 2;
    this.camera.bottom = -viewHeight / 2;
    this.camera.updateProjectionMatrix();
  }

  private updatePointerNDC(event: PointerEvent) {
    if (!this.domElement) return;
    const rect = this.domElement.getBoundingClientRect();
    this.pointerNDC.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNDC.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private onPointerDown = (event: PointerEvent) => {
    this.updatePointerNDC(event);
    this.raycaster.setFromCamera(this.pointerNDC, this.camera);
    const hit = this.raycaster.ray.intersectPlane(this.dragPlane, this.tmpVec);
    if (!hit) return;

    // Only start dragging if click is near the object's x-position.
    const s = useAppStore.getState().optics;
    if (Math.abs(hit.x - s.objectX) < 0.8) {
      this.dragging = true;
      useAppStore.getState().setOptics('objectX', this.clampObjectX(hit.x));
    }
  };

  private onPointerMove = (event: PointerEvent) => {
    if (!this.dragging) return;
    this.updatePointerNDC(event);
    this.raycaster.setFromCamera(this.pointerNDC, this.camera);
    const hit = this.raycaster.ray.intersectPlane(this.dragPlane, this.tmpVec);
    if (!hit) return;
    useAppStore.getState().setOptics('objectX', this.clampObjectX(hit.x));
  };

  private onPointerUp = () => {
    this.dragging = false;
  };

  /** Keep object on the left side and within the viewport. */
  private clampObjectX(x: number): number {
    const minX = -VIEW_WIDTH / 2 + 0.5;
    const maxX = -0.5;
    return Math.max(minX, Math.min(maxX, x));
  }

  dispose() {
    this.unsubscribe();
    if (this.domElement) {
      this.domElement.removeEventListener('pointerdown', this.onPointerDown);
      this.domElement.removeEventListener('pointermove', this.onPointerMove);
    }
    window.removeEventListener('pointerup', this.onPointerUp);

    this.axisLine.geometry.dispose();
    (this.axisLine.material as THREE.Material).dispose();
    this.lensMesh.geometry.dispose();
    this.lensMaterial.dispose();
    this.objectArrow.dispose();
    this.imageArrowReal.dispose();
    this.imageArrowVirtual.dispose();
    this.rayBundle.dispose();
    this.focalPoints.traverse((c) => {
      if (c instanceof THREE.Mesh) {
        c.geometry.dispose();
        if (c.material instanceof THREE.Material) c.material.dispose();
      }
    });
  }
}

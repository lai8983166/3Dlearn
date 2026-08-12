import * as THREE from 'three';

/**
 * Vertical arrow mesh used for both the object and the image marker.
 * The arrow's base sits at the origin and points up; position the group
 * to place it. Scale Y to change its height; scale Y negatively to flip.
 */
export class ArrowObject {
  readonly group: THREE.Group;
  private material: THREE.MeshBasicMaterial;

  constructor(color: string, opacity = 1.0) {
    this.group = new THREE.Group();
    this.material = new THREE.MeshBasicMaterial({
      color,
      transparent: opacity < 1,
      opacity,
      side: THREE.DoubleSide,
      depthWrite: opacity === 1,
    });

    // Arrow silhouette: shaft + triangular head, built as a single shape.
    const shape = new THREE.Shape();
    const shaftHalfWidth = 0.04;
    const headHalfWidth = 0.12;
    const headHeight = 0.25;
    const totalHeight = 1; // unit arrow; scale Y for actual height

    shape.moveTo(-shaftHalfWidth, 0);
    shape.lineTo(shaftHalfWidth, 0);
    shape.lineTo(shaftHalfWidth, totalHeight - headHeight);
    shape.lineTo(headHalfWidth, totalHeight - headHeight);
    shape.lineTo(0, totalHeight);
    shape.lineTo(-headHalfWidth, totalHeight - headHeight);
    shape.lineTo(-shaftHalfWidth, totalHeight - headHeight);
    shape.closePath();

    const geo = new THREE.ShapeGeometry(shape);
    geo.center();
    // Re-center so the base sits at y = 0 (re-center shifted it).
    geo.translate(0, 0.5, 0);
    this.group.add(new THREE.Mesh(geo, this.material));
  }

  setColor(color: string) {
    this.material.color.set(color);
  }

  setOpacity(opacity: number) {
    this.material.opacity = opacity;
    this.material.transparent = opacity < 1;
    this.material.depthWrite = opacity === 1;
    this.material.needsUpdate = true;
  }

  dispose() {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) obj.geometry.dispose();
    });
    this.material.dispose();
  }
}

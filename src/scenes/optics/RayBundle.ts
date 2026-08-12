import * as THREE from 'three';

/**
 * Pre-allocated line geometry for rendering the ray bundle.
 *
 * Each ray contributes up to 3 segments:
 *   segment 0: incoming  (object/source  →  lens plane)
 *   segment 1: outgoing  (lens plane  →  image plane / viewport edge)
 *   segment 2: virtual back-extension (lens plane → virtual image, dashed)
 *
 * Buffer is sized for `maxRays * 3 * 2` vertices = `maxRays * 6` points.
 * Unused vertices are degenerate (zero-length) so they render as nothing.
 */
const SEGMENTS_PER_RAY = 3;
const VERTS_PER_SEGMENT = 2;

export class RayBundle {
  readonly lines: THREE.LineSegments;
  readonly virtualLines: THREE.LineSegments;

  private positions: Float32Array;
  private colors: Float32Array;
  private virtualPositions: Float32Array;
  private maxRays: number;

  constructor(maxRays: number) {
    this.maxRays = maxRays;
    const vertexCount = maxRays * SEGMENTS_PER_RAY * VERTS_PER_SEGMENT;

    this.positions = new Float32Array(vertexCount * 3);
    this.colors = new Float32Array(vertexCount * 3);
    this.virtualPositions = new Float32Array(vertexCount * 3);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    const mat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
    });
    this.lines = new THREE.LineSegments(geo, mat);

    const vgeo = new THREE.BufferGeometry();
    vgeo.setAttribute(
      'position',
      new THREE.BufferAttribute(this.virtualPositions, 3),
    );
    const vmat = new THREE.LineDashedMaterial({
      color: 0xffcc66,
      transparent: true,
      opacity: 0.55,
      dashSize: 0.15,
      gapSize: 0.1,
    });
    this.virtualLines = new THREE.LineSegments(vgeo, vmat);
  }

  /**
   * Render the given rays. Each ray is drawn from its origin through the
   * lens plane to its endpoint; the dashed back-extension is drawn only
   * when `virtualEnd` is supplied.
   */
  update(
    rays: Array<{
      incomingStart: THREE.Vector3;
      incomingEnd: THREE.Vector3;
      outgoingEnd: THREE.Vector3;
      virtualEnd?: THREE.Vector3;
    }>,
  ) {
    // Zero-out buffers first so unused tail vertices render nothing.
    this.positions.fill(0);
    this.colors.fill(0);
    this.virtualPositions.fill(0);

    const rayColor = new THREE.Color(0xffe066);
    const lensColor = new THREE.Color(0xffaa33);

    for (let i = 0; i < Math.min(rays.length, this.maxRays); i++) {
      const r = rays[i];
      const base = i * SEGMENTS_PER_RAY * VERTS_PER_SEGMENT;

      // Segment 0: incoming (yellow, slightly dim).
      this.setVertex(base + 0, r.incomingStart, rayColor);
      this.setVertex(base + 1, r.incomingEnd, rayColor);

      // Segment 1: outgoing (yellow → orange tint at lens plane).
      this.setVertex(base + 2, r.incomingEnd, lensColor);
      this.setVertex(base + 3, r.outgoingEnd, rayColor);

      // Segment 2: dashed virtual back-extension (positions only; geometry
      // re-uses segment 1 endpoints).
      if (r.virtualEnd) {
        this.setVertex(base + 4, r.incomingEnd, rayColor);
        this.setVertex(base + 5, r.virtualEnd, rayColor);
        // Virtual lines geometry shares segment indices; copy into virtual buffer.
        this.setVertexVirtual(base + 4, r.incomingEnd);
        this.setVertexVirtual(base + 5, r.virtualEnd);
      }
    }

    const posAttr = this.lines.geometry.getAttribute('position') as THREE.BufferAttribute;
    const colorAttr = this.lines.geometry.getAttribute('color') as THREE.BufferAttribute;
    posAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;

    const vposAttr = this.virtualLines.geometry.getAttribute('position') as THREE.BufferAttribute;
    vposAttr.needsUpdate = true;

    // Recompute line distances for dashed material.
    this.virtualLines.computeLineDistances();
  }

  private setVertex(index: number, p: THREE.Vector3, color: THREE.Color) {
    this.positions[index * 3 + 0] = p.x;
    this.positions[index * 3 + 1] = p.y;
    this.positions[index * 3 + 2] = p.z;
    this.colors[index * 3 + 0] = color.r;
    this.colors[index * 3 + 1] = color.g;
    this.colors[index * 3 + 2] = color.b;
  }

  private setVertexVirtual(index: number, p: THREE.Vector3) {
    this.virtualPositions[index * 3 + 0] = p.x;
    this.virtualPositions[index * 3 + 1] = p.y;
    this.virtualPositions[index * 3 + 2] = p.z;
  }

  dispose() {
    this.lines.geometry.dispose();
    (this.lines.material as THREE.Material).dispose();
    this.virtualLines.geometry.dispose();
    (this.virtualLines.material as THREE.Material).dispose();
  }
}

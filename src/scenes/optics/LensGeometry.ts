import * as THREE from 'three';
import type { LensType } from '@/physics/optics';

/**
 * Build a stylized lens silhouette as a 2D THREE.Shape (in the XY plane).
 *
 * The shape is a teaching aid, not a precise optical surface — we only need
 * learners to recognise "convex (fat middle)" vs "concave (pinched middle)"
 * vs the plano variants.
 *
 * Profile model (per side, parametrised by t = y / halfHeight ∈ [-1, 1]):
 *   convex surface: x(t) = (thickness/2) · (1 − t²)        // fat in middle
 *   concave surface: x(t) = (thickness/2) · (0.3 + 0.7·t²) // thin in middle
 *   flat surface:    x(t) = ± thickness/2
 */
export function buildLensShape(
  type: LensType,
  halfHeight: number,
  thickness: number,
): THREE.Shape {
  const SEGMENTS = 32;
  const shape = new THREE.Shape();

  const rightSurfaceX = (ynorm: number): number => {
    const t = ynorm * ynorm;
    switch (type) {
      case 'biconvex':
      case 'planoconvex':
        return (thickness / 2) * (1 - t);
      case 'biconcave':
      case 'planoconcave':
        return (thickness / 2) * (0.3 + 0.7 * t);
    }
  };

  const leftSurfaceX = (ynorm: number): number => {
    const t = ynorm * ynorm;
    switch (type) {
      case 'biconvex':
        return -(thickness / 2) * (1 - t);
      case 'planoconvex':
        return -thickness / 2;
      case 'biconcave':
        return -(thickness / 2) * (0.3 + 0.7 * t);
      case 'planoconcave':
        return -thickness / 2;
    }
  };

  // Outline: top edge → right surface (top to bottom) → bottom edge →
  // left surface (bottom to top) → close.
  const top = halfHeight;
  const bottom = -halfHeight;

  shape.moveTo(leftSurfaceX(1), top);
  shape.lineTo(rightSurfaceX(1), top);

  for (let i = SEGMENTS - 1; i >= -SEGMENTS; i--) {
    const ynorm = i / SEGMENTS;
    const y = ynorm * halfHeight;
    shape.lineTo(rightSurfaceX(ynorm), y);
  }

  shape.lineTo(rightSurfaceX(-1), bottom);
  shape.lineTo(leftSurfaceX(-1), bottom);

  for (let i = -SEGMENTS + 1; i <= SEGMENTS; i++) {
    const ynorm = -i / SEGMENTS;
    const y = ynorm * halfHeight;
    shape.lineTo(leftSurfaceX(ynorm), y);
  }

  shape.closePath();
  return shape;
}

export function buildLensGeometry(
  type: LensType,
  halfHeight: number,
  thickness: number,
): THREE.ShapeGeometry {
  const shape = buildLensShape(type, halfHeight, thickness);
  const geo = new THREE.ShapeGeometry(shape);
  // Slight Z extrusion for depth perception via normals — keeps the
  // shape visible from grazing angles but stays visually flat.
  geo.center();
  return geo;
}

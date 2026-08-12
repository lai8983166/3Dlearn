/**
 * Geometric optics in a single plane (the "optical plane").
 *
 * Coordinate system (matches the 3D scene):
 *   +x  optical axis, light travels in the +x direction
 *   +y  transverse (object height, image height)
 *   z   ignored — we work in 2D
 *
 * Thin-lens / Cartesian sign convention:
 *   object x-position u  — real object on the left, so u < 0
 *   image  x-position v  — positive (right of lens) = real image,
 *                           negative (left of lens)  = virtual image
 *   focal length f       — positive = converging (biconvex, planoconvex),
 *                           negative = diverging  (biconcave, planoconcave)
 *
 * Thin-lens equation:    1/v - 1/u = 1/f
 * Lateral magnification: m = v / u  (negative → inverted)
 */

export type LensType = 'biconvex' | 'planoconvex' | 'biconcave' | 'planoconcave';

export interface LensConfig {
  type: LensType;
  /** Signed focal length. Sign follows the lens type by convention. */
  focalLength: number;
  /** Half-height (aperture radius) of the lens, for visualization only. */
  halfHeight: number;
}

/** A 2D ray in the optical plane. */
export interface Ray2D {
  /** Origin x (along optical axis). */
  x: number;
  /** Origin y (transverse). */
  y: number;
  /** Direction unit vector x-component. */
  dx: number;
  /** Direction unit vector y-component. */
  dy: number;
}

export interface ImagingResult {
  /** Signed image x-position relative to lens (positive = real, right side). */
  v: number;
  /** Signed magnification (negative = inverted). */
  magnification: number;
  isReal: boolean;
  isUpright: boolean;
  isEnlarged: boolean;
  /** Object on the same side as a real object (u < 0). */
  isVirtualObject: boolean;
}

/**
 * Compute image position and magnification from a thin lens.
 *
 * Returns v = ±Infinity when the object sits exactly on the focal point
 * (the refracted rays emerge parallel and never intersect on either side).
 */
export function computeThinLensImaging(
  objectX: number,
  focalLength: number,
): ImagingResult {
  if (focalLength === 0) {
    throw new Error('focalLength must be non-zero');
  }

  // 1/v - 1/u = 1/f  →  1/v = 1/f + 1/u
  const invV = 1 / focalLength + 1 / objectX;
  const v = 1 / invV;
  const magnification = v / objectX;

  return {
    v,
    magnification,
    isReal: Number.isFinite(v) && v > 0,
    isUpright: magnification > 0,
    isEnlarged: Math.abs(magnification) > 1,
    isVirtualObject: objectX > 0,
  };
}

/**
 * Refract a single ray through a thin lens located at x = 0.
 *
 * Uses the paraxial / small-angle approximation (slope ≈ angle), which is
 * the assumption underlying the thin-lens formula itself. In (y, slope)
 * form:
 *
 *   y_out     = y_in
 *   slope_out = slope_in - y_in / f
 *
 * Input ray is assumed to hit the lens plane (x = 0). The returned ray
 * starts at (0, yLens) and propagates to the right; the caller extends it
 * to wherever it needs to be drawn.
 */
export function refractThroughThinLens(
  ray: Ray2D,
  focalLength: number,
): Ray2D {
  if (ray.dx === 0) {
    throw new Error('Ray is parallel to the lens plane; cannot refract');
  }

  // Propagate to x = 0.
  const tToLens = (0 - ray.x) / ray.dx;
  const yLens = ray.y + tToLens * ray.dy;
  const slopeIn = ray.dy / ray.dx;

  // Thin lens refraction (paraxial).
  const slopeOut = slopeIn - yLens / focalLength;

  // Renormalize direction so (dx, dy) is a unit vector.
  const norm = Math.hypot(1, slopeOut);
  return {
    x: 0,
    y: yLens,
    dx: 1 / norm,
    dy: slopeOut / norm,
  };
}

/**
 * Return the (x, y) point where `ray` reaches `targetX`.
 * Caller must ensure ray.dx ≠ 0.
 */
export function extendRayTo(
  ray: Ray2D,
  targetX: number,
): { x: number; y: number } {
  if (ray.dx === 0) return { x: ray.x, y: ray.y };
  const t = (targetX - ray.x) / ray.dx;
  return { x: targetX, y: ray.y + t * ray.dy };
}

/**
 * Build N rays for "parallel light": all with the same slope (0 by default),
 * evenly spaced in y across the lens aperture, originating from the left
 * edge of the visible region.
 */
export function buildParallelRayBundle(
  count: number,
  lensHalfHeight: number,
  originX: number,
): Ray2D[] {
  const rays: Ray2D[] = [];
  for (let i = 0; i < count; i++) {
    const y = ((i + 1) / (count + 1)) * 2 - 1; // (-1, 1)
    rays.push({
      x: originX,
      y: y * lensHalfHeight,
      dx: 1,
      dy: 0,
    });
  }
  return rays;
}

/**
 * Build N rays for a "point source": a fan radiating from a single point.
 */
export function buildPointSourceRayBundle(
  count: number,
  sourceX: number,
  sourceY: number,
  lensHalfHeight: number,
  /** Unused for now — kept for API symmetry with parallel bundle. */
  _spread: number,
): Ray2D[] {
  const rays: Ray2D[] = [];
  for (let i = 0; i < count; i++) {
    const t = (i + 1) / (count + 1); // (0, 1)
    const targetY = (t * 2 - 1) * lensHalfHeight;
    const targetX = 0; // aim at the lens plane
    const dx = targetX - sourceX;
    const dy = targetY - sourceY;
    const len = Math.hypot(dx, dy);
    rays.push({
      x: sourceX,
      y: sourceY,
      dx: dx / len,
      dy: dy / len,
    });
  }
  return rays;
}

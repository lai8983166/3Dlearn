import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Build the classic "letter F" teaching shape used in graphics
 * textbooks (Foley / van Dam). Asymmetric in all directions so any
 * rotation, scale, or reflection is immediately visible.
 *
 * Composed of three merged BoxGeometry pieces:
 *   - vertical stem on the left
 *   - top horizontal arm attached to upper stem
 *   - middle horizontal arm attached to mid stem
 *
 * After merging we call .center() so the bounding-box centroid sits
 * at the origin — rotations then happen around the F's geometric
 * center, not a corner.
 */
export function buildFGeometry(): THREE.BufferGeometry {
  const stem = new THREE.BoxGeometry(0.4, 3.0, 0.2);
  const topArm = new THREE.BoxGeometry(1.6, 0.4, 0.2).translate(0.6, 1.3, 0);
  const midArm = new THREE.BoxGeometry(1.2, 0.4, 0.2).translate(0.4, 0.0, 0);

  const merged = mergeGeometries([stem, topArm, midArm], false);
  if (!merged) {
    throw new Error('failed to merge F geometry');
  }
  merged.center();
  merged.computeVertexNormals();
  return merged;
}

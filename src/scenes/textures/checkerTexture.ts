import * as THREE from 'three';

/**
 * Procedural checkerboard CanvasTexture. Zero download. The cell count
 * is baked into the canvas (regenerating when changed); filtering and
 * wrapping are applied by the caller via the returned texture's
 * properties.
 */
const TEX_SIZE = 256;

export function generateCheckerTexture(cellsPerAxis: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = TEX_SIZE;
  canvas.height = TEX_SIZE;
  const ctx = canvas.getContext('2d')!;
  const cell = TEX_SIZE / cellsPerAxis;
  for (let y = 0; y < cellsPerAxis; y++) {
    for (let x = 0; x < cellsPerAxis; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? '#f2f2f2' : '#1f2937';
      ctx.fillRect(x * cell, y * cell, cell, cell);
    }
  }
  // Add a red marker in the (0,0) cell so wrapping/tiling behavior is
  // visible — without it every cell looks identical and you can't tell
  // mirror-flipping from plain repeat.
  ctx.fillStyle = '#e85d75';
  ctx.fillRect(0, 0, cell * 0.4, cell * 0.4);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

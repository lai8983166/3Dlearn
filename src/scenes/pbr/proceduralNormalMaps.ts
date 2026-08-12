import * as THREE from 'three';
import type { NormalMapPreset } from '@/store';

/**
 * Procedurally generate normal maps so we avoid any binary asset download.
 *
 * Pipeline: build a height field for the preset → finite-difference it into
 * a tangent-space normal map → upload as a DataTexture (RGBA, repeat wrap).
 * All three presets are 256×256, packed as 4 bytes/texel = 256 KB each in
 * GPU memory (well under the 200 KB-per-preset bundle budget after gzip —
 * and zero network cost since the bytes are generated at runtime).
 */

const SIZE = 256;

function generateHeight(preset: NormalMapPreset): Float32Array {
  const h = new Float32Array(SIZE * SIZE);

  if (preset === 'smooth') {
    h.fill(0.5);
    return h;
  }

  if (preset === 'bricks') {
    const brickH = SIZE / 8;
    const brickW = SIZE / 4;
    const mortar = 3;
    for (let y = 0; y < SIZE; y++) {
      const row = Math.floor(y / brickH);
      const xOffset = row % 2 === 0 ? 0 : brickW / 2;
      for (let x = 0; x < SIZE; x++) {
        const xl = (x + xOffset) % brickW;
        const yl = y % brickH;
        const inMortar = xl < mortar || yl < mortar;
        h[y * SIZE + x] = inMortar ? 0.0 : 0.8;
      }
    }
    // Lightly smooth brick surface so corners aren't razor-sharp.
    return boxSmooth(h, SIZE, 1);
  }

  // 'hammered' — sum of sines at incommensurate frequencies gives a dent pattern.
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const v =
        Math.sin(x * 0.31 + y * 0.27) * 0.25 +
        Math.sin(x * 0.13 - y * 0.19) * 0.25 +
        Math.sin(x * 0.07 + y * 0.41) * 0.2 +
        0.5;
      h[y * SIZE + x] = v;
    }
  }
  return h;
}

function boxSmooth(h: Float32Array, size: number, radius: number): Float32Array {
  const out = new Float32Array(h.length);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let sum = 0;
      let count = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const xx = (x + dx + size) % size;
          const yy = (y + dy + size) % size;
          sum += h[yy * size + xx];
          count++;
        }
      }
      out[y * size + x] = sum / count;
    }
  }
  return out;
}

function heightToNormalTexture(
  height: Float32Array,
  strength: number,
): THREE.DataTexture {
  const data = new Uint8Array(SIZE * SIZE * 4);
  const at = (x: number, y: number) =>
    height[((y + SIZE) % SIZE) * SIZE + ((x + SIZE) % SIZE)];

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const nz = 1.0;
      const len = Math.sqrt(dx * dx + dy * dy + nz * nz);
      const i = (y * SIZE + x) * 4;
      data[i] = Math.floor(((dx / len) * 0.5 + 0.5) * 255);
      data[i + 1] = Math.floor(((dy / len) * 0.5 + 0.5) * 255);
      data[i + 2] = Math.floor(((nz / len) * 0.5 + 0.5) * 255);
      data[i + 3] = 255;
    }
  }

  const tex = new THREE.DataTexture(data, SIZE, SIZE, THREE.RGBAFormat);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.NoColorSpace; // normal maps are linear data
  tex.needsUpdate = true;
  return tex;
}

const cache = new Map<NormalMapPreset, THREE.DataTexture>();

export function getNormalMap(preset: NormalMapPreset): THREE.DataTexture {
  let tex = cache.get(preset);
  if (tex) return tex;
  const height = generateHeight(preset);
  const strength = preset === 'bricks' ? 3.0 : preset === 'hammered' ? 2.5 : 1.0;
  tex = heightToNormalTexture(height, strength);
  cache.set(preset, tex);
  return tex;
}

export function disposeNormalMaps() {
  cache.forEach((t) => t.dispose());
  cache.clear();
}

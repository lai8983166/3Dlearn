import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { hdriGet, hdriHas, hdriSet } from './hdriCache';
import { getHdriById } from './hdriCatalog';

export interface LoadProgress {
  receivedBytes: number;
  totalBytes: number;
  /** 0–1, computed from receivedBytes/totalBytes. */
  ratio: number;
}

export interface LoadResult {
  /** PMREM-processed equirectangular env map, ready for scene.environment. */
  envTexture: THREE.Texture;
}

/**
 * Load an HDRI by id with cache + progress reporting.
 *
 * Flow:
 *   1. Look up catalog metadata (URL, expected size).
 *   2. If cached in IndexedDB, build a blob URL from the cached bytes.
 *   3. Otherwise, fetch with ReadableStream progress, cache the ArrayBuffer,
 *      then build a blob URL.
 *   4. RGBELoader.load(blobUrl) → equirectangular DataTexture.
 *   5. PMREMGenerator.fromEquirectangular → filtered env map.
 *
 * The PMREMGenerator is caller-supplied so the renderer can own it (PMREM
 * holds GPU state tied to the renderer).
 */
export async function loadHDRI(
  id: string,
  pmrem: THREE.PMREMGenerator,
  onProgress?: (p: LoadProgress) => void,
  signal?: AbortSignal,
): Promise<LoadResult> {
  const entry = getHdriById(id);
  if (!entry) throw new Error(`Unknown HDRI id: ${id}`);

  const totalBytes = entry.sizeBytes;
  let buffer: ArrayBuffer | null = null;

  if (await hdriHas(id)) {
    buffer = await hdriGet(id);
    if (buffer) {
      onProgress?.({ receivedBytes: buffer.byteLength, totalBytes, ratio: 1 });
    }
  }

  if (!buffer) {
    buffer = await fetchWithProgress(entry.url, totalBytes, onProgress, signal);
    void hdriSet(id, buffer);
  }

  // Wrap the ArrayBuffer in a blob URL so RGBELoader.load (which expects a
  // URL) can consume it. This avoids relying on the .parse() overload whose
  // return type changed between Three.js versions.
  const blob = new Blob([buffer], { type: 'application/octet-stream' });
  const blobUrl = URL.createObjectURL(blob);

  try {
    const equiTexture = await loadRgbe(blobUrl);
    const envTexture = pmrem.fromEquirectangular(equiTexture).texture;
    equiTexture.dispose();
    return { envTexture };
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

function loadRgbe(url: string): Promise<THREE.DataTexture> {
  return new Promise((resolve, reject) => {
    const loader = new RGBELoader();
    loader.load(url, resolve, undefined, reject);
  });
}

async function fetchWithProgress(
  url: string,
  totalBytes: number,
  onProgress?: (p: LoadProgress) => void,
  signal?: AbortSignal,
): Promise<ArrayBuffer> {
  const response = await fetch(url, { signal, mode: 'cors' });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }

  const clHeader = response.headers.get('content-length');
  const total = clHeader ? parseInt(clHeader, 10) : totalBytes;

  if (!response.body) {
    const buf = await response.arrayBuffer();
    onProgress?.({ receivedBytes: buf.byteLength, totalBytes: total, ratio: 1 });
    return buf;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      received += value.byteLength;
      onProgress?.({
        receivedBytes: received,
        totalBytes: total,
        ratio: total > 0 ? received / total : 0,
      });
    }
  }

  const merged = new Uint8Array(received);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.byteLength;
  }
  return merged.buffer;
}

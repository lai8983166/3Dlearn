/**
 * Catalog of HDRIs available for the PBR module's Env layer.
 *
 * Sources were chosen for CORS-friendliness and global reachability:
 *   - threejs.org/examples   GitHub Pages CDN, ACAO *
 *   - dl.polyhaven.com       Backblaze B2, ACAO *
 *
 * All files are 1k-resolution (1024×512) Radiance HDR — roughly 1–1.5 MB
 * each, much smaller than the original 5–20 MB estimate in the proposal.
 */

export interface HdriEntry {
  /** Internal id (used as IndexedDB key). */
  id: string;
  /** Display name. */
  label: string;
  /** Short description for the picker UI. */
  description: string;
  url: string;
  /** Expected size in bytes (from HEAD Content-Length at catalog build time). */
  sizeBytes: number;
}

export const HDRI_CATALOG: readonly HdriEntry[] = [
  {
    id: 'pedestrian_overpass_1k',
    label: 'Pedestrian Overpass',
    description: 'Outdoor, urban daylight',
    url: 'https://threejs.org/examples/textures/equirectangular/pedestrian_overpass_1k.hdr',
    sizeBytes: 1_513_980,
  },
  {
    id: 'quarry_01_1k',
    label: 'Quarry',
    description: 'Outdoor, overcast nature',
    url: 'https://threejs.org/examples/textures/equirectangular/quarry_01_1k.hdr',
    sizeBytes: 1_478_284,
  },
  {
    id: 'studio_small_08_1k',
    label: 'Studio Small 08',
    description: 'Indoor, soft studio lighting',
    url: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_08_1k.hdr',
    sizeBytes: 1_508_872,
  },
  {
    id: 'old_hall_1k',
    label: 'Old Hall',
    description: 'Indoor, historic warm light',
    url: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/old_hall_1k.hdr',
    sizeBytes: 1_048_576, // approx — confirmed at build time
  },
  {
    id: 'rathaus_1k',
    label: 'Rathaus',
    description: 'Indoor, large architectural space',
    url: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/rathaus_1k.hdr',
    sizeBytes: 1_048_576,
  },
] as const;

export function getHdriById(id: string): HdriEntry | undefined {
  return HDRI_CATALOG.find((h) => h.id === id);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

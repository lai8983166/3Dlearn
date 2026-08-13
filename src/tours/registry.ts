import type { ModuleId } from '@/store';
import type { Tour } from './types';
import { PBR_TOURS } from './pbrTours';
import { OPTICS_TOURS } from './opticsTours';
import { SHADOW_TOURS } from './shadowTours';
import { TEXTURE_TOURS } from './textureTours';
import { TRANSFORM_TOURS } from './transformTours';
import { COLOR_TOURS } from './colorTours';
import { DEPTH_TOURS } from './depthTours';
import { BLOOM_TOURS } from './bloomTours';
import { BRDF_TOURS } from './brdfTours';

/**
 * Tour catalog. New tours are registered here so the dropdown and
 * help-modal launchpad pick them up automatically.
 */
export const ALL_TOURS: readonly Tour[] = [
  ...PBR_TOURS,
  ...OPTICS_TOURS,
  ...SHADOW_TOURS,
  ...TEXTURE_TOURS,
  ...TRANSFORM_TOURS,
  ...COLOR_TOURS,
  ...DEPTH_TOURS,
  ...BLOOM_TOURS,
  ...BRDF_TOURS,
];

export function toursForModule(module: ModuleId): Tour[] {
  return ALL_TOURS.filter((t) => t.module === module);
}

export function getTourById(id: string): Tour | undefined {
  return ALL_TOURS.find((t) => t.id === id);
}

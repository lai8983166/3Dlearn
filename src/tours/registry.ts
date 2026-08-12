import type { ModuleId } from '@/store';
import type { Tour } from './types';
import { PBR_TOURS } from './pbrTours';

/**
 * Tour catalog. New tours are registered here so the dropdown and
 * help-modal launchpad pick them up automatically.
 */
export const ALL_TOURS: readonly Tour[] = [...PBR_TOURS];

export function toursForModule(module: ModuleId): Tour[] {
  return ALL_TOURS.filter((t) => t.module === module);
}

export function getTourById(id: string): Tour | undefined {
  return ALL_TOURS.find((t) => t.id === id);
}

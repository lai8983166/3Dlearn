import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/store';
import { toursForModule } from '@/tours/registry';
import { tourRunner } from '@/tours/runner';

/**
 * Sidebar header with a "Demos ▾" dropdown listing the current module's
 * tours. Selecting an item starts the tour. Also surfaces the
 * "restore to before tour" affordance when a tour snapshot exists.
 */
export function TourDropdown() {
  const activeModule = useAppStore((s) => s.activeModule);
  const tours = toursForModule(activeModule);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click-outside.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const startTour = (id: string) => {
    const tour = tours.find((t) => t.id === id);
    if (!tour) return;
    setOpen(false);
    tourRunner.start(tour);
  };

  return (
    <section ref={containerRef} className="relative">
      <div className="flex gap-2">
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex-1 rounded bg-accent/15 px-3 py-2 text-left text-sm text-accent transition hover:bg-accent/25"
        >
          ▶ 演示场景{open ? ' ▴' : ' ▾'}
        </button>
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded border border-panel-light bg-panel shadow-2xl">
          {tours.map((tour) => (
            <button
              key={tour.id}
              onClick={() => startTour(tour.id)}
              className="block w-full px-3 py-2 text-left transition hover:bg-panel-light"
            >
              <div className="text-sm text-gray-100">{tour.label}</div>
              <div className="text-[10px] text-gray-500">{tour.description}</div>
            </button>
          ))}
        </div>
      )}

      <RestoreButton />
    </section>
  );
}

/**
 * "Restore to before tour" — visible whenever the runner has a snapshot,
 * i.e. a tour has run (completed or skipped) and the user hasn't yet
 * manually modified state. Let the learner undo the demo's parameter
 * changes without resetting everything by hand.
 */
function RestoreButton() {
  // Subscribe to narration + activeInterruption so we re-render when
  // a tour starts/ends (and the snapshot may have been created/cleared).
  useAppStore((s) => s.narration);
  useAppStore((s) => s.activeInterruption);
  // We can't subscribe to the runner's internal hasSnapshot() reactively;
  // poll once on each render via a forced update through store changes.
  // The runner cancels when the user acts, which triggers a state update,
  // so this is sufficient.

  if (!tourRunner.hasSnapshot()) return null;
  if (useAppStore.getState().activeInterruption.kind === 'tour') return null;

  return (
    <button
      onClick={() => tourRunner.restore()}
      className="mt-2 w-full rounded border border-panel-light bg-panel px-3 py-1.5 text-xs text-gray-400 transition hover:bg-panel-light hover:text-white"
    >
      ↩ 还原到上一个演示前
    </button>
  );
}

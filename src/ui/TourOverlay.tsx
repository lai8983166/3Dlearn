import { useAppStore } from '@/store';
import { tourRunner } from '@/tours/runner';

/**
 * Narration bar that floats over the top of the canvas while a tour is
 * running. Shows the current step's narration, a step counter, and a
 * Skip button. Hidden when no tour is active.
 */
export function TourOverlay() {
  const narration = useAppStore((s) => s.narration);
  const interruption = useAppStore((s) => s.activeInterruption);

  if (!narration || interruption.kind !== 'tour') return null;

  const stepNum = narration.stepIndex + 1;
  const isLast = narration.stepIndex === narration.stepCount - 1;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-4 z-30 flex justify-center px-4">
      <div className="pointer-events-auto flex max-w-2xl items-center gap-3 rounded-lg border border-accent/40 bg-panel/95 px-4 py-3 shadow-2xl backdrop-blur-sm">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/15 font-mono text-xs text-accent">
          {stepNum}/{narration.stepCount}
        </div>
        <p className="flex-1 text-sm leading-relaxed text-gray-100">
          {narration.text}
        </p>
        <button
          onClick={() => tourRunner.skip()}
          className="shrink-0 rounded bg-panel-light px-3 py-1.5 text-xs text-gray-300 transition hover:bg-panel hover:text-white"
        >
          {isLast ? '完成' : '跳过'}
        </button>
      </div>
    </div>
  );
}

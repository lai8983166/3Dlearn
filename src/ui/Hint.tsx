import { useEffect, useState } from 'react';
import { getHintController } from '@/hints/trigger';
import type { Hint } from '@/hints/definitions';

/**
 * Toast component shown bottom-right when a contextual hint fires.
 * Auto-dismisses after 6 seconds (timer owned by the controller); user
 * can also click "明白了" to dismiss immediately.
 *
 * The toast is intentionally non-modal: pointer events on the toast
 * itself, but it doesn't block the canvas or other UI.
 */
export function HintToast() {
  const [hint, setHint] = useState<Hint | null>(null);

  useEffect(() => {
    const controller = getHintController();
    const unsub = controller.subscribe(setHint);
    return unsub;
  }, []);

  if (!hint) return null;

  return (
    <div className="pointer-events-none absolute bottom-6 right-6 z-30 flex justify-end">
      <div
        key={hint.id}
        className="hint-toast-animation pointer-events-auto flex max-w-[320px] items-start gap-3 rounded-lg border border-yellow-500/40 bg-panel/95 px-4 py-3 shadow-2xl backdrop-blur-sm"
      >
        <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-yellow-500/20 text-xs text-yellow-400">
          ?
        </div>
        <div className="flex-1">
          <p className="text-sm leading-relaxed text-gray-100">{hint.message}</p>
          <button
            onClick={() => getHintController().dismiss()}
            className="mt-1 text-[10px] uppercase tracking-wider text-gray-400 transition hover:text-white"
          >
            明白了
          </button>
        </div>
      </div>
    </div>
  );
}

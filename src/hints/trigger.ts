import { useAppStore } from '@/store';
import { HINTS, type Hint } from './definitions';

/**
 * Hint trigger engine. Subscribes to the store and, on every change,
 * scans hints for the first one that (a) applies to the active module,
 * (b) matches its condition, and (c) hasn't been seen before.
 *
 * Honors the activeInterruption state: hints are suppressed entirely
 * while a tour or help modal owns the focus, so the user is never
 * double-teamed by teaching elements.
 *
 * On a match, the engine:
 *   - marks the hint as seen (id added to seenHints)
 *   - sets activeInterruption to { kind: 'hint', hintId } for 6 seconds
 *   - emits the hint to subscribers (the Toast component)
 *
 * The 6-second auto-dismiss clears the activeInterruption back to 'none'.
 */
export interface HintController {
  /** Get the currently-showing hint (if any). */
  current: () => Hint | null;
  /** Subscribe to hint-show / hint-dismiss events. */
  subscribe: (fn: (hint: Hint | null) => void) => () => void;
  /** Programmatically dismiss the current hint (used by the toast UI). */
  dismiss: () => void;
  /** Tear down store subscription. Call once at app shutdown. */
  destroy: () => void;
}

export function createHintController(): HintController {
  const listeners = new Set<(hint: Hint | null) => void>();
  let current: Hint | null = null;
  let dismissTimer: ReturnType<typeof setTimeout> | null = null;

  const emit = (hint: Hint | null) => {
    current = hint;
    listeners.forEach((fn) => fn(hint));
  };

  const dismiss = () => {
    if (dismissTimer) {
      clearTimeout(dismissTimer);
      dismissTimer = null;
    }
    if (current === null) return;
    const state = useAppStore.getState();
    if (state.activeInterruption.kind === 'hint') {
      useAppStore.getState().setActiveInterruption({ kind: 'none' });
    }
    emit(null);
  };

  const evaluate = () => {
    const state = useAppStore.getState();

    // Suppress while tour or help owns focus.
    if (
      state.activeInterruption.kind === 'tour' ||
      state.activeInterruption.kind === 'help'
    ) {
      return;
    }
    // If a hint is already showing, don't stack — wait for dismiss/timeout.
    if (current !== null) return;

    const candidate = HINTS.find(
      (h) =>
        h.appliesTo === state.activeModule &&
        !state.seenHints.includes(h.id) &&
        h.condition(state),
    );
    if (!candidate) return;

    useAppStore.getState().markHintSeen(candidate.id);
    useAppStore.getState().setActiveInterruption({
      kind: 'hint',
      hintId: candidate.id,
    });
    emit(candidate);

    dismissTimer = setTimeout(() => {
      dismissTimer = null;
      dismiss();
    }, 6000);
  };

  const unsub = useAppStore.subscribe(() => {
    evaluate();
  });

  return {
    current: () => current,
    subscribe: (fn) => {
      listeners.add(fn);
      // Replay current state on subscribe so a late mount catches an
      // already-showing hint.
      fn(current);
      return () => listeners.delete(fn);
    },
    dismiss,
    destroy: () => {
      unsub();
      if (dismissTimer) clearTimeout(dismissTimer);
      listeners.clear();
    },
  };
}

/**
 * Module-level singleton. Lazily created so the store is initialised
 * before the subscription attaches.
 */
let _controller: HintController | null = null;
export function getHintController(): HintController {
  if (!_controller) _controller = createHintController();
  return _controller;
}

import { useEffect, useRef } from 'react';
import { useAppStore } from '@/store';
import { HELP_CONTENT } from './helpContent';
import { toursForModule } from '@/tours/registry';
import { tourRunner } from '@/tours/runner';
import { TOTAL_HINTS } from '@/hints/definitions';

interface HelpModalProps {
  onClose: () => void;
}

/**
 * Teaching modal opened by the header "?" button. Wires three areas:
 *   1. Concept overview + operation guide for the active module
 *   2. Tour launchpad (placeholder until Phase 2 wires the runner)
 *   3. Hint status: "已看 X/5" with reset button
 *
 * Accessibility: focus is moved into the modal on open, Tab cycles
 * between interactive elements, Esc closes and returns focus to the
 * button that opened it (the caller is responsible for that — we just
 * call onClose).
 */
export function HelpModal({ onClose }: HelpModalProps) {
  const activeModule = useAppStore((s) => s.activeModule);
  const seenHints = useAppStore((s) => s.seenHints);
  const resetHints = useAppStore((s) => s.resetHints);
  const setActiveInterruption = useAppStore((s) => s.setActiveInterruption);

  const containerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Move focus into the modal on open.
  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  // Esc to close + focus trap.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'Tab') {
        const container = containerRef.current;
        if (!container) return;
        const focusable = container.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Mark modal as the active interruption while open so contextual
  // hints don't fire during help reading.
  useEffect(() => {
    setActiveInterruption({ kind: 'help' });
    return () => {
      // Only clear if we still own it — a tour or hint may have taken over.
      const current = useAppStore.getState().activeInterruption;
      if (current.kind === 'help') {
        setActiveInterruption({ kind: 'none' });
      }
    };
  }, [setActiveInterruption]);

  const content = HELP_CONTENT[activeModule];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label={`帮助 — ${content.title}`}
        className="max-h-[85vh] w-[min(560px,92vw)] overflow-y-auto rounded-lg border border-panel-light bg-panel p-6 shadow-2xl"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold">{content.title}</h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="关闭帮助"
            className="-mr-1 -mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded text-gray-400 transition hover:bg-panel-light hover:text-white"
          >
            ✕
          </button>
        </div>

        <section className="mb-5">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-accent-dim">
            核心概念
          </h3>
          <p className="text-sm leading-relaxed text-gray-200">
            {content.concept}
          </p>
        </section>

        <section className="mb-5">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-accent-dim">
            操作指南
          </h3>
          <ul className="space-y-1.5">
            {content.operations.map((op, i) => (
              <li
                key={i}
                className="flex gap-2 text-sm leading-relaxed text-gray-200"
              >
                <span className="font-mono text-accent">·</span>
                <span>{op}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-5 rounded bg-panel-light/60 p-3">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-accent-dim">
            演示场景
          </h3>
          <div className="space-y-1">
            {toursForModule(activeModule).map((tour) => (
              <button
                key={tour.id}
                onClick={() => {
                  tourRunner.start(tour);
                  onClose();
                }}
                className="block w-full rounded px-2 py-1.5 text-left transition hover:bg-panel"
              >
                <div className="text-sm text-gray-100">▶ {tour.label}</div>
                <div className="text-[10px] text-gray-500">{tour.description}</div>
              </button>
            ))}
          </div>
        </section>

        <section className="flex items-center justify-between rounded bg-panel-light/60 p-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-accent-dim">
              教学提示状态
            </div>
            <div className="mt-1 font-mono text-sm text-gray-200">
              已看 {seenHints.length} / {TOTAL_HINTS}
            </div>
          </div>
          <button
            onClick={resetHints}
            className="rounded bg-panel px-3 py-1.5 text-xs text-gray-300 transition hover:bg-panel-light hover:text-white"
          >
            重置提示
          </button>
        </section>
      </div>
    </div>
  );
}

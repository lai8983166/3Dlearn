import { useState } from 'react';
import { useAppStore } from '@/store';
import { HDRI_CATALOG, formatBytes, type HdriEntry } from '@/shared/hdriCatalog';

/**
 * Inline HDRI selector. Shows the current environment, a list of options
 * with size, an in-flight progress bar, and retry-on-error.
 *
 * The "Default" entry switches back to the zero-download
 * RoomEnvironment — useful for offline / slow-network situations.
 */
export function HdriPicker() {
  const pbr = useAppStore((s) => s.pbr);
  const setPbr = useAppStore((s) => s.setPbr);
  const [pendingPick, setPendingPick] = useState<HdriEntry | null>(null);

  const status = pbr.hdriStatus;
  const isLoading = status.state === 'loading';
  const isError = status.state === 'error';
  const loadingId =
    status.state === 'loading' || status.state === 'error'
      ? status.id
      : null;

  const handleConfirm = (entry: HdriEntry | null) => {
    setPendingPick(null);
    setPbr('hdriId', entry?.id ?? null);
  };

  return (
    <section>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
        Environment
      </h2>

      <div className="space-y-2">
        <div className="rounded bg-panel-light px-3 py-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-400">Current</div>
              <div className="font-mono text-sm text-accent">
                {pbr.hdriId ?? 'RoomEnvironment (default)'}
              </div>
            </div>
            {(isLoading || isError) && loadingId && (
              <span
                className={`text-[10px] uppercase ${
                  isError ? 'text-red-400' : 'text-yellow-400'
                }`}
              >
                {isError ? 'failed' : 'loading'}
              </span>
            )}
          </div>
          {pbr.hdriId && (
            <button
              onClick={() => handleConfirm(null)}
              disabled={isLoading}
              className="mt-2 w-full rounded bg-panel px-2 py-1 text-[11px] text-gray-300 transition hover:bg-panel/60 disabled:opacity-40"
            >
              ↩ Revert to RoomEnvironment
            </button>
          )}
        </div>

        {/* In-flight progress */}
        {isLoading && loadingId && (
          <ProgressBar
            received={status.state === 'loading' ? status.receivedBytes : 0}
            total={status.state === 'loading' ? status.totalBytes : 0}
          />
        )}

        {/* Error message */}
        {isError && loadingId && (
          <div className="rounded bg-red-950/40 px-3 py-2 text-[11px] text-red-300">
            <div className="mb-1 font-semibold">Download failed</div>
            <div className="break-words font-mono text-[10px] text-red-400/80">
              {status.state === 'error' ? status.message : ''}
            </div>
            <button
              onClick={() => setPbr('hdriId', loadingId)}
              className="mt-2 w-full rounded bg-red-500/30 px-2 py-1 text-xs text-red-200 transition hover:bg-red-500/50"
            >
              ↻ Retry {loadingId}
            </button>
          </div>
        )}

        {/* Catalog */}
        {!isLoading && (
          <div className="space-y-1">
            {HDRI_CATALOG.map((entry) => {
              const isActive = pbr.hdriId === entry.id;
              const source = new URL(entry.url).hostname;
              return (
                <button
                  key={entry.id}
                  onClick={() => setPendingPick(entry)}
                  disabled={isActive}
                  className={`w-full rounded px-3 py-2 text-left transition disabled:opacity-50 ${
                    isActive
                      ? 'bg-accent/15 ring-1 ring-accent/40'
                      : 'bg-panel-light hover:bg-panel-light/70'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{entry.label}</span>
                    <span className="font-mono text-[10px] text-gray-400">
                      {formatBytes(entry.sizeBytes)}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[10px] text-gray-500">
                    {entry.description} · {source}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirmation modal */}
      {pendingPick && (
        <ConfirmDialog
          entry={pendingPick}
          onCancel={() => setPendingPick(null)}
          onConfirm={() => handleConfirm(pendingPick)}
        />
      )}
    </section>
  );
}

function ProgressBar({
  received,
  total,
}: {
  received: number;
  total: number;
}) {
  const ratio = total > 0 ? received / total : 0;
  const pct = Math.round(ratio * 100);
  return (
    <div className="rounded bg-panel-light px-3 py-2">
      <div className="mb-1 flex items-center justify-between text-[10px] text-gray-400">
        <span>Downloading…</span>
        <span className="font-mono">
          {formatBytes(received)} / {total > 0 ? formatBytes(total) : '?'}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-panel">
        <div
          className="h-full bg-accent transition-[width] duration-150"
          style={{ width: `${Math.max(2, pct)}%` }}
        />
      </div>
      <div className="mt-1 text-right font-mono text-[10px] text-accent">
        {pct}%
      </div>
    </div>
  );
}

function ConfirmDialog({
  entry,
  onCancel,
  onConfirm,
}: {
  entry: HdriEntry;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onCancel}
    >
      <div
        className="w-80 rounded-lg border border-panel-light bg-panel p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-2 text-sm font-semibold">Download HDRI?</h3>
        <p className="text-xs text-gray-300">
          <strong className="text-accent">{entry.label}</strong> ·{' '}
          {formatBytes(entry.sizeBytes)}
        </p>
        <p className="mt-2 text-[11px] text-gray-500">
          The file will be cached in IndexedDB so subsequent loads of the same
          HDRI are instant and offline-capable.
        </p>
        <div className="mt-4 flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 rounded bg-panel-light px-3 py-1.5 text-xs text-gray-300 transition hover:bg-panel"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded bg-accent px-3 py-1.5 text-xs font-semibold text-panel transition hover:bg-accent-dim"
          >
            Download
          </button>
        </div>
      </div>
    </div>
  );
}

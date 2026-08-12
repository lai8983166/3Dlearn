import * as THREE from 'three';
import { useEffect, useRef, useState } from 'react';
import type { TransformsState } from '@/store';
import { matrixElement } from '@/scenes/transforms/TransformModule';

interface MatrixViewProps {
  state: TransformsState;
}

/**
 * 4×4 matrix display. Reads the same composition the TransformModule
 * applies to the live F, then renders the resulting 16 numbers in
 * row-major form. Cells whose value just changed get a brief
 * background flash to draw the learner's eye.
 */
export function MatrixView({ state }: MatrixViewProps) {
  const matrix = composeDisplayMatrix(state);
  const prevValues = useRef<number[][]>(
    Array.from({ length: 4 }, () => [0, 0, 0, 0]),
  );
  const [flashing, setFlashing] = useState<Set<string>>(new Set());

  useEffect(() => {
    const changed: string[] = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const prev = prevValues.current[r][c];
        const next = matrix[r][c];
        if (Math.abs(prev - next) > 1e-6) {
          changed.push(`${r}-${c}`);
        }
        prevValues.current[r][c] = next;
      }
    }
    if (changed.length > 0) {
      const next = new Set(changed);
      setFlashing(next);
      const t = setTimeout(() => setFlashing(new Set()), 400);
      return () => clearTimeout(t);
    }
  }, [matrix]);

  return (
    <div className="rounded bg-panel-light p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-accent-dim">
          Matrix (row-major)
        </span>
        <span className="font-mono text-[10px] text-gray-500">{state.order}</span>
      </div>
      <div className="grid grid-cols-4 gap-1 font-mono text-xs">
        {matrix.map((row, r) =>
          row.map((val, c) => {
            const key = `${r}-${c}`;
            const isFlashing = flashing.has(key);
            const isIdentity =
              (r === c && Math.abs(val - 1) < 1e-6) ||
              (r !== c && Math.abs(val) < 1e-6);
            return (
              <div
                key={key}
                className={`rounded px-2 py-1.5 text-center transition-colors duration-300 ${
                  isFlashing
                    ? 'bg-accent/30 text-white'
                    : isIdentity
                    ? 'bg-panel text-gray-500'
                    : 'bg-panel text-accent'
                }`}
              >
                {val.toFixed(2)}
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
}

/** Re-compose the matrix purely for display (matches TransformModule's composeMatrix). */
function composeDisplayMatrix(s: TransformsState): number[][] {
  const base = new THREE.Matrix4().makeTranslation(1.5, 0, 0);
  const T = new THREE.Matrix4().makeTranslation(...s.translate);
  const euler = new THREE.Euler(
    (s.rotate[0] * Math.PI) / 180,
    (s.rotate[1] * Math.PI) / 180,
    (s.rotate[2] * Math.PI) / 180,
  );
  const R = new THREE.Matrix4().makeRotationFromEuler(euler);
  const S = new THREE.Matrix4().makeScale(...s.scale);

  const trs =
    s.order === 'TRS'
      ? new THREE.Matrix4().multiply(T).multiply(R).multiply(S)
      : s.order === 'TSR'
      ? new THREE.Matrix4().multiply(T).multiply(S).multiply(R)
      : s.order === 'RTS'
      ? new THREE.Matrix4().multiply(R).multiply(T).multiply(S)
      : s.order === 'RST'
      ? new THREE.Matrix4().multiply(R).multiply(S).multiply(T)
      : s.order === 'STR'
      ? new THREE.Matrix4().multiply(S).multiply(T).multiply(R)
      : new THREE.Matrix4().multiply(S).multiply(R).multiply(T);
  const m = base.multiply(trs);

  const rows: number[][] = [];
  for (let r = 0; r < 4; r++) {
    const row: number[] = [];
    for (let c = 0; c < 4; c++) {
      row.push(matrixElement(m, r, c));
    }
    rows.push(row);
  }
  return rows;
}

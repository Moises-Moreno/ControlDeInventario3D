export interface Build {
  front: number;
  depth: number;
  rows: number;
  loose: number;
}

function clamp(v: number, lo: number, hi: number): number {
  const n = Math.trunc(Number(v));
  if (!Number.isFinite(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}

/** Normaliza un armado: rangos de frente/fondo/filas y sueltas de 0 a base-1. */
export function normalizeBuild(b: Build): Build {
  const front = clamp(b.front, 1, 6);
  const depth = clamp(b.depth, 1, 6);
  const rows = clamp(b.rows, 0, 10);
  const loose = clamp(b.loose, 0, Math.max(0, front * depth - 1));
  return { front, depth, rows, loose };
}

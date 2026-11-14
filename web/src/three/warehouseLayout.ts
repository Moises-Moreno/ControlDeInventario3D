import type { Rack } from '@/domain/inventory'

/** Geometría del almacén: racks de dos en dos, espalda con espalda, con pasillo. */
export const CELL = { w: 1.45, d: 1.15 }
export const AISLE = 2.8
export const PAIR_GAP = 0.25

/** Desplazamiento en Z del rack `i` (pares pegados, pasillo entre cada par). */
export function rackOffset(i: number): number {
  return Math.floor(i / 2) * (2 * CELL.d + PAIR_GAP + AISLE) + (i % 2) * (CELL.d + PAIR_GAP)
}

export function whDepth(n: number): number {
  return n ? rackOffset(n - 1) + CELL.d : 0
}

/** Z del centro de un rack (el primero queda al frente). */
export function rackZ(index: number, n: number): number {
  return whDepth(n) - rackOffset(index) - CELL.d / 2
}

export interface WarehouseDims {
  maxLen: number
  depth: number
  height: number
  offsetX: number
  offsetZ: number
}

/** Dimensiones generales para encuadrar y centrar el almacén. */
export function warehouseDims(racks: Rack[], levelH: number): WarehouseDims {
  let maxLen = 2
  let height = 1.2
  for (const r of racks) {
    maxLen = Math.max(maxLen, r.positions * CELL.w)
    height = Math.max(height, r.levels * levelH)
  }
  const n = racks.length
  return { maxLen, depth: Math.max(2, whDepth(n)), height, offsetX: -maxLen / 2, offsetZ: -whDepth(n) / 2 }
}

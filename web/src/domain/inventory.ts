/**
 * Modelo de inventario y cálculos puros (productos, pallets, racks y almacén).
 * Sin React ni Three. Las reglas de negocio autoritativas viven acá y en el store.
 */
import { PALLET, BOX_H, totals, type PalletBuild } from './pallet'

export interface Product {
  id: number
  /** Código único en mayúsculas. */
  code: string
  name: string
  unitsPerBox: number
  /** Color de la caja (hex). */
  color: string
  /** Marca de producto de ejemplo (seed). */
  example?: boolean
}

/** Ubicación en un rack. */
export interface Loc {
  rackId: number
  level: number
  pos: number
}

export interface Pallet extends PalletBuild {
  id: number
  /** Código correlativo PAL-001. */
  pal: string
  productId: number
  lote: string
  vence: string
  /** Ubicación o `null` si está sin ubicar. */
  loc: Loc | null
}

export interface Rack {
  id: number
  /** 1 a 3 letras, único. */
  name: string
  levels: number
  positions: number
}

export const MAX_RACKS = 6
export const MAX_LEVELS = 5
export const MAX_POS = 8

/** Código correlativo de pallet, p. ej. PAL-007. */
export function palCode(n: number): string {
  return 'PAL-' + String(n).padStart(3, '0')
}

/** Código de una posición, p. ej. A-N2-P3. */
export function locCode(rack: Rack | undefined, loc: Loc): string {
  return `${rack ? rack.name : '?'}-N${loc.level}-P${loc.pos}`
}

export function sameLoc(a: Loc | null, b: Loc | null): boolean {
  return !!a && !!b && a.rackId === b.rackId && a.level === b.level && a.pos === b.pos
}

export function productById(products: Product[], id: number | null): Product | null {
  return products.find((p) => p.id === id) ?? null
}

export function palletAt(pallets: Pallet[], loc: Loc): Pallet | null {
  return pallets.find((p) => sameLoc(p.loc, loc)) ?? null
}

/** Stock de un producto: suma de cajas de sus pallets y cuántos pallets lo tienen. */
export function stock(pallets: Pallet[], productId: number): { boxes: number; pallets: number } {
  let boxes = 0
  let n = 0
  for (const p of pallets) {
    if (p.productId === productId) {
      boxes += totals(p).boxes
      n++
    }
  }
  return { boxes, pallets: n }
}

/** Todas las posiciones libres del almacén. */
export function freeSlots(racks: Rack[], pallets: Pallet[]): Loc[] {
  const out: Loc[] = []
  for (const r of racks) {
    for (let level = 1; level <= r.levels; level++) {
      for (let pos = 1; pos <= r.positions; pos++) {
        const loc = { rackId: r.id, level, pos }
        if (!palletAt(pallets, loc)) out.push(loc)
      }
    }
  }
  return out
}

/** Capacidad total y ocupadas. */
export function occupancy(racks: Rack[], pallets: Pallet[]): { cap: number; used: number } {
  let cap = 0
  for (const r of racks) cap += r.levels * r.positions
  const used = cap - freeSlots(racks, pallets).length
  return { cap, used }
}

/**
 * Altura uniforme de los niveles: lo que necesita el pallet más alto más un
 * margen, con un mínimo de 1,40 m.
 */
export function levelHeight(pallets: Pallet[]): number {
  let m = 0
  for (const p of pallets) {
    m = Math.max(m, PALLET.h + BOX_H * (p.rows + (p.loose > 0 ? 1 : 0)))
  }
  return Math.max(1.4, m + 0.35)
}

/** Texto descriptivo de un pallet para tarjetas y listas. */
export function describe(p: PalletBuild, unitsPerBox = 0): string {
  const t = totals(p, unitsPerBox)
  return (
    `${p.front} × ${p.depth} de base × ${p.rows} ${p.rows === 1 ? 'fila' : 'filas'} + ` +
    `${p.loose} ${p.loose === 1 ? 'suelta' : 'sueltas'} = ${t.boxes} cajas` +
    (unitsPerBox ? ` · ${t.units} unidades` : '')
  )
}

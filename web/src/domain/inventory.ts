/**
 * Modelo de inventario y cálculos puros (productos, pallets, racks y almacén).
 * Sin React ni Three. Las reglas de negocio autoritativas viven acá y en el store.
 */
import { PALLET, BOX_H, totals, type PalletBuild } from './pallet'

/**
 * Cómo viene un producto: contenido por envase, envases por caja y cómo se arma
 * un pallet completo (frente × fondo × niveles).
 */
export interface Presentation {
  id: number
  productId: number
  name: string
  /** Contenido de cada envase en la unidad del producto (5 → 5 L). */
  contentPerUnit: number
  /** Envases por caja. */
  unitsPerBox: number
  front: number
  depth: number
  /** Niveles de alto de un pallet completo. */
  levels: number
  active: boolean
}

export interface Product {
  id: number
  /** Id / código único en mayúsculas. */
  code: string
  name: string
  /** Unidad de medida del contenido: L, kg, un... */
  unit: string
  /** Foto (data URL) o null. */
  photo: string | null
  /** Color de la caja (hex). */
  color: string
  active: boolean
  /** Marca de producto de ejemplo (seed). */
  example?: boolean
  presentations: Presentation[]
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
  presentationId: number | null
  receptionId: number | null
  lote: string
  vence: string
  /** completo | mermado, según el estándar de su presentación. */
  kind: 'completo' | 'mermado'
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

/** Código de una posición: rack A, fila 3, nivel 1 → A-F003-N1. */
export function locCode(rack: Rack | undefined, loc: Loc): string {
  return `${rack ? rack.name : '?'}-F${String(loc.pos).padStart(3, '0')}-N${loc.level}`
}

/** Presentación de un pallet (o null si es un pallet viejo sin presentación). */
export function presentationOf(products: Product[], p: Pick<Pallet, 'productId' | 'presentationId'>): Presentation | null {
  const product = products.find((x) => x.id === p.productId)
  return product?.presentations.find((x) => x.id === p.presentationId) ?? null
}

/** Cajas de un pallet completo de esa presentación. */
export function boxesPerPallet(p: Pick<Presentation, 'front' | 'depth' | 'levels'>): number {
  return p.front * p.depth * p.levels
}

/** "Caja de 4 × 5 L": cómo está compuesta la caja. */
export function compositionLabel(pr: Presentation, unit: string): string {
  return `Caja de ${pr.unitsPerBox} × ${pr.contentPerUnit} ${unit}`
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
export function describe(p: PalletBuild, presentation: Presentation | null = null, unit = ''): string {
  const t = totals(p, presentation?.unitsPerBox ?? 0)
  let text =
    `${p.front} × ${p.depth} de base × ${p.rows} ${p.rows === 1 ? 'nivel' : 'niveles'} + ` +
    `${p.loose} ${p.loose === 1 ? 'suelta' : 'sueltas'} = ${t.boxes} cajas`
  if (presentation) {
    const volume = t.units * presentation.contentPerUnit
    text += ` · ${t.units} envases${unit ? ` · ${volume.toLocaleString('es-BO')} ${unit}` : ''}`
  }
  return text
}

/** Contenido total en stock de un producto, en su unidad de medida (p. ej. litros). */
export function volumeOf(pallets: Pallet[], product: Product): number {
  let total = 0
  for (const p of pallets) {
    if (p.productId !== product.id) continue
    const pr = product.presentations.find((x) => x.id === p.presentationId)
    if (!pr) continue
    total += totals(p).boxes * pr.unitsPerBox * pr.contentPerUnit
  }
  return total
}

/** Unidades de medida disponibles para un producto. */
export const UNITS = [
  { value: 'L', label: 'Litros (L)' },
  { value: 'ml', label: 'Mililitros (ml)' },
  { value: 'kg', label: 'Kilos (kg)' },
  { value: 'g', label: 'Gramos (g)' },
  { value: 'un', label: 'Unidades (un)' },
] as const

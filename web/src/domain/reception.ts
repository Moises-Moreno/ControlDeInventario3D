/**
 * Cálculo de una recepción: convierte una cantidad (p. ej. 5000 L) en envases,
 * cajas y pallets según la presentación del producto. Es el mismo cálculo que hace
 * el servidor (que es la autoridad); acá sirve para mostrar el resultado en vivo.
 */
import type { Presentation } from './inventory'

export interface PlannedPallet {
  front: number
  depth: number
  rows: number
  loose: number
  boxes: number
  kind: 'completo' | 'mermado'
}

export interface ReceptionPlan {
  /** Envases recibidos (enteros). */
  units: number
  boxes: number
  /** Envases que sobran y no completan una caja. */
  leftoverUnits: number
  boxesPerPallet: number
  fullPallets: number
  partialPallets: number
  pallets: PlannedPallet[]
}

type PresentationLike = Pick<Presentation, 'contentPerUnit' | 'unitsPerBox' | 'front' | 'depth' | 'levels'>

const round6 = (n: number) => Math.round(n * 1e6) / 1e6

export function planReception(quantity: number, p: PresentationLike): ReceptionPlan {
  const content = p.contentPerUnit > 0 ? p.contentPerUnit : 1
  const units = Number.isFinite(quantity) ? Math.max(0, Math.floor(round6(quantity / content))) : 0
  const boxes = Math.floor(units / p.unitsPerBox)
  const leftoverUnits = units - boxes * p.unitsPerBox
  const capacity = p.front * p.depth * p.levels
  const base = p.front * p.depth

  const fullPallets = Math.floor(boxes / capacity)
  const remainder = boxes - fullPallets * capacity

  const pallets: PlannedPallet[] = []
  for (let i = 0; i < fullPallets; i++) {
    pallets.push({ front: p.front, depth: p.depth, rows: p.levels, loose: 0, boxes: capacity, kind: 'completo' })
  }
  if (remainder > 0) {
    pallets.push({
      front: p.front,
      depth: p.depth,
      rows: Math.floor(remainder / base),
      loose: remainder % base,
      boxes: remainder,
      kind: 'mermado',
    })
  }

  return { units, boxes, leftoverUnits, boxesPerPallet: capacity, fullPallets, partialPallets: remainder > 0 ? 1 : 0, pallets }
}

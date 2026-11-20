/**
 * Sugerencia de ubicación. Reglas del almacén:
 *  - Los pallets mermados (incompletos) van en los niveles de abajo.
 *  - Los pallets completos van en los niveles de arriba.
 *  - El mismo producto se agrupa (mismo rack y misma fila) para encontrarlo fácil.
 *  - Entre posiciones válidas, gana la que queda más cerca del ingreso.
 *  - Zonas: un rack de una categoría solo recibe productos de esa categoría, y un rack sin
 *    categoría no mezcla (ver zones.ts). Se prefiere la zona de la categoría del producto.
 */
import { freeSlots, locCode, palletAt, type Loc, type Pallet, type Rack } from './inventory'
import { distanceFromEntry, type WarehousePlan } from './warehousePlan'
import { canPlace, type ZoneContext } from './zones'

export type PalletKind = 'completo' | 'mermado'

export interface SlotSuggestion {
  loc: Loc
  code: string
  /** Menor es mejor. */
  score: number
  meters: number
  reasons: string[]
}

export interface SlottingItem {
  /** Id de un pallet existente, o una clave propia para pallets de una recepción aún sin crear. */
  key: string | number
  kind: PalletKind
  productId: number
  productName?: string
}

/** Cuántos niveles de abajo se reservan para mermados (la mitad, redondeando hacia abajo, mínimo 1). */
export function lowBandLevels(levels: number): number {
  return Math.max(1, Math.floor(levels / 2))
}

export function isLowLevel(level: number, levels: number): boolean {
  return level <= lowBandLevels(levels)
}

const WRONG_BAND = 100
/** Premios por zona: ganan sobre la distancia al ingreso (no sobre la banda de niveles). */
const OWN_ZONE = 60
const SAME_CATEGORY_RACK = 30

interface Occupant {
  loc: Loc
  productId: number
}

function scoreSlot(
  loc: Loc,
  item: SlottingItem,
  rack: Rack,
  occupants: Occupant[],
  plan: WarehousePlan,
): { score: number; meters: number; reasons: string[] } {
  const reasons: string[] = []
  let score = 0

  // 1) Banda de niveles según el tipo de pallet.
  const low = isLowLevel(loc.level, rack.levels)
  if (item.kind === 'mermado') {
    if (low) {
      reasons.push(`Nivel ${loc.level}: abajo, para pallets mermados`)
      score += (loc.level - 1) * 2
    } else {
      reasons.push('Nivel alto: no es lo ideal para un pallet mermado')
      score += WRONG_BAND + (loc.level - 1)
    }
  } else if (!low) {
    reasons.push(`Nivel ${loc.level}: arriba, para pallets completos`)
    score += (loc.level - lowBandLevels(rack.levels) - 1) * 2
  } else {
    reasons.push('Nivel bajo: no es lo ideal para un pallet completo')
    score += WRONG_BAND + (rack.levels - loc.level)
  }

  // 2) Mismo producto cerca.
  const same = occupants.filter((o) => o.productId === item.productId)
  const sameFila = same.some((o) => o.loc.rackId === loc.rackId && o.loc.pos === loc.pos)
  const sameRack = same.some((o) => o.loc.rackId === loc.rackId)
  const nextFila = same.some((o) => o.loc.rackId === loc.rackId && Math.abs(o.loc.pos - loc.pos) === 1)
  const name = item.productName ?? 'el mismo producto'
  if (sameFila) {
    score -= 12
    reasons.push(`En la misma fila que ${name}`)
  } else if (nextFila) {
    score -= 8
    reasons.push(`Al lado de ${name}`)
  } else if (sameRack) {
    score -= 4
    reasons.push(`En el mismo rack que ${name}`)
  }

  // 3) Cerca del ingreso (menos caminata).
  const meters = distanceFromEntry(plan, loc)
  if (Number.isFinite(meters)) score += meters * 0.5
  else score += 1000

  return { score, meters, reasons }
}

/** Mejores posiciones libres para un pallet, de mejor a peor. */
export function suggestSlots(
  item: SlottingItem,
  racks: Rack[],
  pallets: Pick<Pallet, 'loc' | 'productId'>[],
  plan: WarehousePlan,
  limit = 3,
  reserved: Occupant[] = [],
  zones?: ZoneContext,
): SlotSuggestion[] {
  const occupants: Occupant[] = [
    ...pallets.filter((p) => p.loc).map((p) => ({ loc: p.loc!, productId: p.productId })),
    ...reserved,
  ]
  const taken = (loc: Loc) => reserved.some((r) => r.loc.rackId === loc.rackId && r.loc.level === loc.level && r.loc.pos === loc.pos)

  const itemCategory = zones ? zones.categoryOf(item.productId) : null
  const categoryName = itemCategory != null ? zones?.names.get(itemCategory) : undefined

  // Zonas: se descartan los racks donde este producto se mezclaría con otra categoría.
  const allowed = new Map<number, { zone: 'own' | 'same' | 'free' } | null>()
  const zoneOf = (rack: Rack) => {
    if (!zones) return { zone: 'free' as const }
    if (!allowed.has(rack.id)) {
      const others = occupants.filter((o) => o.loc.rackId === rack.id).map((o) => zones.categoryOf(o.productId))
      const check = canPlace(itemCategory, rack, others, zones.names)
      allowed.set(
        rack.id,
        !check.ok ? null : { zone: rack.categoryId != null ? 'own' : others.length > 0 ? 'same' : 'free' },
      )
    }
    return allowed.get(rack.id)!
  }

  const free = freeSlots(racks, pallets as Pallet[]).filter((l) => !taken(l))
  return free
    .filter((loc) => zoneOf(racks.find((r) => r.id === loc.rackId)!) !== null)
    .map((loc) => {
      const rack = racks.find((r) => r.id === loc.rackId)!
      const { score, meters, reasons } = scoreSlot(loc, item, rack, occupants, plan)
      const zone = zoneOf(rack)!.zone
      let adjusted = score
      if (zone === 'own') {
        adjusted -= OWN_ZONE
        reasons.unshift(`Zona ${categoryName ?? 'de su categoría'}`)
      } else if (zone === 'same') {
        adjusted -= SAME_CATEGORY_RACK
        reasons.unshift(`Rack que ya tiene ${categoryName ?? 'su categoría'}`)
      }
      return { loc, code: locCode(rack, loc), score: adjusted, meters, reasons }
    })
    .sort((a, b) => a.score - b.score || a.code.localeCompare(b.code))
    .slice(0, limit)
}

export interface PlacementPlan {
  key: string | number
  suggestion: SlotSuggestion | null
}

/**
 * Asigna una posición a cada pallet de una recepción, de a uno y sin repetir. Los
 * completos se asignan primero, así ocupan los niveles altos antes que los mermados
 * tomen lo suyo abajo; los pallets de un mismo producto quedan juntos.
 */
export function planPlacement(
  items: SlottingItem[],
  racks: Rack[],
  pallets: Pick<Pallet, 'loc' | 'productId'>[],
  plan: WarehousePlan,
  zones?: ZoneContext,
): PlacementPlan[] {
  const reserved: Occupant[] = []
  const result = new Map<string | number, SlotSuggestion | null>()
  const ordered = [...items].sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'completo' ? -1 : 1))
  for (const item of ordered) {
    const [best] = suggestSlots(item, racks, pallets, plan, 1, reserved, zones)
    result.set(item.key, best ?? null)
    if (best) reserved.push({ loc: best.loc, productId: item.productId })
  }
  return items.map((i) => ({ key: i.key, suggestion: result.get(i.key) ?? null }))
}

/** ¿Hay lugar para todos? Devuelve cuántos pallets de cada tipo no entran. */
export function capacityCheck(placements: PlacementPlan[]): number {
  return placements.filter((p) => !p.suggestion).length
}

export { palletAt }

/**
 * Verificación de un escaneo: el operador lee la etiqueta de un rack y el sistema dice si
 * es el lugar correcto para el pallet que tiene en la mano.
 */
import { locCode, palletAt, parseLocCode, sameLoc, type Loc, type Pallet, type Rack } from './inventory'
import { canPlace, type ZoneContext } from './zones'

export type ScanVerdict =
  /** Es la posición indicada por el sistema. */
  | { kind: 'ok'; loc: Loc; code: string }
  /** Es otra posición válida (libre y de la categoría correcta), distinta de la sugerida. */
  | { kind: 'other'; loc: Loc; code: string; expected: string | null }
  /** No se puede dejar ahí (ocupada o de otra categoría). */
  | { kind: 'blocked'; code: string; reason: string }
  /** El código leído no es una posición del almacén. */
  | { kind: 'unknown'; text: string }

export function verifyScan(
  text: string,
  expected: Loc | null,
  pallet: Pick<Pallet, 'id' | 'productId'>,
  racks: Rack[],
  pallets: Pallet[],
  zones: ZoneContext,
): ScanVerdict {
  const loc = parseLocCode(text, racks)
  if (!loc) return { kind: 'unknown', text: text.trim() }
  const rack = racks.find((r) => r.id === loc.rackId)!
  const code = locCode(rack, loc)

  const occupant = palletAt(pallets, loc)
  if (occupant && occupant.id !== pallet.id) {
    return { kind: 'blocked', code, reason: `La posición ${code} ya está ocupada por ${occupant.pal}.` }
  }

  const others = pallets.filter((p) => p.id !== pallet.id && p.loc?.rackId === rack.id).map((p) => zones.categoryOf(p.productId))
  const zone = canPlace(zones.categoryOf(pallet.productId), rack, others, zones.names)
  if (!zone.ok) return { kind: 'blocked', code, reason: zone.reason }

  if (expected && sameLoc(expected, loc)) return { kind: 'ok', loc, code }
  return { kind: 'other', loc, code, expected: expected ? locCode(racks.find((r) => r.id === expected.rackId), expected) : null }
}

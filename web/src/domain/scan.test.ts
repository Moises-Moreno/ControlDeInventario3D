import { describe, expect, it } from 'vitest'
import { palCode, type Pallet, type Rack } from './inventory'
import { verifyScan } from './scan'

const racks: Rack[] = [
  { id: 1, name: 'A', levels: 4, positions: 6, categoryId: 1 },
  { id: 2, name: 'B', levels: 4, positions: 6, categoryId: 2 },
]
const names = new Map([
  [1, 'Detergente en polvo'],
  [2, 'Detergente líquido'],
])
const cat: Record<number, number> = { 10: 1, 20: 2 }
const zones = { categoryOf: (p: number) => cat[p] ?? null, names }

const pallet = (id: number, productId: number, loc: Pallet['loc'] = null): Pallet => ({
  id, pal: palCode(id), productId, presentationId: null, receptionId: null,
  front: 2, depth: 2, rows: 1, loose: 0, lote: '', vence: '', kind: 'completo', loc,
})

describe('verifyScan', () => {
  const mine = pallet(1, 10)
  const expected = { rackId: 1, level: 4, pos: 3 }

  it('ok: la etiqueta leída es la posición sugerida', () => {
    expect(verifyScan('A-F003-N4', expected, mine, racks, [mine], zones)).toMatchObject({ kind: 'ok', code: 'A-F003-N4' })
  })

  it('other: posición válida pero distinta de la sugerida', () => {
    const v = verifyScan('A-F004-N4', expected, mine, racks, [mine], zones)
    expect(v).toMatchObject({ kind: 'other', code: 'A-F004-N4', expected: 'A-F003-N4' })
  })

  it('blocked: el rack es de otra categoría', () => {
    const v = verifyScan('B-F001-N1', expected, mine, racks, [mine], zones)
    expect(v.kind).toBe('blocked')
    if (v.kind === 'blocked') expect(v.reason).toContain('No se mezclan categorías')
  })

  it('blocked: la posición ya está ocupada', () => {
    const other = pallet(2, 10, { rackId: 1, level: 4, pos: 3 })
    const v = verifyScan('A-F003-N4', expected, mine, racks, [mine, other], zones)
    expect(v).toMatchObject({ kind: 'blocked' })
    if (v.kind === 'blocked') expect(v.reason).toContain('PAL-002')
  })

  it('unknown: lo que se leyó no es una posición', () => {
    expect(verifyScan('PAL-001', expected, mine, racks, [mine], zones)).toEqual({ kind: 'unknown', text: 'PAL-001' })
    expect(verifyScan('A-F009-N1', expected, mine, racks, [mine], zones).kind).toBe('unknown')
  })
})

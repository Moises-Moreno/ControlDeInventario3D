import { describe, it, expect } from 'vitest'
import {
  palCode,
  locCode,
  stock,
  freeSlots,
  occupancy,
  levelHeight,
  palletAt,
  parseLocCode,
  type Pallet,
  type Rack,
} from './inventory'

const racks: Rack[] = [{ id: 1, name: 'A', levels: 2, positions: 2, categoryId: null }]

function pallet(id: number, productId: number, partial: Partial<Pallet> = {}): Pallet {
  return { id, pal: palCode(id), productId, presentationId: null, receptionId: null, front: 2, depth: 2, rows: 1, loose: 0, lote: '', vence: '', kind: 'mermado', loc: null, ...partial }
}

describe('palCode y locCode', () => {
  it('formatea el correlativo', () => {
    expect(palCode(1)).toBe('PAL-001')
    expect(palCode(42)).toBe('PAL-042')
  })
  it('formatea la posición', () => {
    expect(locCode(racks[0], { rackId: 1, level: 2, pos: 3 })).toBe('A-F003-N2')
  })
})

describe('parseLocCode', () => {
  const big: Rack[] = [{ id: 7, name: 'A', levels: 4, positions: 6, categoryId: null }]
  it('es la inversa de locCode', () => {
    const loc = { rackId: 7, level: 3, pos: 5 }
    expect(parseLocCode(locCode(big[0], loc), big)).toEqual(loc)
  })
  it('acepta minúsculas y espacios de lectores de código', () => {
    expect(parseLocCode(' a-f001-n1 ', big)).toEqual({ rackId: 7, level: 1, pos: 1 })
  })
  it('rechaza lo que no es una posición del almacén', () => {
    expect(parseLocCode('PAL-001', big)).toBeNull()
    expect(parseLocCode('Z-F001-N1', big)).toBeNull()
    expect(parseLocCode('A-F007-N1', big)).toBeNull()
    expect(parseLocCode('A-F001-N5', big)).toBeNull()
    expect(parseLocCode('A-F000-N1', big)).toBeNull()
  })
})

describe('stock', () => {
  it('suma las cajas de los pallets del producto', () => {
    const pallets = [
      pallet(1, 7, { rows: 2 }), // 2x2x2 = 8
      pallet(2, 7, { rows: 1, loose: 1 }), // 4+1 = 5
      pallet(3, 9, { rows: 3 }), // otro producto
    ]
    const st = stock(pallets, 7)
    expect(st.boxes).toBe(13)
    expect(st.pallets).toBe(2)
  })
})

describe('freeSlots y occupancy', () => {
  it('cuenta posiciones libres y ocupadas', () => {
    const pallets = [pallet(1, 7, { loc: { rackId: 1, level: 1, pos: 1 } })]
    const free = freeSlots(racks, pallets)
    expect(free.length).toBe(3) // 2x2 - 1 ocupada
    expect(palletAt(pallets, { rackId: 1, level: 1, pos: 1 })?.id).toBe(1)
    const occ = occupancy(racks, pallets)
    expect(occ).toEqual({ cap: 4, used: 1 })
  })
})

describe('levelHeight', () => {
  it('nunca baja de 1,40 m', () => {
    expect(levelHeight([])).toBeCloseTo(1.4)
  })
  it('crece con el pallet más alto', () => {
    const tall = pallet(1, 7, { rows: 6, loose: 2 })
    expect(levelHeight([tall])).toBeGreaterThan(1.4)
  })
})

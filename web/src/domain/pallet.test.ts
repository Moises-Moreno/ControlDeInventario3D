import { describe, it, expect } from 'vitest'
import {
  base,
  maxLoose,
  clamp,
  normalizeBuild,
  totals,
  isLooseBox,
  type PalletBuild,
} from './pallet'

describe('base y maxLoose', () => {
  it('base = frente × fondo', () => {
    expect(base(3, 2)).toBe(6)
    expect(base(1, 1)).toBe(1)
  })

  it('las sueltas van de 0 a base-1', () => {
    expect(maxLoose(3, 2)).toBe(5)
    expect(maxLoose(1, 1)).toBe(0)
  })
})

describe('clamp', () => {
  it('recorta al rango', () => {
    expect(clamp(10, 1, 6)).toBe(6)
    expect(clamp(-3, 1, 6)).toBe(1)
    expect(clamp(4, 1, 6)).toBe(4)
  })

  it('valores no numéricos caen al mínimo', () => {
    expect(clamp(NaN, 0, 10)).toBe(0)
    expect(clamp('x' as unknown as number, 2, 10)).toBe(2)
  })

  it('trunca decimales', () => {
    expect(clamp(3.9, 0, 10)).toBe(3)
  })
})

describe('normalizeBuild', () => {
  it('aplica los rangos de frente, fondo y filas', () => {
    const b = normalizeBuild({ front: 9, depth: 0, rows: 99, loose: 0 })
    expect(b.front).toBe(6)
    expect(b.depth).toBe(1)
    expect(b.rows).toBe(10)
  })

  it('recorta las sueltas a base-1', () => {
    const b = normalizeBuild({ front: 2, depth: 2, rows: 1, loose: 7 })
    expect(b.loose).toBe(3) // base 4 -> max 3
  })
})

describe('totals', () => {
  it('cuenta filas completas más sueltas', () => {
    const build: PalletBuild = { front: 3, depth: 2, rows: 3, loose: 4 }
    const t = totals(build, 24)
    expect(t.base).toBe(6)
    expect(t.fullBoxes).toBe(18)
    expect(t.boxes).toBe(22)
    expect(t.units).toBe(22 * 24)
  })

  it('sin producto, las unidades son 0', () => {
    expect(totals({ front: 2, depth: 2, rows: 2, loose: 0 }).units).toBe(0)
  })

  it('pallet vacío', () => {
    const t = totals({ front: 2, depth: 2, rows: 0, loose: 0 }, 10)
    expect(t.boxes).toBe(0)
    expect(t.units).toBe(0)
  })
})

describe('isLooseBox', () => {
  it('las cajas después de las filas completas son sueltas', () => {
    const build: PalletBuild = { front: 2, depth: 2, rows: 1, loose: 2 }
    // base 4, fullBoxes 4 -> índices 0..3 completas, 4..5 sueltas
    expect(isLooseBox(3, build)).toBe(false)
    expect(isLooseBox(4, build)).toBe(true)
    expect(isLooseBox(5, build)).toBe(true)
  })
})

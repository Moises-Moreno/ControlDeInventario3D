import { describe, expect, it } from 'vitest'
import { planReception } from './reception'

// Lavandina: envase de 5 L, 4 envases por caja, pallet completo de 5 × 2 × 4 = 40 cajas.
const lavandina = { contentPerUnit: 5, unitsPerBox: 4, front: 5, depth: 2, levels: 4 }

describe('planReception', () => {
  it('5000 L de lavandina de 5 L → 250 cajas → 6 completos y 1 mermado de 10 cajas', () => {
    const plan = planReception(5000, lavandina)
    expect(plan.units).toBe(1000)
    expect(plan.boxes).toBe(250)
    expect(plan.fullPallets).toBe(6)
    expect(plan.partialPallets).toBe(1)
    expect(plan.pallets[6]).toMatchObject({ kind: 'mermado', boxes: 10, rows: 1, loose: 0 })
  })

  it('separa filas completas de cajas sueltas en el mermado', () => {
    expect(planReception(260, lavandina).pallets[0]).toMatchObject({ boxes: 13, rows: 1, loose: 3 })
  })

  it('informa los envases que sobran', () => {
    expect(planReception(105, lavandina).leftoverUnits).toBe(1)
  })

  it('una cantidad inválida no genera pallets', () => {
    expect(planReception(Number.NaN, lavandina).pallets).toHaveLength(0)
    expect(planReception(-5, lavandina).pallets).toHaveLength(0)
  })
})

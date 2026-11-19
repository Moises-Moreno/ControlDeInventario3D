import { describe, expect, it } from 'vitest'
import type { Rack } from './inventory'
import { buildPlan, describeLeg, distanceFromEntry, planRoute, shortestPath } from './warehousePlan'
import { isLowLevel, planPlacement, suggestSlots } from './slotting'

const racks: Rack[] = ['A', 'B', 'C', 'D'].map((name, i) => ({ id: i + 1, name, levels: 4, positions: 6 }))
const plan = buildPlan(racks)
const id = (name: string) => racks.find((r) => r.name === name)!.id

describe('plano del almacén', () => {
  it('A y D miran al pasillo; B y C van espalda con espalda', () => {
    const face = (n: string) => plan.racks.find((r) => r.name === n)!
    expect(face('A')).toMatchObject({ face: 'south', aisle: 0 })
    expect(face('B')).toMatchObject({ face: 'north', aisle: 0 })
    expect(face('C')).toMatchObject({ face: 'south', aisle: 1 })
    expect(face('D')).toMatchObject({ face: 'north', aisle: 1 })
    expect(face('B').group).toBe(face('C').group)
  })

  it('el ingreso cerrado no está conectado al plano', () => {
    expect(plan.entries.find((e) => e.id === 'closed')!.open).toBe(false)
    expect(Object.keys(plan.graph.nodes)).not.toContain('closed')
  })

  it('respeta los sentidos únicos: del ingreso a la fila 1 de A hay que subir por la izquierda', () => {
    const path = shortestPath(plan.graph, 'E', 'a0-f1')!
    expect(path.nodes[1]).toBe('a1-L')
    expect(path.nodes).toContain('a0-L')
  })

  it('el ingreso queda más cerca de D (abajo) que de A (arriba)', () => {
    const d = distanceFromEntry(plan, { rackId: id('D'), level: 1, pos: 1 })
    const a = distanceFromEntry(plan, { rackId: id('A'), level: 1, pos: 1 })
    expect(d).toBeLessThan(a)
  })
})

describe('sugerencia de ubicación', () => {
  it('niveles bajos para mermados, altos para completos', () => {
    expect(isLowLevel(1, 4)).toBe(true)
    expect(isLowLevel(2, 4)).toBe(true)
    expect(isLowLevel(3, 4)).toBe(false)

    const mermado = suggestSlots({ key: 1, kind: 'mermado', productId: 1 }, racks, [], plan, 1)[0]
    const completo = suggestSlots({ key: 2, kind: 'completo', productId: 1 }, racks, [], plan, 1)[0]
    expect(isLowLevel(mermado.loc.level, 4)).toBe(true)
    expect(isLowLevel(completo.loc.level, 4)).toBe(false)
  })

  it('no sugiere una posición ocupada', () => {
    const first = suggestSlots({ key: 1, kind: 'mermado', productId: 1 }, racks, [], plan, 1)[0]
    const next = suggestSlots({ key: 2, kind: 'mermado', productId: 1 }, racks, [{ loc: first.loc, productId: 1 }], plan, 1)[0]
    expect(next.code).not.toBe(first.code)
  })

  it('planPlacement reparte 6 completos y 1 mermado sin repetir posiciones', () => {
    const items = [
      ...Array.from({ length: 6 }, (_, i) => ({ key: `c${i}`, kind: 'completo' as const, productId: 1 })),
      { key: 'm', kind: 'mermado' as const, productId: 1 },
    ]
    const result = planPlacement(items, racks, [], plan)
    const codes = result.map((r) => r.suggestion!.code)
    expect(new Set(codes).size).toBe(7)
    for (const r of result.slice(0, 6)) expect(isLowLevel(r.suggestion!.loc.level, 4)).toBe(false)
    expect(isLowLevel(result[6].suggestion!.loc.level, 4)).toBe(true)
  })

  it('agrupa el mismo producto: los completos llenan una fila antes de pasar a otra', () => {
    const items = Array.from({ length: 4 }, (_, i) => ({ key: i, kind: 'completo' as const, productId: 1 }))
    const filas = planPlacement(items, racks, [], plan).map((r) => `${r.suggestion!.loc.rackId}-${r.suggestion!.loc.pos}`)
    expect(new Set(filas).size).toBeLessThanOrEqual(2)
  })
})

describe('rutas', () => {
  it('ordena las paradas en un recorrido corto y vuelve al ingreso', () => {
    const route = planRoute(plan, [
      { loc: { rackId: id('A'), level: 1, pos: 6 } },
      { loc: { rackId: id('D'), level: 1, pos: 1 } },
      { loc: { rackId: id('B'), level: 2, pos: 3 } },
    ])!
    expect(route.stops).toHaveLength(3)
    expect(route.legs).toHaveLength(4) // 3 paradas + vuelta
    expect(route.legs[3].toStop).toBe(-1)
    expect(route.meters).toBeGreaterThan(0)
  })
})

describe('indicaciones en palabras', () => {
  it('a D (abajo) se llega por el Pasillo 2 hacia la derecha', () => {
    const route = planRoute(plan, [{ loc: { rackId: id('C'), level: 3, pos: 1 } }], false)!
    const steps = describeLeg(plan, route.legs[0])
    expect(steps[0]).toBe('Entrá por el ingreso principal.')
    expect(steps.some((s) => s.includes('Pasillo 2') && s.includes('derecha'))).toBe(true)
  })

  it('a A (arriba) hay que subir por el pasillo izquierdo y seguir por el Pasillo 1', () => {
    const route = planRoute(plan, [{ loc: { rackId: id('A'), level: 1, pos: 3 } }], false)!
    const steps = describeLeg(plan, route.legs[0])
    expect(steps.some((s) => s.startsWith('Subí') && s.includes('izquierdo'))).toBe(true)
    expect(steps.some((s) => s.includes('Pasillo 1'))).toBe(true)
  })
})

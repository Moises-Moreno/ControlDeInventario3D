import { describe, expect, it } from 'vitest'
import { navFor } from './nav'

describe('navegación por rol', () => {
  it('el operador ve solo las tareas del depósito', () => {
    expect(navFor(false).map((n) => n.id)).toEqual(['almacen', 'recibir', 'guardar', 'retirar'])
  })
  it('el admin ve además "Más"', () => {
    expect(navFor(true).map((n) => n.id)).toEqual(['almacen', 'recibir', 'guardar', 'retirar', 'mas'])
  })
})

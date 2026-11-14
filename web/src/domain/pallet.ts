/**
 * Dominio del armado de pallets: dimensiones físicas, límites y cálculos puros.
 * Sin dependencias de React ni de Three; es la única fuente de verdad del conteo
 * y se testea de forma aislada (ver pallet.test.ts).
 */

/** Pallet estándar 1200 × 1000 mm, con 144 mm de alto de tarima. */
export const PALLET = { w: 1.2, d: 1.0, h: 0.144 } as const

/** Alto de cada caja, en metros. */
export const BOX_H = 0.24

/** Rangos permitidos para el armado (coinciden con las reglas del negocio). */
export const LIMITS = {
  front: { min: 1, max: 6 },
  depth: { min: 1, max: 6 },
  rows: { min: 0, max: 10 },
} as const

/** Configuración de un pallet en construcción. */
export interface PalletBuild {
  /** Cajas a lo ancho (frente). */
  front: number
  /** Cajas en profundidad (fondo). */
  depth: number
  /** Filas completas apiladas. */
  rows: number
  /** Cajas sueltas en la fila superior incompleta (0 .. base-1). */
  loose: number
}

/** Resultado del conteo de un pallet. */
export interface PalletTotals {
  /** Cajas por fila completa = frente × fondo. */
  base: number
  /** Cajas que forman filas completas = base × filas. */
  fullBoxes: number
  /** Total de cajas = filas completas + sueltas. */
  boxes: number
  /** Unidades totales = cajas × unidades por caja. */
  units: number
}

/** Fija un entero dentro de un rango. Valores inválidos caen al mínimo. */
export function clamp(value: number, min: number, max: number): number {
  const n = Math.trunc(Number(value))
  if (!Number.isFinite(n)) return min
  return Math.max(min, Math.min(max, n))
}

/** Cajas por fila completa. */
export function base(front: number, depth: number): number {
  return front * depth
}

/**
 * Máximo de cajas sueltas: una menos que la base, porque con la base completa
 * ya es otra fila completa.
 */
export function maxLoose(front: number, depth: number): number {
  return Math.max(0, base(front, depth) - 1)
}

/**
 * Normaliza un armado a valores válidos: aplica los rangos y recorta las cajas
 * sueltas a 0 .. base-1.
 */
export function normalizeBuild(build: PalletBuild): PalletBuild {
  const front = clamp(build.front, LIMITS.front.min, LIMITS.front.max)
  const depth = clamp(build.depth, LIMITS.depth.min, LIMITS.depth.max)
  const rows = clamp(build.rows, LIMITS.rows.min, LIMITS.rows.max)
  const loose = clamp(build.loose, 0, maxLoose(front, depth))
  return { front, depth, rows, loose }
}

/**
 * Calcula el conteo de un pallet. `unitsPerBox` es opcional (0 si aún no hay
 * producto asignado).
 */
export function totals(build: PalletBuild, unitsPerBox = 0): PalletTotals {
  const b = base(build.front, build.depth)
  const fullBoxes = b * build.rows
  const boxes = fullBoxes + build.loose
  return { base: b, fullBoxes, boxes, units: boxes * unitsPerBox }
}

/** Indica si la caja con índice `i` es una caja suelta (va arriba, en naranja). */
export function isLooseBox(index: number, build: PalletBuild): boolean {
  return index >= base(build.front, build.depth) * build.rows
}

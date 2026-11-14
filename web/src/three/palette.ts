import { Color } from 'three'
import type { Theme } from '@/store/theme'

/**
 * Colores de la escena 3D en hex (THREE.Color no parsea oklch de forma fiable,
 * por eso no los leemos del CSS). El color de la caja viene del armador; acá solo
 * definimos el naranja de las sueltas y la grilla, por tema.
 */
const SCENE = {
  light: { orange: '#d9690f', grid: '#b4bfcd' },
  dark: { orange: '#ffa04d', grid: '#3a4759' },
} as const

export function sceneColors(theme: Theme) {
  return SCENE[theme]
}

/** Color de una caja suelta: el color de la caja mezclado hacia el naranja. */
export function looseColor(boxColor: string, theme: Theme): string {
  const c = new Color(boxColor)
  c.lerp(new Color(SCENE[theme].orange), 0.3)
  return `#${c.getHexString()}`
}

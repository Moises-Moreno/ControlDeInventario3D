import { useEffect, useMemo } from 'react'
import { CanvasTexture, SpriteMaterial } from 'three'

interface Props {
  text: string
  position: [number, number, number]
  /** Alto del rótulo en metros (el ancho sale de la forma). */
  size?: number
  bg?: string
  fg?: string
  shape?: 'circle' | 'pill'
}

/**
 * Rótulo que siempre mira a la cámara, dibujado en un canvas (sin cargar fuentes ni
 * depender de la red). Se usa para los nombres de rack, filas y niveles.
 */
export function Label3D({ text, position, size = 0.7, bg = '#2447c9', fg = '#ffffff', shape = 'circle' }: Props) {
  const pill = shape === 'pill'
  const w = pill ? 256 : 128
  const h = pill ? 96 : 128

  const material = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = bg
    ctx.beginPath()
    if (pill) {
      const r = h / 2
      ctx.roundRect(2, 2, w - 4, h - 4, r)
    } else {
      ctx.arc(w / 2, h / 2, w / 2 - 3, 0, Math.PI * 2)
    }
    ctx.fill()
    ctx.fillStyle = fg
    ctx.font = `700 ${pill ? 52 : text.length > 1 ? 52 : 80}px Arial, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, w / 2, h / 2 + 3)
    const map = new CanvasTexture(canvas)
    return new SpriteMaterial({ map, depthTest: false, transparent: true })
  }, [text, bg, fg, pill, w, h])

  useEffect(
    () => () => {
      material.map?.dispose()
      material.dispose()
    },
    [material],
  )

  return <sprite material={material} position={position} scale={[size * (w / h), size, 1]} renderOrder={5} />
}

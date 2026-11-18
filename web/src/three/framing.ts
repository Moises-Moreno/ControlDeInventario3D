import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { MathUtils, Vector3, type PerspectiveCamera } from 'three'

/** Lo mínimo que usamos de OrbitControls para reencuadrar. */
type Controls = { target: Vector3; update: () => void }

export interface Frame {
  /** Radio de la esfera que debe verse completa. */
  radius: number
  /** Punto al que mira la cámara. */
  target: [number, number, number]
  /** Dirección desde el objetivo hacia la cámara (no hace falta que esté normalizada). */
  dir: [number, number, number]
}

/** Margen para que la escena no quede pegada a los bordes ni a los controles superpuestos. */
const MARGIN = 1.25

function safeAspect(aspect: number): number {
  return Number.isFinite(aspect) && aspect > 0.05 ? aspect : 1
}

/**
 * Distancia a la que una esfera de `radius` entra completa en pantalla, usando el
 * menor de los campos de visión (en vertical el ancho manda; en horizontal, el alto).
 */
export function fitDistance(radius: number, fovDeg: number, aspect: number): number {
  const vFov = MathUtils.degToRad(fovDeg)
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * safeAspect(aspect))
  return (radius * MARGIN) / Math.sin(Math.min(vFov, hFov) / 2)
}

/**
 * Encuadra la cámara en el montaje y cada vez que cambia `nonce` ("Vista inicial").
 * Si después cambia la proporción del contenedor (rotar el dispositivo, arrastrar el
 * divisor, pantalla completa), acerca o aleja la cámara para que siga entrando todo,
 * sin perder la rotación que eligió el usuario.
 */
export function useCameraFraming(getFrame: () => Frame, nonce: number | string) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const controls = useThree((s) => s.controls) as Controls | null
  const width = useThree((s) => s.size.width)
  const height = useThree((s) => s.size.height)
  const aspect = safeAspect(width / Math.max(1, height))

  const getFrameRef = useRef(getFrame)
  getFrameRef.current = getFrame
  const aspectRef = useRef(aspect)
  aspectRef.current = aspect
  const lastAspect = useRef<number | null>(null)

  useEffect(() => {
    const { radius, target, dir } = getFrameRef.current()
    const dist = fitDistance(radius, camera.fov, aspectRef.current)
    const len = Math.hypot(dir[0], dir[1], dir[2]) || 1
    camera.position.set(
      target[0] + (dir[0] / len) * dist,
      target[1] + (dir[1] / len) * dist,
      target[2] + (dir[2] / len) * dist,
    )
    if (controls) {
      controls.target.set(target[0], target[1], target[2])
      controls.update()
    } else {
      camera.lookAt(target[0], target[1], target[2])
    }
    lastAspect.current = aspectRef.current
  }, [nonce, camera, controls])

  useEffect(() => {
    const previous = lastAspect.current
    if (previous == null || Math.abs(previous - aspect) < 0.01) return
    const ratio = fitDistance(1, camera.fov, aspect) / fitDistance(1, camera.fov, previous)
    const center = controls?.target ?? new Vector3(0, 0, 0)
    camera.position.sub(center).multiplyScalar(ratio).add(center)
    controls?.update()
    lastAspect.current = aspect
  }, [aspect, camera, controls])
}

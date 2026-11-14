import { useMemo, useRef, useLayoutEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Instances, Instance } from '@react-three/drei'
import type { Object3D } from 'three'
import { PALLET, BOX_H, base, type PalletBuild } from '@/domain/pallet'
import { looseColor } from './palette'
import { useTheme } from '@/store/theme'
import { useReducedMotion } from './useReducedMotion'

interface Props {
  build: PalletBuild
  color: string
}

const MAX_BOXES = 400 // base máx (36) × filas máx (10) + sueltas máx (35)
const DROP = 0.9 // altura desde la que cae una caja nueva

/** Cajas del pallet dibujadas con un único InstancedMesh (vía drei). */
export function BoxStack({ build, color }: Props) {
  const theme = useTheme((s) => s.theme)
  const reduce = useReducedMotion()
  const { front, depth, rows, loose } = build

  const dims = useMemo(() => ({ w: PALLET.w / front, d: PALLET.d / depth }), [front, depth])

  const geo = useMemo(
    () => [dims.w - 0.012, BOX_H - 0.006, dims.d - 0.012] as [number, number, number],
    [dims],
  )

  const looseHex = useMemo(() => looseColor(color, theme), [color, theme])

  const items = useMemo(() => {
    const b = base(front, depth)
    const total = b * rows + loose
    const fullBoxes = b * rows
    const out: { position: [number, number, number]; isLoose: boolean }[] = []
    for (let i = 0; i < total; i++) {
      const layer = Math.floor(i / b)
      const k = i % b
      const col = k % front
      const row = Math.floor(k / front)
      out.push({
        position: [
          -PALLET.w / 2 + dims.w * (col + 0.5),
          BOX_H * (layer + 0.5),
          -PALLET.d / 2 + dims.d * (row + 0.5),
        ],
        isLoose: i >= fullBoxes,
      })
    }
    return out
  }, [front, depth, rows, loose, dims])

  // --- Animación de caída ---
  const refs = useRef<(Object3D | null)[]>([])
  const progress = useRef<number[]>([]) // 1 = asentada
  const prevCount = useRef(0)
  const layoutKey = `${front}x${depth}`
  const prevLayout = useRef(layoutKey)

  useLayoutEffect(() => {
    const count = items.length
    if (prevLayout.current !== layoutKey || reduce) {
      // Cambió el layout (o se pidió reducir movimiento): sin animación.
      progress.current = new Array(count).fill(1)
    } else if (count > prevCount.current) {
      // Las cajas que ya estaban quedan asentadas; las nuevas caen desde arriba.
      const next = progress.current.slice(0, count)
      for (let i = next.length; i < count; i++) next.push(0)
      for (let i = prevCount.current; i < count; i++) {
        next[i] = 0
        const obj = refs.current[i]
        if (obj) obj.position.y = items[i].position[1] + DROP
      }
      progress.current = next
    } else {
      progress.current = progress.current.slice(0, count)
    }
    prevCount.current = count
    prevLayout.current = layoutKey
  }, [items, layoutKey, reduce])

  useFrame(() => {
    const p = progress.current
    for (let i = 0; i < p.length; i++) {
      if (p[i] < 1) {
        p[i] = Math.min(1, p[i] + 0.07)
        const e = 1 - Math.pow(1 - p[i], 3)
        const obj = refs.current[i]
        if (obj) obj.position.y = items[i].position[1] + DROP * (1 - e)
      }
    }
  })

  if (items.length === 0) return null

  return (
    <Instances limit={MAX_BOXES} castShadow receiveShadow>
      <boxGeometry args={geo} />
      <meshStandardMaterial roughness={0.8} />
      {items.map((it, i) => (
        <Instance
          key={i}
          ref={(el: Object3D | null) => {
            refs.current[i] = el
          }}
          position={it.position}
          color={it.isLoose ? looseHex : color}
        />
      ))}
    </Instances>
  )
}

import { useMemo } from 'react'
import { Instances, Instance } from '@react-three/drei'
import { PALLET, BOX_H, base } from '@/domain/pallet'
import { looseColor } from './palette'
import { useTheme } from '@/store/theme'

interface Props {
  front: number
  depth: number
  rows: number
  loose: number
  color: string
  position: [number, number, number]
}

/** Pallet ubicado en el almacén: tarima simplificada + sus cajas instanciadas. */
export function MiniPallet({ front, depth, rows, loose, color, position }: Props) {
  const theme = useTheme((s) => s.theme)
  const b = base(front, depth)
  const total = b * rows + loose
  const fullBoxes = b * rows

  const dims = useMemo(() => ({ w: PALLET.w / front, d: PALLET.d / depth }), [front, depth])
  const geo = useMemo(
    () => [dims.w - 0.014, BOX_H - 0.008, dims.d - 0.014] as [number, number, number],
    [dims],
  )
  const looseHex = useMemo(() => looseColor(color, theme), [color, theme])

  const items = useMemo(() => {
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
  }, [total, b, fullBoxes, front, dims])

  return (
    <group position={position}>
      <mesh position={[0, PALLET.h - 0.015, 0]} castShadow receiveShadow>
        <boxGeometry args={[PALLET.w, 0.03, PALLET.d]} />
        <meshStandardMaterial color="#b98a55" roughness={0.85} />
      </mesh>
      {[-0.45, 0, 0.45].map((z, i) => (
        <mesh key={i} position={[0, (PALLET.h - 0.03) / 2, z]} castShadow receiveShadow>
          <boxGeometry args={[PALLET.w, PALLET.h - 0.03, 0.1]} />
          <meshStandardMaterial color="#9a7040" roughness={0.9} />
        </mesh>
      ))}
      {total > 0 && (
        <group position={[0, PALLET.h, 0]}>
          <Instances limit={400} castShadow receiveShadow>
            <boxGeometry args={geo} />
            <meshStandardMaterial roughness={0.8} />
            {items.map((it, i) => (
              <Instance key={i} position={it.position} color={it.isLoose ? looseHex : color} />
            ))}
          </Instances>
        </group>
      )}
    </group>
  )
}

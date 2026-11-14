import { useMemo } from 'react'
import { MeshStandardMaterial } from 'three'
import { PALLET } from '@/domain/pallet'

/** Tarima de madera: tablas superiores, largueros, tacos y tablas inferiores. */
export function PalletMesh() {
  const wood = useMemo(
    () => new MeshStandardMaterial({ color: '#b98a55', roughness: 0.85 }),
    [],
  )
  const woodDark = useMemo(
    () => new MeshStandardMaterial({ color: '#9a7040', roughness: 0.9 }),
    [],
  )

  const topPlanks = useMemo(() => {
    const n = 7
    const pw = 0.145
    const gap = (PALLET.w - n * pw) / (n - 1)
    return Array.from({ length: n }, (_, i) => -PALLET.w / 2 + pw / 2 + i * (pw + gap))
  }, [])

  const zs = [-0.45, 0, 0.45]
  const xs = [-0.525, 0, 0.525]

  return (
    <group>
      {/* Tablas superiores */}
      {topPlanks.map((x, i) => (
        <mesh key={`top-${i}`} position={[x, PALLET.h - 0.011, 0]} material={wood} castShadow receiveShadow>
          <boxGeometry args={[0.145, 0.022, PALLET.d]} />
        </mesh>
      ))}
      {/* Largueros intermedios */}
      {zs.map((z, i) => (
        <mesh key={`mid-${i}`} position={[0, PALLET.h - 0.033, z]} material={woodDark} castShadow receiveShadow>
          <boxGeometry args={[PALLET.w, 0.022, 0.1]} />
        </mesh>
      ))}
      {/* Tacos */}
      {xs.flatMap((x, i) =>
        zs.map((z, j) => (
          <mesh key={`foot-${i}-${j}`} position={[x, 0.061, z]} material={woodDark} castShadow receiveShadow>
            <boxGeometry args={[0.145, 0.078, 0.1]} />
          </mesh>
        )),
      )}
      {/* Tablas inferiores */}
      {xs.map((x, i) => (
        <mesh key={`bot-${i}`} position={[x, 0.011, 0]} material={wood} castShadow receiveShadow>
          <boxGeometry args={[0.145, 0.022, PALLET.d]} />
        </mesh>
      ))}
    </group>
  )
}

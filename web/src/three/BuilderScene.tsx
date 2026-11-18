import { useEffect, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { GridHelper, LineBasicMaterial } from 'three'
import { PALLET, BOX_H } from '@/domain/pallet'
import { productById } from '@/domain/inventory'
import { useBuilder } from '@/store/builder'
import { useInventory } from '@/store/inventory'
import { useTheme } from '@/store/theme'
import { useScene } from '@/store/scene'
import { sceneColors } from './palette'
import { PalletMesh } from './PalletMesh'
import { BoxStack } from './BoxStack'
import { useCameraFraming } from './framing'

const SUN_R = 3.5

/** Encuadra la cámara al pallet al montar, en "Vista inicial" y cuando cambia el tamaño. */
function CameraRig() {
  const frameNonce = useScene((s) => s.frameNonce)

  useCameraFraming(() => {
    const { rows, loose } = useBuilder.getState()
    const layers = rows + (loose > 0 ? 1 : 0)
    const top = PALLET.h + BOX_H * Math.max(layers, 1)
    return {
      // Semidiagonal de la caja que envuelve al pallet con su carga.
      radius: 0.5 * Math.hypot(PALLET.w, PALLET.d, top),
      target: [0, top * 0.45, 0],
      dir: [0.72, 0.48, 0.82],
    }
  }, frameNonce)

  return null
}

function Grid() {
  const theme = useTheme((s) => s.theme)
  const grid = useMemo(() => {
    const color = sceneColors(theme).grid
    const g = new GridHelper(60, 120, color, color)
    const mat = g.material as LineBasicMaterial
    mat.transparent = true
    mat.opacity = 0.55
    return g
  }, [theme])

  useEffect(() => () => grid.dispose(), [grid])

  return <primitive object={grid} position={[0, 0.001, 0]} />
}

export function BuilderScene() {
  const front = useBuilder((s) => s.front)
  const depth = useBuilder((s) => s.depth)
  const rows = useBuilder((s) => s.rows)
  const loose = useBuilder((s) => s.loose)
  const productId = useBuilder((s) => s.productId)
  const color = useInventory((s) => productById(s.products, productId)?.color ?? '#c89a5a')
  const build = { front, depth, rows, loose }

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      camera={{ fov: 40, near: 0.1, far: 400, position: [3, 3, 4] }}
    >
      <hemisphereLight args={['#ffffff', '#8a94a3', 0.75]} />
      <directionalLight
        castShadow
        position={[SUN_R * 0.9, SUN_R * 1.8 + 2, SUN_R * 1.2]}
        intensity={0.7}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0004}
      >
        <orthographicCamera
          attach="shadow-camera"
          args={[-SUN_R, SUN_R, SUN_R * 1.3, -SUN_R, 0.5, SUN_R * 6 + 12]}
        />
      </directionalLight>

      {/* Piso que solo recibe sombra */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[120, 120]} />
        <shadowMaterial opacity={0.22} />
      </mesh>
      <Grid />

      {/* Pallet y su carga */}
      <PalletMesh />
      <group position={[0, PALLET.h, 0]}>
        <BoxStack build={build} color={color} />
      </group>

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        maxPolarAngle={Math.PI / 2 - 0.03}
        minDistance={1.2}
        maxDistance={14}
        enablePan={false}
      />
      <CameraRig />
    </Canvas>
  )
}

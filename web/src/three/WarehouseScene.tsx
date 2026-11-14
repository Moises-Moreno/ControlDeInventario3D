import { useEffect, useMemo } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { GridHelper, LineBasicMaterial } from 'three'
import { levelHeight, productById, palletAt, type Loc, type Rack, type Pallet, type Product } from '@/domain/inventory'
import { useInventory } from '@/store/inventory'
import { useUi } from '@/store/ui'
import { useTheme } from '@/store/theme'
import { useScene } from '@/store/scene'
import { sceneColors } from './palette'
import { CELL, rackZ, warehouseDims } from './warehouseLayout'
import { MiniPallet } from './MiniPallet'

type Framer = { target: { set: (x: number, y: number, z: number) => void }; update: () => void }

function WarehouseCamera({ r, height }: { r: number; height: number }) {
  const camera = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls) as Framer | null
  const frameNonce = useScene((s) => s.frameNonce)
  useEffect(() => {
    const dist = r * 1.6 + 5
    const ty = height * 0.35
    camera.position.set(dist * 0.5, ty + dist * 0.5, dist * 0.85)
    if (controls) {
      controls.target.set(0, ty, 0)
      controls.update()
    } else {
      camera.lookAt(0, ty, 0)
    }
  }, [frameNonce, camera, controls, r, height])
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

export function WarehouseScene() {
  const racks = useInventory((s) => s.racks)
  const pallets = useInventory((s) => s.pallets)
  const products = useInventory((s) => s.products)
  const placePallet = useInventory((s) => s.placePallet)
  const placingId = useUi((s) => s.placingId)
  const setPlacing = useUi((s) => s.setPlacing)
  const selectedSlot = useUi((s) => s.selectedSlot)
  const selectSlot = useUi((s) => s.selectSlot)
  const theme = useTheme((s) => s.theme)

  const H = levelHeight(pallets)
  const n = racks.length
  const dims = warehouseDims(racks, H)
  const placing = placingId != null

  const colors = {
    post: '#2f55c8',
    beam: '#e0731c',
    green: theme === 'dark' ? '#5fd08a' : '#1b7f47',
    accent: theme === 'dark' ? '#7d9bff' : '#2447c9',
    grid: sceneColors(theme).grid,
  }

  async function pick(slot: Loc) {
    if (placing && !palletAt(pallets, slot)) {
      const r = await placePallet(placingId!, slot)
      if (r.ok) {
        setPlacing(null)
        selectSlot({ ...slot })
      }
      return
    }
    selectSlot({ ...slot })
  }

  const R = Math.max(dims.maxLen, dims.depth, dims.height)

  return (
    <Canvas shadows dpr={[1, 2]} gl={{ antialias: true, alpha: true }} camera={{ fov: 40, near: 0.1, far: 400, position: [6, 6, 8] }}>
      <hemisphereLight args={['#ffffff', '#8a94a3', 0.75]} />
      <directionalLight
        castShadow
        position={[R * 0.7, R * 1.4 + 4, R * 0.9]}
        intensity={0.7}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0004}
      >
        <orthographicCamera attach="shadow-camera" args={[-R, R, R * 1.3, -R, 0.5, R * 6 + 14]} />
      </directionalLight>

      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <shadowMaterial opacity={0.22} />
      </mesh>
      <Grid />

      <group position={[dims.offsetX, 0, dims.offsetZ]}>
        {racks.map((r, ri) => (
          <RackGroup
            key={r.id}
            rack={r}
            z0={rackZ(ri, n)}
            H={H}
            placing={placing}
            colors={colors}
            pallets={pallets}
            products={products}
            onPick={pick}
          />
        ))}

        {selectedSlot && (
          <SelectionBox slot={selectedSlot} racks={racks} n={n} H={H} color={colors.accent} />
        )}
      </group>

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        maxPolarAngle={Math.PI / 2 - 0.03}
        minDistance={2}
        maxDistance={90}
      />
      <WarehouseCamera r={R} height={dims.height} />
    </Canvas>
  )
}

interface RackProps {
  rack: Rack
  z0: number
  H: number
  placing: boolean
  colors: { post: string; beam: string; green: string; accent: string; grid: string }
  pallets: Pallet[]
  products: Product[]
  onPick: (slot: Loc) => void
}

function RackGroup({ rack, z0, H, placing, colors, pallets, products, onPick }: RackProps) {
  const len = rack.positions * CELL.w
  const height = (rack.levels - 1) * H + 1.15
  const zo = CELL.d / 2 - 0.045

  const posts: number[] = []
  for (let k = 0; k <= rack.positions; k++) posts.push(k * CELL.w)

  const beams: number[] = []
  for (let L = 2; L <= rack.levels; L++) beams.push((L - 1) * H - 0.05)

  const cells: { loc: Loc; cx: number; y0: number }[] = []
  for (let L = 1; L <= rack.levels; L++) {
    for (let P = 1; P <= rack.positions; P++) {
      cells.push({ loc: { rackId: rack.id, level: L, pos: P }, cx: (P - 0.5) * CELL.w, y0: (L - 1) * H })
    }
  }

  return (
    <group>
      {/* Parantes */}
      {posts.map((x, i) => (
        <group key={`p-${i}`}>
          <mesh position={[x, height / 2, z0 - zo]} castShadow>
            <boxGeometry args={[0.09, height, 0.09]} />
            <meshStandardMaterial color={colors.post} roughness={0.6} />
          </mesh>
          <mesh position={[x, height / 2, z0 + zo]} castShadow>
            <boxGeometry args={[0.09, height, 0.09]} />
            <meshStandardMaterial color={colors.post} roughness={0.6} />
          </mesh>
        </group>
      ))}
      {/* Vigas */}
      {beams.map((y, i) => (
        <group key={`b-${i}`}>
          <mesh position={[len / 2, y, z0 - zo]} castShadow>
            <boxGeometry args={[len, 0.1, 0.06]} />
            <meshStandardMaterial color={colors.beam} roughness={0.6} />
          </mesh>
          <mesh position={[len / 2, y, z0 + zo]} castShadow>
            <boxGeometry args={[len, 0.1, 0.06]} />
            <meshStandardMaterial color={colors.beam} roughness={0.6} />
          </mesh>
        </group>
      ))}
      {/* Posiciones */}
      {cells.map(({ loc, cx, y0 }) => {
        const occ = palletAt(pallets, loc)
        return (
          <group key={`${loc.level}-${loc.pos}`}>
            {/* Zona clickeable */}
            <mesh
              position={[cx, y0 + (H - 0.14) / 2, z0]}
              onClick={(e) => {
                e.stopPropagation()
                onPick(loc)
              }}
              onPointerOver={() => (document.body.style.cursor = 'pointer')}
              onPointerOut={() => (document.body.style.cursor = '')}
            >
              <boxGeometry args={[CELL.w - 0.12, H - 0.14, CELL.d]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>

            {occ ? (
              <MiniPallet
                front={occ.front}
                depth={occ.depth}
                rows={occ.rows}
                loose={occ.loose}
                color={productById(products, occ.productId)?.color ?? '#c89a5a'}
                position={[cx, y0, z0]}
              />
            ) : (
              <mesh position={[cx, y0 + 0.02, z0]}>
                <boxGeometry args={[CELL.w - 0.3, 0.02, CELL.d - 0.25]} />
                <meshBasicMaterial
                  color={placing ? colors.green : colors.grid}
                  transparent
                  opacity={placing ? 0.6 : 0.3}
                  depthWrite={false}
                />
              </mesh>
            )}
          </group>
        )
      })}

    </group>
  )
}

function SelectionBox({ slot, racks, n, H, color }: { slot: Loc; racks: Rack[]; n: number; H: number; color: string }) {
  const ri = racks.findIndex((r) => r.id === slot.rackId)
  if (ri < 0) return null
  const z0 = rackZ(ri, n)
  const cx = (slot.pos - 0.5) * CELL.w
  const y = (slot.level - 1) * H + (H - 0.1) / 2
  return (
    <mesh position={[cx, y, z0]}>
      <boxGeometry args={[CELL.w - 0.06, H - 0.1, CELL.d + 0.06]} />
      <meshBasicMaterial color={color} transparent opacity={0.16} depthWrite={false} />
    </mesh>
  )
}

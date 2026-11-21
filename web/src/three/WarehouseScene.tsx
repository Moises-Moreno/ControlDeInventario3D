import { useEffect, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { Line, OrbitControls } from '@react-three/drei'
import { GridHelper, LineBasicMaterial } from 'three'
import { levelHeight, productById, palletAt, sameLoc, type Loc, type Rack, type Pallet, type Product } from '@/domain/inventory'
import { CELL, buildPlan, type WarehousePlan } from '@/domain/warehousePlan'
import { useInventory } from '@/store/inventory'
import { useUi } from '@/store/ui'
import { useTheme } from '@/store/theme'
import { useScene } from '@/store/scene'
import { sceneColors } from './palette'
import { MiniPallet } from './MiniPallet'
import { Label3D } from './Label3D'
import { useCameraFraming } from './framing'

/** Encuadra el almacén completo; se reencuadra al pedir "Vista inicial" o al cambiar sus medidas. */
function WarehouseCamera({ len, depth, height }: { len: number; depth: number; height: number }) {
  const frameNonce = useScene((s) => s.frameNonce)

  useCameraFraming(
    () => ({
      // Algo menos que la semidiagonal de la caja que envuelve a los racks: el plano es plano y
      // desde arriba no ocupa toda la esfera.
      radius: 0.4 * Math.hypot(len, depth, height),
      target: [0, height * 0.3, 0],
      dir: [0.35, 0.7, 0.75],
    }),
    `${frameNonce}|${len.toFixed(1)}|${depth.toFixed(1)}|${height.toFixed(2)}`,
  )

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

interface SceneColors {
  post: string
  beam: string
  green: string
  accent: string
  grid: string
  guide: string
  aisle: string
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
  const guideLocs = useUi((s) => s.guideLocs)
  const route = useUi((s) => s.route)
  const theme = useTheme((s) => s.theme)

  const H = levelHeight(pallets)
  const plan = useMemo(() => buildPlan(racks), [racks])
  const placing = placingId != null
  const maxLevels = Math.max(1, ...racks.map((r) => r.levels))
  const height = maxLevels * H

  const colors: SceneColors = {
    post: '#2f55c8',
    beam: '#e0731c',
    green: theme === 'dark' ? '#5fd08a' : '#1b7f47',
    accent: theme === 'dark' ? '#7d9bff' : '#2447c9',
    grid: sceneColors(theme).grid,
    guide: '#f59e0b',
    aisle: theme === 'dark' ? '#cbd5e1' : '#64748b',
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

  const R = Math.max(plan.width, plan.height, height)
  // Los racks se dibujan en coordenadas del plano; el grupo los centra en el origen.
  const offset: [number, number, number] = [-plan.width / 2, 0, -plan.height / 2]

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

      <group position={offset}>
        <Aisles plan={plan} color={colors.aisle} />
        <Entries plan={plan} />

        {racks.map((r) => {
          const rp = plan.racks.find((x) => x.rackId === r.id)
          if (!rp) return null
          return (
            <RackGroup
              key={r.id}
              rack={r}
              x0={plan.x0}
              z0={rp.v0 + CELL.d / 2}
              H={H}
              placing={placing}
              colors={colors}
              pallets={pallets}
              products={products}
              guideLocs={guideLocs}
              onPick={pick}
            />
          )
        })}

        {selectedSlot && <SelectionBox slot={selectedSlot} plan={plan} H={H} color={colors.accent} />}

        {route &&
          route.legs.map((leg, i) => (
            <Line
              key={i}
              points={leg.points.map((p) => [p.x, 0.08, p.v] as [number, number, number])}
              color={colors.guide}
              lineWidth={4}
              dashed
              dashSize={0.5}
              gapSize={0.25}
            />
          ))}
        {/* Número de cada parada, sobre el punto donde termina su tramo */}
        {route &&
          route.stops.map((_s, i) => {
            const leg = route.legs[i]
            const end = leg?.points[leg.points.length - 1]
            if (!end) return null
            return <Label3D key={`stop-${i}`} text={String(i + 1)} shape="circle" size={0.7} bg={colors.guide} fg="#1f2937" position={[end.x, 1.3, end.v]} />
          })}
      </group>

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        maxPolarAngle={Math.PI / 2 - 0.03}
        minDistance={2}
        maxDistance={90}
      />
      <WarehouseCamera len={plan.width} depth={plan.height} height={height} />
    </Canvas>
  )
}

/** Piso de los pasillos (anillo alrededor de B+C), un poco más oscuro que el resto. */
function Aisles({ plan, color }: { plan: WarehousePlan; color: string }) {
  if (!plan.aisles.length) return null
  const first = plan.aisles[0]
  const last = plan.aisles[plan.aisles.length - 1]
  const laneH = 2.8
  return (
    <group>
      {plan.aisles.map((v, i) => (
        <mesh key={i} rotation-x={-Math.PI / 2} position={[plan.width / 2, 0.004, v]}>
          <planeGeometry args={[plan.width - 0.4, laneH]} />
          <meshBasicMaterial color={color} transparent opacity={0.16} depthWrite={false} />
        </mesh>
      ))}
      {[plan.xLeft, plan.xRight].map((x) => (
        <mesh key={x} rotation-x={-Math.PI / 2} position={[x, 0.004, (first + last) / 2]}>
          <planeGeometry args={[laneH, last - first + laneH]} />
          <meshBasicMaterial color={color} transparent opacity={0.16} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

/** Marcas de los ingresos: el principal en verde y el cerrado en rojo. */
function Entries({ plan }: { plan: WarehousePlan }) {
  return (
    <group>
      {plan.entries.map((e) =>
        e.open ? (
          <Label3D key={e.id} text="INGRESO" shape="pill" size={0.55} bg="#16a34a" position={[e.x + 0.9, 0.5, e.v]} />
        ) : (
          // Ingreso cerrado: solo una franja roja sobre la pared.
          <mesh key={e.id} position={[e.x, 0.6, e.v]}>
            <boxGeometry args={[0.12, 1.2, 2.2]} />
            <meshBasicMaterial color="#dc2626" />
          </mesh>
        ),
      )}
    </group>
  )
}

interface RackProps {
  rack: Rack
  x0: number
  z0: number
  H: number
  placing: boolean
  colors: SceneColors
  pallets: Pallet[]
  products: Product[]
  guideLocs: Loc[]
  onPick: (slot: Loc) => void
}

function RackGroup({ rack, x0, z0, H, placing, colors, pallets, products, guideLocs, onPick }: RackProps) {
  const len = rack.positions * CELL.w
  const height = (rack.levels - 1) * H + 1.15
  const zo = CELL.d / 2 - 0.045
  const top = height + 0.25

  const posts: number[] = []
  for (let k = 0; k <= rack.positions; k++) posts.push(x0 + k * CELL.w)

  const beams: number[] = []
  for (let L = 2; L <= rack.levels; L++) beams.push((L - 1) * H - 0.05)

  const cells: { loc: Loc; cx: number; y0: number }[] = []
  for (let L = 1; L <= rack.levels; L++) {
    for (let P = 1; P <= rack.positions; P++) {
      cells.push({ loc: { rackId: rack.id, level: L, pos: P }, cx: x0 + (P - 0.5) * CELL.w, y0: (L - 1) * H })
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
          <mesh position={[x0 + len / 2, y, z0 - zo]} castShadow>
            <boxGeometry args={[len, 0.1, 0.06]} />
            <meshStandardMaterial color={colors.beam} roughness={0.6} />
          </mesh>
          <mesh position={[x0 + len / 2, y, z0 + zo]} castShadow>
            <boxGeometry args={[len, 0.1, 0.06]} />
            <meshStandardMaterial color={colors.beam} roughness={0.6} />
          </mesh>
        </group>
      ))}

      {/* Posiciones */}
      {cells.map(({ loc, cx, y0 }) => {
        const occ = palletAt(pallets, loc)
        const guided = guideLocs.some((g) => sameLoc(g, loc))
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

            {/* Posición sugerida / de la ruta: se resalta con un volumen ámbar */}
            {guided && (
              <mesh position={[cx, y0 + (H - 0.1) / 2, z0]}>
                <boxGeometry args={[CELL.w - 0.04, H - 0.08, CELL.d + 0.05]} />
                <meshBasicMaterial color={colors.guide} transparent opacity={0.35} depthWrite={false} />
              </mesh>
            )}
          </group>
        )
      })}

      {/* Rótulos: nombre del rack, número de fila (arriba) y nivel (extremo izquierdo) */}
      <Label3D text={rack.name} position={[x0 - 0.7, top, z0]} size={0.9} bg={colors.accent} />
      {Array.from({ length: rack.positions }, (_, i) => (
        <Label3D
          key={`f${i}`}
          text={String(i + 1).padStart(3, '0')}
          shape="pill"
          size={0.34}
          bg="#334155"
          position={[x0 + (i + 0.5) * CELL.w, top, z0]}
        />
      ))}
      {Array.from({ length: rack.levels }, (_, i) => (
        <Label3D
          key={`n${i}`}
          text={`N${i + 1}`}
          shape="pill"
          size={0.3}
          bg="#0f766e"
          position={[x0 - 0.3, i * H + (H - 0.1) / 2, z0]}
        />
      ))}
    </group>
  )
}

function SelectionBox({ slot, plan, H, color }: { slot: Loc; plan: WarehousePlan; H: number; color: string }) {
  const rp = plan.racks.find((r) => r.rackId === slot.rackId)
  if (!rp) return null
  const cx = plan.x0 + (slot.pos - 0.5) * CELL.w
  const y = (slot.level - 1) * H + (H - 0.1) / 2
  return (
    <mesh position={[cx, y, rp.v0 + CELL.d / 2]}>
      <boxGeometry args={[CELL.w - 0.06, H - 0.1, CELL.d + 0.06]} />
      <meshBasicMaterial color={color} transparent opacity={0.16} depthWrite={false} />
    </mesh>
  )
}

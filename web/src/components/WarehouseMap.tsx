import { useMemo } from 'react'
import { useInventory } from '@/store/inventory'
import { buildPlan, aisleName, CELL, AISLE, type Route, type WarehousePlan } from '@/domain/warehousePlan'
import { sameLoc, type Loc, type Pallet, type Product, type Rack } from '@/domain/inventory'
import { cn } from '@/lib/utils'

interface Props {
  racks: Rack[]
  pallets: Pallet[]
  products: Product[]
  /** Posiciones a resaltar (la sugerida o las paradas). */
  guideLocs?: Loc[]
  route?: Route | null
  selected?: Loc | null
  /** Se llama al tocar una fila de un rack. */
  onSelectFila?: (rackId: number, pos: number) => void
  className?: string
}

const GUIDE = '#f59e0b'
const ENTRY = '#16a34a'
const CLOSED = '#dc2626'

/**
 * Planta del almacén vista desde arriba. Cada fila de un rack muestra sus niveles
 * como cuadraditos (N1 a la izquierda): pintados = ocupados, vacíos = libres.
 */
export function WarehouseMap({ racks, pallets, products, guideLocs = [], route = null, selected = null, onSelectFila, className }: Props) {
  const plan = useMemo(() => buildPlan(racks), [racks])
  const categories = useInventory((s) => s.categories)
  if (!plan.racks.length) {
    return <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">Agregá un rack para ver el plano.</p>
  }

  const pad = 0.4
  const colorOf = (productId: number) => products.find((p) => p.id === productId)?.color ?? '#94a3b8'

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <svg
        viewBox={`${-pad} ${-pad} ${plan.width + pad * 2} ${plan.height + pad * 2}`}
        role="img"
        aria-label="Plano del almacén visto desde arriba"
        className="block h-auto w-full rounded-xl border border-border bg-card"
      >
        {/* Paredes */}
        <rect x={0} y={0} width={plan.width} height={plan.height} rx={0.25} fill="var(--background)" stroke="var(--muted-foreground)" strokeOpacity={0.45} strokeWidth={0.1} />

        <Walkways plan={plan} />

        {/* Racks */}
        {plan.racks.map((rp) => {
          const rack = racks.find((r) => r.id === rp.rackId)!
          const zone = categories.find((c) => c.id === rack.categoryId)
          return (
            <g key={rp.rackId}>
              {Array.from({ length: rack.positions }, (_, i) => {
                const pos = i + 1
                const x = plan.x0 + i * CELL.w
                const guided = guideLocs.some((g) => g.rackId === rack.id && g.pos === pos)
                const isSelected = !!selected && selected.rackId === rack.id && selected.pos === pos
                const sq = Math.min(0.24, (CELL.w - 0.3) / rack.levels - 0.06)
                const gap = 0.06
                const rowW = rack.levels * sq + (rack.levels - 1) * gap
                const sx = x + (CELL.w - rowW) / 2
                const sy = rp.v0 + CELL.d - sq - 0.17
                return (
                  <g
                    key={pos}
                    onClick={onSelectFila ? () => onSelectFila(rack.id, pos) : undefined}
                    style={{ cursor: onSelectFila ? 'pointer' : undefined }}
                  >
                    <rect
                      x={x + 0.03}
                      y={rp.v0}
                      width={CELL.w - 0.06}
                      height={CELL.d}
                      rx={0.08}
                      fill={guided ? GUIDE : 'var(--card)'}
                      fillOpacity={guided ? 0.28 : 1}
                      stroke={guided ? GUIDE : isSelected ? 'var(--primary)' : 'var(--border)'}
                      strokeWidth={guided || isSelected ? 0.11 : 0.05}
                    >
                      {guided && <animate attributeName="stroke-opacity" values="1;0.25;1" dur="1.4s" repeatCount="indefinite" />}
                    </rect>
                    <text
                      x={x + CELL.w / 2}
                      y={rp.v0 + 0.42}
                      textAnchor="middle"
                      fontSize={0.32}
                      fontWeight={700}
                      fill="var(--foreground)"
                      style={{ pointerEvents: 'none' }}
                    >
                      {String(pos).padStart(3, '0')}
                    </text>
                    {/* Niveles: N1 a la izquierda */}
                    {Array.from({ length: rack.levels }, (_, l) => {
                      const level = l + 1
                      const loc = { rackId: rack.id, level, pos }
                      const occ = pallets.find((p) => sameLoc(p.loc, loc))
                      const target = guideLocs.some((g) => sameLoc(g, loc))
                      return (
                        <rect
                          key={level}
                          x={sx + l * (sq + gap)}
                          y={sy}
                          width={sq}
                          height={sq}
                          rx={0.04}
                          fill={target ? GUIDE : occ ? colorOf(occ.productId) : 'transparent'}
                          stroke={target ? GUIDE : occ ? 'rgba(0,0,0,0.25)' : 'var(--muted-foreground)'}
                          strokeOpacity={occ || target ? 1 : 0.45}
                          strokeWidth={0.035}
                          style={{ pointerEvents: 'none' }}
                        />
                      )
                    })}
                  </g>
                )
              })}
              {/* Letra del rack */}
              <g transform={`translate(${plan.x0 - 0.62} ${rp.v0 + CELL.d / 2})`} style={{ pointerEvents: 'none' }}>
                <circle r={0.42} fill={zone ? zone.color : 'var(--primary)'} stroke={zone ? 'rgba(0,0,0,0.35)' : undefined} strokeWidth={0.05} />
                <text textAnchor="middle" y={0.17} fontSize={0.5} fontWeight={800} fill={zone ? '#0f172a' : 'var(--primary-foreground)'}>
                  {rp.name}
                </text>
              </g>
            </g>
          )
        })}

        {/* Ingresos: el principal en verde; el cerrado, solo una línea roja en la pared */}
        {plan.entries.map((e) =>
          e.open ? (
            <g key={e.id}>
              <line x1={e.x} y1={e.v - AISLE / 2 + 0.25} x2={e.x} y2={e.v + AISLE / 2 - 0.25} stroke={ENTRY} strokeWidth={0.28} strokeLinecap="round" />
              <path d={`M ${e.x + 0.35} ${e.v - 0.28} L ${e.x + 0.8} ${e.v} L ${e.x + 0.35} ${e.v + 0.28}`} fill="none" stroke={ENTRY} strokeWidth={0.12} strokeLinecap="round" strokeLinejoin="round" />
              <text x={e.x + 0.25} y={e.v + AISLE / 2 - 0.3} fontSize={0.34} fontWeight={800} fill={ENTRY}>
                INGRESO
              </text>
            </g>
          ) : (
            <line key={e.id} x1={e.x} y1={e.v - AISLE / 2 + 0.25} x2={e.x} y2={e.v + AISLE / 2 - 0.25} stroke={CLOSED} strokeWidth={0.28} strokeLinecap="round" />
          ),
        )}

        {/* Recorrido */}
        {route && <RouteLayer route={route} />}
      </svg>

      <Legend hasRoute={!!route?.legs.length} zones={racks.filter((r) => r.categoryId != null).map((r) => ({ rack: r.name, category: categories.find((c) => c.id === r.categoryId) }))} />
    </div>
  )
}

/** Piso de circulación con una línea central y flechas chicas que marcan el sentido. */
function Walkways({ plan }: { plan: WarehousePlan }) {
  if (!plan.aisles.length) return null
  const first = plan.aisles[0]
  const last = plan.aisles[plan.aisles.length - 1]
  const ring = plan.aisles.length > 1
  const floor = 'var(--muted)'
  const line = 'var(--muted-foreground)'

  // Flechas a lo largo de un tramo, dejando libre el centro para el nombre del pasillo.
  const chevrons = (x1: number, v1: number, x2: number, v2: number, n: number, skipMiddle = false) => {
    const out: { x: number; v: number; angle: number }[] = []
    const angle = (Math.atan2(v2 - v1, x2 - x1) * 180) / Math.PI
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n
      if (skipMiddle && t > 0.38 && t < 0.62) continue
      out.push({ x: x1 + (x2 - x1) * t, v: v1 + (v2 - v1) * t, angle })
    }
    return out.map((c, i) => (
      <path
        key={i}
        d="M -0.14 -0.18 L 0.12 0 L -0.14 0.18"
        transform={`translate(${c.x} ${c.v}) rotate(${c.angle})`}
        fill="none"
        stroke={line}
        strokeOpacity={0.7}
        strokeWidth={0.07}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ))
  }

  return (
    <g style={{ pointerEvents: 'none' }}>
      {/* Piso */}
      {plan.aisles.map((v, i) => (
        <rect key={i} x={plan.xLeft - AISLE / 2 + 0.15} y={v - AISLE / 2 + 0.15} width={plan.xRight - plan.xLeft + AISLE - 0.3} height={AISLE - 0.3} rx={0.3} fill={floor} opacity={0.45} />
      ))}
      {ring && (
        <>
          <rect x={plan.xLeft - AISLE / 2 + 0.15} y={first} width={AISLE - 0.3} height={last - first} fill={floor} opacity={0.45} />
          <rect x={plan.xRight - AISLE / 2 + 0.15} y={first} width={AISLE - 0.3} height={last - first} fill={floor} opacity={0.45} />
        </>
      )}

      {/* Línea central */}
      <path
        d={
          ring
            ? `M ${plan.xLeft} ${last} L ${plan.xLeft} ${first} L ${plan.xRight} ${first} L ${plan.xRight} ${last} Z`
            : `M ${plan.xLeft} ${first} L ${plan.xRight} ${first}`
        }
        fill="none"
        stroke={line}
        strokeOpacity={0.35}
        strokeWidth={0.05}
        strokeDasharray="0.3 0.25"
      />

      {/* Sentido de circulación */}
      {ring && (
        <>
          {chevrons(plan.xLeft, last, plan.xLeft, first, 3)}
          {chevrons(plan.xLeft, first, plan.xRight, first, 7, true)}
          {chevrons(plan.xRight, first, plan.xRight, last, 3)}
        </>
      )}

      {/* Nombres de los pasillos */}
      {plan.aisles.map((v, i) => (
        <text key={i} x={(plan.xLeft + plan.xRight) / 2} y={v + 0.14} textAnchor="middle" fontSize={0.4} fontWeight={700} fill={line} opacity={0.85} letterSpacing={0.04}>
          {aisleName(i).toUpperCase()}
        </text>
      ))}
    </g>
  )
}

/** Recorrido desde el ingreso hasta cada parada, con las paradas numeradas. */
function RouteLayer({ route }: { route: Route }) {
  const start = route.legs[0]?.points[0]
  return (
    <g style={{ pointerEvents: 'none' }}>
      {route.legs.map((leg, i) => {
        const pts = leg.points.map((p) => `${p.x},${p.v}`).join(' ')
        const back = leg.toStop === -1
        return (
          <g key={i}>
            <polyline points={pts} fill="none" stroke={back ? 'var(--muted-foreground)' : GUIDE} strokeOpacity={back ? 0.5 : 0.35} strokeWidth={0.42} strokeLinejoin="round" strokeLinecap="round" />
            <polyline
              points={pts}
              fill="none"
              stroke={back ? 'var(--muted-foreground)' : GUIDE}
              strokeWidth={0.16}
              strokeLinejoin="round"
              strokeLinecap="round"
              strokeDasharray={back ? '0.25 0.25' : '0.5 0.3'}
            >
              <animate attributeName="stroke-dashoffset" from="1.6" to="0" dur="1s" repeatCount="indefinite" />
            </polyline>
          </g>
        )
      })}
      {start && <circle cx={start.x} cy={start.v} r={0.3} fill={ENTRY} stroke="#fff" strokeWidth={0.08} />}
      {badges(route).map((b) => {
        const label = b.numbers.join('·')
        const w = Math.max(0.84, 0.3 * label.length + 0.4)
        return (
          <g key={b.key} transform={`translate(${b.x} ${b.v})`}>
            <rect x={-w / 2} y={-0.42} width={w} height={0.84} rx={0.42} fill={GUIDE} stroke="#fff" strokeWidth={0.09} />
            <text textAnchor="middle" y={0.17} fontSize={0.48} fontWeight={800} fill="#1f2937">
              {label}
            </text>
          </g>
        )
      })}
    </g>
  )
}

/**
 * Un número por parada, sobre el pasillo frente a su fila. Si varias paradas caen en la
 * misma fila (distintos niveles), se juntan en una sola etiqueta ("1·2").
 */
function badges(route: Route): { key: string; x: number; v: number; numbers: number[] }[] {
  const out: { key: string; x: number; v: number; numbers: number[] }[] = []
  route.stops.forEach((_, i) => {
    const leg = route.legs[i]
    const end = leg?.points[leg.points.length - 1]
    const prev = leg?.points[leg.points.length - 2]
    if (!end) return
    const v = prev ? end.v + (prev.v - end.v) * 0.5 : end.v
    const key = `${end.x.toFixed(2)}|${v.toFixed(2)}`
    const found = out.find((b) => b.key === key)
    if (found) found.numbers.push(i + 1)
    else out.push({ key, x: end.x, v, numbers: [i + 1] })
  })
  return out
}

function Legend({ hasRoute, zones }: { hasRoute: boolean; zones: { rack: string; category?: { name: string; color: string } }[] }) {
  const item = 'flex items-center gap-1.5'
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-xs text-muted-foreground">
      <span className={item}>
        <span className="inline-block size-3 rounded-[3px] border border-muted-foreground/50" /> Libre
      </span>
      <span className={item}>
        <span className="inline-block size-3 rounded-[3px] bg-[#5fa8d3]" /> Ocupado (color del producto)
      </span>
      <span className={item}>
        <span className="inline-block size-3 rounded-[3px]" style={{ background: GUIDE }} /> Destino
      </span>
      {hasRoute && (
        <span className={item}>
          <span className="inline-block h-1 w-5 rounded-full" style={{ background: GUIDE }} /> Recorrido
        </span>
      )}
      {zones.map((z) => (
        <span key={z.rack} className={item}>
          <span className="inline-block size-3 rounded-full border border-black/30" style={{ background: z.category?.color }} /> Rack {z.rack}: {z.category?.name ?? 'categoría'}
        </span>
      ))}
      <span className="w-full">Cada fila muestra sus niveles de izquierda a derecha: N1 (abajo) … N4 (arriba).</span>
    </div>
  )
}

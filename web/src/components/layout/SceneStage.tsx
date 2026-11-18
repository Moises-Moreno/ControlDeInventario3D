import { useEffect, useState } from 'react'
import { Boxes, LocateFixed, Maximize2, Minimize2, type LucideIcon } from 'lucide-react'
import { BuilderScene } from '@/three/BuilderScene'
import { WarehouseScene } from '@/three/WarehouseScene'
import { hasWebGL } from '@/three/webgl'
import { looseColor } from '@/three/palette'
import { useBuilder } from '@/store/builder'
import { useInventory } from '@/store/inventory'
import { useUi } from '@/store/ui'
import { useTheme } from '@/store/theme'
import { useScene } from '@/store/scene'
import { useLayout } from '@/store/layout'
import { productById, occupancy } from '@/domain/inventory'
import { cn } from '@/lib/utils'

function OverlayButton({
  icon: Icon,
  label,
  onClick,
  showLabel = false,
}: {
  icon: LucideIcon
  label: string
  onClick: () => void
  showLabel?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        'pointer-events-auto flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card/85 text-sm font-medium backdrop-blur transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        showLabel ? 'px-3.5' : 'w-11',
      )}
    >
      <Icon className="size-5" aria-hidden />
      {showLabel && <span>{label}</span>}
    </button>
  )
}

/** Escena 3D (armador o almacén) con sus controles superpuestos. */
export function SceneStage({ compact = false }: { compact?: boolean }) {
  const [webgl] = useState(hasWebGL)
  const tab = useUi((s) => s.tab)
  const placingId = useUi((s) => s.placingId)
  const requestFrame = useScene((s) => s.requestFrame)
  const theme = useTheme((s) => s.theme)
  const sceneFull = useLayout((s) => s.sceneFull)
  const toggleSceneFull = useLayout((s) => s.toggleSceneFull)
  const setSceneFull = useLayout((s) => s.setSceneFull)

  const productId = useBuilder((s) => s.productId)
  const products = useInventory((s) => s.products)
  const pallets = useInventory((s) => s.pallets)
  const racks = useInventory((s) => s.racks)

  const product = productById(products, productId)
  const color = product?.color ?? '#c89a5a'
  const looseHex = looseColor(color, theme)
  const warehouse = tab === 'almacen'
  const { cap, used } = occupancy(racks, pallets)
  const placing = pallets.find((p) => p.id === placingId) ?? null

  // Esc sale de pantalla completa.
  useEffect(() => {
    if (!sceneFull) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSceneFull(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sceneFull, setSceneFull])

  let title: string
  let subtitle: string
  if (warehouse) {
    title = placing ? `Ubicando ${placing.pal}` : 'Almacén'
    subtitle = placing ? 'tocá una posición libre' : `${used} de ${cap} ocupadas`
  } else {
    title = product ? product.code : 'Sin producto'
    subtitle = product ? product.name : 'elegí un producto'
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-gradient-to-b from-secondary to-background">
      {webgl ? (
        warehouse ? (
          <WarehouseScene />
        ) : (
          <BuilderScene />
        )
      ) : (
        <div className="flex h-full items-center justify-center p-6 text-center text-muted-foreground">
          <div className="flex max-w-sm flex-col items-center gap-2">
            <Boxes className="size-8" aria-hidden />
            <p>
              Este navegador no pudo iniciar la vista 3D. El panel y el conteo siguen funcionando; en el almacén podés
              usar la lista de posiciones libres.
            </p>
          </div>
        </div>
      )}

      {/* Barra superior: qué se está viendo + controles */}
      <div className="pointer-events-none absolute inset-x-2 top-2 flex items-start gap-2 sm:inset-x-3 sm:top-3">
        <div className="min-w-0 flex-1">
          <div
            className={cn(
              'inline-flex max-w-full items-baseline gap-1.5 rounded-xl border border-border bg-card/85 px-3 py-2 text-muted-foreground backdrop-blur',
              compact ? 'text-xs' : 'text-sm',
            )}
          >
            <strong className={cn('shrink-0 font-semibold text-foreground', compact ? 'text-sm' : 'text-base')}>
              {title}
            </strong>
            <span className="min-w-0 truncate">· {subtitle}</span>
          </div>
        </div>
        {webgl && (
          <div className="flex shrink-0 gap-2">
            <OverlayButton icon={LocateFixed} label="Vista inicial" onClick={requestFrame} showLabel={!compact} />
            <OverlayButton
              icon={sceneFull ? Minimize2 : Maximize2}
              label={sceneFull ? 'Salir de pantalla completa' : 'Pantalla completa'}
              onClick={toggleSceneFull}
            />
          </div>
        )}
      </div>

      {/* Barra inferior: leyenda y ayuda */}
      <div className="pointer-events-none absolute inset-x-2 bottom-2 flex items-end justify-between gap-2 sm:inset-x-3 sm:bottom-3">
        {!warehouse && (
          <div
            className={cn(
              'flex gap-3 rounded-xl border border-border bg-card/85 text-muted-foreground backdrop-blur',
              compact ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-sm',
            )}
          >
            <span className="flex items-center gap-1.5">
              <i className="inline-block size-3 rounded-sm border border-border" style={{ background: color }} />
              Fila completa
            </span>
            <span className="flex items-center gap-1.5">
              <i className="inline-block size-3 rounded-sm border border-border" style={{ background: looseHex }} />
              Caja suelta
            </span>
          </div>
        )}
        <div className="ml-auto hidden rounded-xl border border-border bg-card/85 px-3 py-2 text-sm text-muted-foreground backdrop-blur xl:block">
          {warehouse
            ? 'Tocá una posición · arrastrá para rotar · rueda para acercar'
            : 'Arrastrá para rotar · rueda o pellizco para acercar'}
        </div>
      </div>
    </div>
  )
}

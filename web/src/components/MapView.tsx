import { Box, Route as RouteIcon } from 'lucide-react'
import { toast } from 'sonner'
import { useInventory, useZones } from '@/store/inventory'
import { useUi } from '@/store/ui'
import { useLayout } from '@/store/layout'
import { useAuth } from '@/store/auth'
import { useBuilder } from '@/store/builder'
import { canPlace } from '@/domain/zones'
import { describe, locCode, palletAt, presentationOf, productById, sameLoc } from '@/domain/inventory'
import { WarehouseMap } from '@/components/WarehouseMap'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const fmtDate = (iso: string) => iso.split('-').reverse().join('/')

/**
 * Plano 2D del almacén (la vista principal) con la guía y la ruta del momento, el detalle
 * de la fila tocada y los botones para verlo en 3D solo si hace falta.
 */
export function MapView({ className }: { className?: string }) {
  const racks = useInventory((s) => s.racks)
  const pallets = useInventory((s) => s.pallets)
  const products = useInventory((s) => s.products)
  const selectedSlot = useUi((s) => s.selectedSlot)
  const selectSlot = useUi((s) => s.selectSlot)
  const guideLocs = useUi((s) => s.guideLocs)
  const route = useUi((s) => s.route)
  const open3d = useLayout((s) => s.open3d)

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <WarehouseMap
        racks={racks}
        pallets={pallets}
        products={products}
        selected={selectedSlot}
        guideLocs={guideLocs}
        route={route}
        onSelectFila={(rackId, pos) =>
          selectSlot(selectedSlot && selectedSlot.rackId === rackId && selectedSlot.pos === pos ? null : { rackId, level: 1, pos })
        }
      />
      <div className="flex flex-wrap gap-2">
        {route && route.legs.length > 0 && (
          <Button onClick={() => open3d('almacen')}>
            <RouteIcon /> Ver ruta en 3D
          </Button>
        )}
        <Button variant="outline" onClick={() => open3d('almacen')}>
          <Box /> Ver almacén en 3D
        </Button>
      </div>
      {selectedSlot && <FilaDetalle />}
    </div>
  )
}

/** Los niveles de la fila tocada en el plano: qué hay en cada uno y qué se puede hacer. */
function FilaDetalle() {
  const racks = useInventory((s) => s.racks)
  const pallets = useInventory((s) => s.pallets)
  const products = useInventory((s) => s.products)
  const placePallet = useInventory((s) => s.placePallet)
  const unplacePallet = useInventory((s) => s.unplacePallet)
  const zones = useZones()
  const selectedSlot = useUi((s) => s.selectedSlot)!
  const selectSlot = useUi((s) => s.selectSlot)
  const placingId = useUi((s) => s.placingId)
  const setPlacing = useUi((s) => s.setPlacing)
  const openMas = useUi((s) => s.openMas)
  const loadBuilder = useBuilder((s) => s.load)
  const isAdmin = useAuth((s) => s.user?.role) === 'admin'

  const rack = racks.find((r) => r.id === selectedSlot.rackId)
  if (!rack) return null
  const placing = pallets.find((p) => p.id === placingId) ?? null
  const levels = Array.from({ length: rack.levels }, (_, i) => rack.levels - i) // de arriba hacia abajo

  async function place(level: number) {
    if (!placing) return
    const loc = { rackId: rack!.id, level, pos: selectedSlot.pos }
    const res = await placePallet(placing.id, loc)
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    toast.success(`${placing.pal} ubicado en ${locCode(rack, loc)}.`)
    setPlacing(null)
    selectSlot(loc)
  }

  return (
    <section className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-3" aria-label="Detalle de la fila">
      <div className="flex items-center justify-between gap-2">
        <p className="font-bold">
          Rack {rack.name} · Fila {String(selectedSlot.pos).padStart(3, '0')}
        </p>
        <Button variant="ghost" size="sm" onClick={() => selectSlot(null)}>
          Cerrar
        </Button>
      </div>
      {placing && <p className="text-xs text-muted-foreground">Ubicando {placing.pal}: elegí un nivel libre.</p>}
      <ul className="flex flex-col gap-1.5">
        {levels.map((level) => {
          const loc = { rackId: rack.id, level, pos: selectedSlot.pos }
          const occ = palletAt(pallets, loc)
          const product = occ ? productById(products, occ.productId) : null
          const selected = sameLoc(selectedSlot, loc)
          let allowed = true
          if (placing && !occ) {
            const others = pallets.filter((p) => p.id !== placing.id && p.loc?.rackId === rack.id).map((p) => zones.categoryOf(p.productId))
            allowed = canPlace(zones.categoryOf(placing.productId), rack, others, zones.names).ok
          }
          return (
            <li key={level}>
              <div
                className={cn(
                  'flex flex-col gap-2 rounded-xl border p-2.5',
                  selected ? 'border-primary bg-primary/5' : 'border-border',
                )}
              >
                <button type="button" onClick={() => selectSlot(loc)} className="flex items-center gap-3 text-left focus-visible:outline-none">
                  <span className="w-10 shrink-0 text-sm font-bold tabular-nums">N{level}</span>
                  {occ ? (
                    <span className="flex min-w-0 flex-1 items-center gap-2">
                      <span className="size-3.5 shrink-0 rounded-sm border border-black/20" style={{ background: product?.color }} />
                      <span className="min-w-0 truncate text-sm">
                        <b>{occ.pal}</b> · {product?.name ?? 'Producto eliminado'}
                      </span>
                    </span>
                  ) : (
                    <span className="flex-1 text-sm text-muted-foreground">Libre</span>
                  )}
                </button>

                {selected && occ && (
                  <div className="flex flex-col gap-2 pl-13">
                    <p className="text-xs text-muted-foreground">
                      {describe(occ, presentationOf(products, occ), product?.unit)}
                      {occ.lote ? ` · Lote ${occ.lote}` : ''}
                      {occ.vence ? ` · Vence ${fmtDate(occ.vence)}` : ''}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => setPlacing(occ.id)}>
                        Mover
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => unplacePallet(occ.id)}>
                        Bajar del rack
                      </Button>
                      {isAdmin && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            loadBuilder(occ)
                            openMas('armar')
                          }}
                        >
                          Recontar
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {placing && !occ && (
                  <Button size="sm" disabled={!allowed} onClick={() => place(level)} className="ml-13 self-start">
                    {allowed ? `Ubicar ${placing.pal} acá` : 'Otra categoría: no se puede'}
                  </Button>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

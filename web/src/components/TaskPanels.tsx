import { ArrowDownToLine, ArrowUpFromLine, CalendarClock, CheckCircle2, PackagePlus, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useInventory, useZones } from '@/store/inventory'
import { useUi } from '@/store/ui'
import { useReception } from '@/store/reception'
import { useIsDesktop } from '@/hooks/useMediaQuery'
import { useStock } from '@/api/features'
import { canPlace } from '@/domain/zones'
import { freeSlots, locCode, occupancy, palletAt, type Loc } from '@/domain/inventory'
import { PlacementGuide } from '@/components/PlacementGuide'
import { ProductFinder } from '@/components/ProductFinder'
import { MapView } from '@/components/MapView'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const fmt = (n: number) => n.toLocaleString('es-BO', { maximumFractionDigits: 1 })
const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

/** En laptop el plano ya ocupa el área grande; en teléfono va dentro de la sección. */
function InlineMap() {
  const isDesktop = useIsDesktop()
  return isDesktop ? null : <MapView />
}

/* ------------------------------------------------------------------ */
/* Almacén (inicio)                                                    */
/* ------------------------------------------------------------------ */

/** Inicio: lo pendiente, accesos grandes a cada tarea y el plano. */
export function AlmacenPanel() {
  const pallets = useInventory((s) => s.pallets)
  const racks = useInventory((s) => s.racks)
  const setTab = useUi((s) => s.setTab)
  const { data: stock } = useStock()

  const unplaced = pallets.filter((p) => !p.loc).length
  const expiring = stock?.expiring.filter((e) => e.daysLeft <= 15).length ?? 0
  const { cap, used } = occupancy(racks, pallets)

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-3">
        <TaskButton icon={PackagePlus} label="Recibir" hint="Llegó mercadería" onClick={() => setTab('recibir')} />
        <TaskButton
          icon={ArrowDownToLine}
          label="Guardar"
          hint={unplaced ? `${unplaced} ${unplaced === 1 ? 'pallet' : 'pallets'} sin ubicar` : 'Nada pendiente'}
          alert={unplaced > 0}
          onClick={() => setTab('guardar')}
        />
        <TaskButton icon={ArrowUpFromLine} label="Retirar" hint="Buscar y sacar productos" onClick={() => setTab('retirar')} />
        <TaskButton
          icon={CalendarClock}
          label="Por vencer"
          hint={expiring ? `${expiring} en 15 días o menos` : 'Nada por vencer'}
          alert={expiring > 0}
          onClick={() => setTab('retirar')}
        />
      </div>

      <PlacingBanner />

      <p className="text-xs text-muted-foreground">
        {used} de {cap} posiciones ocupadas. Tocá una fila del plano para ver qué tiene.
      </p>
      <InlineMap />
    </div>
  )
}

function TaskButton({
  icon: Icon,
  label,
  hint,
  alert = false,
  onClick,
}: {
  icon: typeof PackagePlus
  label: string
  hint: string
  alert?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex min-h-24 flex-col items-start justify-between gap-2 rounded-2xl border p-3 text-left transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        alert ? 'border-[#f59e0b] bg-[#f59e0b]/10' : 'border-border bg-card',
      )}
    >
      <Icon className={cn('size-6', alert ? 'text-[#f59e0b]' : 'text-primary')} aria-hidden />
      <span>
        <span className="block text-base font-bold">{label}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
    </button>
  )
}

/** Mover o ubicar un pallet a mano: elegir la posición en una lista (alternativa al plano). */
function PlacingBanner() {
  const racks = useInventory((s) => s.racks)
  const pallets = useInventory((s) => s.pallets)
  const placePallet = useInventory((s) => s.placePallet)
  const zones = useZones()
  const placingId = useUi((s) => s.placingId)
  const setPlacing = useUi((s) => s.setPlacing)
  const selectedSlot = useUi((s) => s.selectedSlot)
  const selectSlot = useUi((s) => s.selectSlot)

  const placing = pallets.find((p) => p.id === placingId) ?? null
  if (!placing) return null

  // Solo las posiciones libres donde ese pallet no se mezcla con otra categoría.
  const free = freeSlots(racks, pallets).filter((loc) => {
    const rack = racks.find((r) => r.id === loc.rackId)
    if (!rack) return false
    const others = pallets.filter((p) => p.id !== placing.id && p.loc?.rackId === rack.id).map((p) => zones.categoryOf(p.productId))
    return canPlace(zones.categoryOf(placing.productId), rack, others, zones.names).ok
  })
  const target = selectedSlot && !palletAt(pallets, selectedSlot) ? selectedSlot : null

  async function place(loc: Loc) {
    const res = await placePallet(placing!.id, loc)
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    toast.success(`${placing!.pal} ubicado en ${locCode(racks.find((r) => r.id === loc.rackId), loc)}.`)
    setPlacing(null)
    selectSlot({ ...loc })
  }

  return (
    <div className="flex flex-col gap-2.5 rounded-2xl border border-primary bg-primary/5 p-3">
      <strong>
        {placing.loc ? `Mover ${placing.pal} desde ${locCode(racks.find((r) => r.id === placing.loc!.rackId), placing.loc)}` : `Ubicar ${placing.pal}`}
      </strong>
      <select
        value={target ? `${target.rackId}|${target.level}|${target.pos}` : ''}
        disabled={!free.length}
        onChange={(e) => {
          const [rackId, level, pos] = e.target.value.split('|').map(Number)
          selectSlot({ rackId, level, pos })
        }}
        aria-label="Posición de destino"
        className="h-11 w-full rounded-xl border border-border bg-card px-2.5 outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
      >
        <option value="" disabled>
          {free.length ? 'Elegí la posición (o tocala en el plano)' : 'No hay posiciones libres para su categoría'}
        </option>
        {free.map((loc) => (
          <option key={`${loc.rackId}|${loc.level}|${loc.pos}`} value={`${loc.rackId}|${loc.level}|${loc.pos}`}>
            {locCode(racks.find((r) => r.id === loc.rackId), loc)}
          </option>
        ))}
      </select>
      <div className="flex gap-2">
        <Button className="flex-1" disabled={!target} onClick={() => target && place(target)}>
          Ubicar aquí
        </Button>
        <Button variant="outline" onClick={() => setPlacing(null)}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Guardar                                                             */
/* ------------------------------------------------------------------ */

/** Llevar los pallets sin ubicar a su lugar: sugerencia por zona, ruta y escaneo. */
export function GuardarPanel() {
  const pallets = useInventory((s) => s.pallets)
  const confirmed = useReception((s) => s.confirmed)
  const reset = useReception((s) => s.reset)
  const setTab = useUi((s) => s.setTab)
  const unplaced = pallets.filter((p) => !p.loc)

  return (
    <div className="flex flex-col gap-4">
      {confirmed && (
        <div className="flex items-start gap-3 rounded-2xl border border-[color:var(--ok,#1b7f47)]/50 bg-[color:var(--ok,#1b7f47)]/10 p-3">
          <CheckCircle2 className="mt-0.5 size-6 shrink-0 text-[color:var(--ok,#1b7f47)]" aria-hidden />
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-bold">Recepción {confirmed.code} confirmada</p>
            <p className="text-muted-foreground">
              {fmtDateTime(confirmed.receivedAt)} · {confirmed.pallets.length} pallets ·{' '}
              {confirmed.lines.map((l) => `${l.productName} ${fmt(l.quantity)} ${l.unit}`).join(' · ')}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              reset()
              setTab('recibir')
            }}
          >
            <Plus /> Nueva
          </Button>
        </div>
      )}

      {unplaced.length ? (
        <PlacementGuide palletIds={unplaced.map((p) => p.id)} showMap={false} />
      ) : (
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-secondary p-4 text-sm">
          <CheckCircle2 className="size-6 shrink-0 text-[color:var(--ok,#1b7f47)]" aria-hidden />
          <p>No hay pallets para guardar: todo está en su lugar.</p>
        </div>
      )}
      <InlineMap />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Retirar                                                             */
/* ------------------------------------------------------------------ */

/** Buscar uno o varios productos y la ruta más corta para retirarlos. */
export function RetirarPanel() {
  return (
    <div className="flex flex-col gap-4">
      <ProductFinder />
      <InlineMap />
    </div>
  )
}

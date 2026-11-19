import { useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, ChevronDown, MapPin, Route as RouteIcon } from 'lucide-react'
import { toast } from 'sonner'
import { useInventory } from '@/store/inventory'
import { useUi } from '@/store/ui'
import { totals } from '@/domain/pallet'
import { locCode, productById, sameLoc, type Loc, type Pallet } from '@/domain/inventory'
import { buildPlan, describeLeg, planRoute, type Route } from '@/domain/warehousePlan'
import { planPlacement, suggestSlots, type SlotSuggestion } from '@/domain/slotting'
import { Button } from '@/components/ui/button'
import { WarehouseMap } from '@/components/WarehouseMap'
import { cn } from '@/lib/utils'

const fmt = (n: number) => n.toLocaleString('es-BO', { maximumFractionDigits: 1 })

interface Props {
  /** Pallets a llevar a su lugar (los que ya estén ubicados se ignoran). */
  palletIds: number[]
  /** Dibuja su propio plano (false cuando la pantalla ya muestra uno). */
  showMap?: boolean
}

/**
 * Le dice al trabajador dónde dejar cada pallet (mermados abajo, completos arriba,
 * el mismo producto junto y lo más cerca posible del ingreso), lo guía con un mapa y
 * un recorrido, y registra la ubicación cuando la confirma.
 */
export function PlacementGuide({ palletIds, showMap = true }: Props) {
  const racks = useInventory((s) => s.racks)
  const pallets = useInventory((s) => s.pallets)
  const products = useInventory((s) => s.products)
  const placePallet = useInventory((s) => s.placePallet)
  const guideLocs = useUi((s) => s.guideLocs)
  const route = useUi((s) => s.route)
  const setGuide = useUi((s) => s.setGuide)
  const clearGuide = useUi((s) => s.clearGuide)
  const selectSlot = useUi((s) => s.selectSlot)

  const [override, setOverride] = useState<Record<number, Loc>>({})
  const [open, setOpen] = useState<number | null>(null)
  const [activeId, setActiveId] = useState<number | 'all' | null>(null)
  const [busy, setBusy] = useState(false)

  const plan = useMemo(() => buildPlan(racks), [racks])
  const targets = useMemo(() => pallets.filter((p) => palletIds.includes(p.id) && !p.loc), [pallets, palletIds])

  const itemOf = (p: Pallet) => ({
    key: p.id,
    kind: p.kind,
    productId: p.productId,
    productName: productById(products, p.productId)?.name,
  })

  // Sugerencia conjunta: los completos arriba, los mermados abajo y sin repetir posición.
  const base = useMemo(
    () => planPlacement(targets.map(itemOf), racks, pallets, plan),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [targets, racks, pallets, plan, products],
  )

  const rows = targets.map((p) => {
    const b = base.find((x) => x.key === p.id)?.suggestion ?? null
    const chosen = override[p.id]
    const loc = chosen ?? b?.loc ?? null
    return { pallet: p, loc, suggestion: b, code: loc ? locCode(racks.find((r) => r.id === loc.rackId), loc) : null }
  })

  const unplaceable = rows.filter((r) => !r.loc).length

  // Si cambian los pallets a ubicar, se limpia la guía que ya no corresponde.
  // Solo se borra la guía que dibujó este componente (no la del buscador).
  const owns = useRef(false)
  useEffect(() => {
    owns.current = activeId != null
  }, [activeId])
  useEffect(() => {
    if (!targets.length && owns.current) clearGuide()
  }, [targets.length, guideLocs.length, route, clearGuide])

  // Al salir de la pantalla no queda la guía dibujada.
  useEffect(
    () => () => {
      if (owns.current) clearGuide()
    },
    [clearGuide],
  )

  function alternatives(p: Pallet): SlotSuggestion[] {
    const others = rows.filter((r) => r.pallet.id !== p.id && r.loc).map((r) => ({ loc: r.loc!, productId: r.pallet.productId }))
    return suggestSlots(itemOf(p), racks, pallets, plan, 5, others)
  }

  function guideOne(p: Pallet, loc: Loc) {
    const r = planRoute(plan, [{ loc, label: p.pal }], false)
    setActiveId(p.id)
    setGuide([loc], r)
    selectSlot(loc)
  }

  function guideAll() {
    const stops = rows.filter((r) => r.loc).map((r) => ({ loc: r.loc!, label: r.pallet.pal }))
    const r = planRoute(plan, stops, true)
    setActiveId('all')
    setGuide(stops.map((s) => s.loc), r)
  }

  async function confirm(p: Pallet, loc: Loc) {
    setBusy(true)
    const res = await placePallet(p.id, loc)
    setBusy(false)
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    toast.success(`${p.pal} ubicado en ${locCode(racks.find((r) => r.id === loc.rackId), loc)}.`)
    if (activeId === p.id) {
      setActiveId(null)
      clearGuide()
    }
    setOverride((o) => {
      const { [p.id]: _gone, ...rest } = o
      return rest
    })
  }

  async function confirmAll() {
    setBusy(true)
    let done = 0
    for (const r of rows) {
      if (!r.loc) continue
      const res = await placePallet(r.pallet.id, r.loc)
      if (!res.ok) {
        toast.error(`${r.pallet.pal}: ${res.error}`)
        break
      }
      done++
    }
    setBusy(false)
    clearGuide()
    setActiveId(null)
    if (done) toast.success(done === 1 ? 'Pallet ubicado.' : `${done} pallets ubicados.`)
  }

  if (!targets.length) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-secondary p-4 text-sm">
        <CheckCircle2 className="size-6 shrink-0 text-[color:var(--ok,#1b7f47)]" aria-hidden />
        <p>Todos los pallets están ubicados en su lugar.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {showMap && <WarehouseMap racks={racks} pallets={pallets} products={products} guideLocs={guideLocs} route={route} selected={null} />}

      {unplaceable > 0 && (
        <p className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm" role="alert">
          No hay posiciones libres para {unplaceable} {unplaceable === 1 ? 'pallet' : 'pallets'}. Agregá racks o liberá lugar en el Almacén.
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {rows.map(({ pallet: p, loc, suggestion, code }) => {
          const product = productById(products, p.productId)
          const boxes = totals(p).boxes
          const active = activeId === p.id
          const alts = open === p.id ? alternatives(p) : []
          const meters = suggestion && loc && sameLoc(suggestion.loc, loc) ? suggestion.meters : null
          return (
            <li key={p.id} className={cn('flex flex-col gap-3 rounded-2xl border bg-card p-3', active ? 'border-primary' : 'border-border')}>
              <div className="flex items-center gap-3">
                <span className="size-4 shrink-0 rounded border border-border" style={{ background: product?.color }} />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-x-2">
                    <span className="font-semibold tabular-nums">{p.pal}</span>
                    <span
                      className={cn(
                        'rounded-md px-1.5 text-[11px] font-semibold uppercase',
                        p.kind === 'completo' ? 'bg-primary/15 text-primary' : 'bg-loose/15 text-loose',
                      )}
                    >
                      {p.kind === 'completo' ? 'Completo' : 'Mermado'}
                    </span>
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {product?.name ?? 'Producto'} · {boxes} cajas
                  </p>
                </div>
              </div>

              {loc && code ? (
                <div className="rounded-xl bg-secondary p-3">
                  <p className="text-xs font-medium text-muted-foreground">Dejarlo en</p>
                  <p className="text-3xl leading-tight font-bold tabular-nums">{code}</p>
                  {suggestion && sameLoc(suggestion.loc, loc) ? (
                    <ul className="mt-1 list-disc pl-4 text-xs text-muted-foreground">
                      {suggestion.reasons.slice(0, 3).map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                      {meters != null && Number.isFinite(meters) && <li>A {fmt(meters)} m del ingreso</li>}
                    </ul>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">Elegida por vos.</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-destructive">Sin posición libre disponible.</p>
              )}

              {active && route && route.legs[0] && <RouteSteps plan={plan} route={route} racks={racks} loc={loc} />}

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" disabled={!loc} onClick={() => (active ? (setActiveId(null), clearGuide()) : loc && guideOne(p, loc))}>
                  <MapPin /> {active ? 'Ocultar guía' : 'Guiarme'}
                </Button>
                <Button disabled={!loc || busy} onClick={() => loc && confirm(p, loc)}>
                  <CheckCircle2 /> Ya lo dejé aquí
                </Button>
                <Button variant="ghost" onClick={() => setOpen(open === p.id ? null : p.id)} aria-expanded={open === p.id}>
                  Otra posición <ChevronDown className={cn('transition-transform', open === p.id && 'rotate-180')} />
                </Button>
              </div>

              {open === p.id && (
                <ul className="flex flex-wrap gap-2">
                  {alts.map((a) => (
                    <li key={a.code}>
                      <button
                        type="button"
                        onClick={() => {
                          setOverride((o) => ({ ...o, [p.id]: a.loc }))
                          setOpen(null)
                          if (active) guideOne(p, a.loc)
                        }}
                        className={cn(
                          'min-h-11 rounded-xl border px-3 text-sm font-semibold tabular-nums transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          loc && sameLoc(a.loc, loc) ? 'border-primary bg-primary/10' : 'border-border',
                        )}
                      >
                        {a.code}
                      </button>
                    </li>
                  ))}
                  {alts.length === 0 && <li className="text-sm text-muted-foreground">No hay otras posiciones libres.</li>}
                </ul>
              )}
            </li>
          )
        })}
      </ul>

      {rows.length > 1 && (
        <div className="flex flex-col gap-3 rounded-2xl border border-border p-3">
          <p className="text-sm font-semibold">Todos los pallets ({rows.length})</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={guideAll} disabled={unplaceable === rows.length}>
              <RouteIcon /> Ver recorrido de todos
            </Button>
            <Button onClick={confirmAll} disabled={busy || unplaceable === rows.length}>
              <CheckCircle2 /> Ubicar todos según lo sugerido
            </Button>
          </div>
          {activeId === 'all' && route && (
            <ol className="list-decimal pl-5 text-sm">
              {route.stops.map((s, i) => (
                <li key={i} className="py-0.5">
                  <span className="font-semibold">{s.label}</span> → {locCode(racks.find((r) => r.id === s.loc.rackId), s.loc)}
                </li>
              ))}
              <li className="list-none py-0.5 text-muted-foreground">Recorrido: {fmt(route.meters)} m en total.</li>
            </ol>
          )}
        </div>
      )}
    </div>
  )
}

/** Indicaciones en palabras para llegar a la posición. */
function RouteSteps({ plan, route, racks, loc }: { plan: ReturnType<typeof buildPlan>; route: Route; racks: { id: number; name: string }[]; loc: Loc | null }) {
  const leg = route.legs[0]
  if (!leg || !loc) return null
  const rack = racks.find((r) => r.id === loc.rackId)
  const steps = [
    ...describeLeg(plan, leg),
    `Frená en la fila ${String(loc.pos).padStart(3, '0')} del rack ${rack?.name ?? '?'}.`,
    `Dejá el pallet en el nivel ${loc.level}.`,
  ]
  return (
    <div className="rounded-xl border border-primary/40 bg-primary/5 p-3">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">Cómo llegar · {fmt(leg.meters)} m</p>
      <ol className="list-decimal pl-5 text-sm">
        {steps.map((s, i) => (
          <li key={i} className="py-0.5">
            {s}
          </li>
        ))}
      </ol>
    </div>
  )
}

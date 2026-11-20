import { useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, ChevronDown, MapPin, Printer, Route as RouteIcon } from 'lucide-react'
import { toast } from 'sonner'
import { useInventory, useZones } from '@/store/inventory'
import { useUi } from '@/store/ui'
import { totals } from '@/domain/pallet'
import { locCode, parseLocCode, productById, sameLoc, type Loc, type Pallet } from '@/domain/inventory'
import { verifyScan } from '@/domain/scan'
import { buildPlan, describeLeg, planRoute, type Route } from '@/domain/warehousePlan'
import { planPlacement, suggestSlots, type SlotSuggestion } from '@/domain/slotting'
import { Button } from '@/components/ui/button'
import { usePrintLabels } from '@/components/LabelSheet'
import { ScanInput } from '@/components/ScanInput'
import { WarehouseMap } from '@/components/WarehouseMap'
import { cn } from '@/lib/utils'

const fmt = (n: number) => n.toLocaleString('es-BO', { maximumFractionDigits: 1 })

/** Resultado del último escaneo, para mostrarlo grande y claro. */
type Feedback =
  | { kind: 'info'; message: string }
  | { kind: 'ok'; message: string }
  | { kind: 'error'; message: string }
  | { kind: 'other'; message: string; palletId: number; loc: Loc }

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
  const zones = useZones()
  const labelPrinter = usePrintLabels()
  const guideLocs = useUi((s) => s.guideLocs)
  const route = useUi((s) => s.route)
  const setGuide = useUi((s) => s.setGuide)
  const clearGuide = useUi((s) => s.clearGuide)
  const selectSlot = useUi((s) => s.selectSlot)

  const [override, setOverride] = useState<Record<number, Loc>>({})
  const [open, setOpen] = useState<number | null>(null)
  const [activeId, setActiveId] = useState<number | 'all' | null>(null)
  const [busy, setBusy] = useState(false)
  // Escaneo: el pallet que el operador tiene en la mano y el resultado del último escaneo.
  const [inHand, setInHand] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<Feedback | null>(null)

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
    () => planPlacement(targets.map(itemOf), racks, pallets, plan, zones),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [targets, racks, pallets, plan, products, zones],
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
    return suggestSlots(itemOf(p), racks, pallets, plan, 5, others, zones)
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

  /** Lee una etiqueta: de pallet (lo toma en mano) o de rack (verifica que sea el lugar correcto). */
  function handleScan(raw: string) {
    const text = raw.trim().toUpperCase()
    const fail = (message: string) => {
      navigator.vibrate?.([80, 60, 80])
      setFeedback({ kind: 'error', message })
    }

    const scannedPallet = targets.find((p) => p.pal.toUpperCase() === text)
    if (scannedPallet) {
      setInHand(scannedPallet.id)
      setFeedback({ kind: 'info', message: `${scannedPallet.pal} en mano. Ahora escaneá la etiqueta del rack donde lo vas a dejar.` })
      return
    }
    if (/^PAL-[0-9]+$/.test(text)) {
      fail(`${text} ya está ubicado o no es de esta lista.`)
      return
    }

    // ¿De qué pallet se trata? El que está en mano, el único pendiente, o el único cuyo lugar sugerido es ese rack.
    const loc = parseLocCode(text, racks)
    let pallet = targets.find((p) => p.id === inHand) ?? (targets.length === 1 ? targets[0] : null)
    if (!pallet && loc) {
      const byLoc = rows.filter((r) => r.loc && sameLoc(r.loc, loc))
      if (byLoc.length === 1) pallet = byLoc[0].pallet
    }
    if (!pallet) {
      fail(loc ? 'Primero escaneá la etiqueta del pallet (PAL-…) que tenés en la mano.' : `No reconozco “${raw.trim()}” como una etiqueta de pallet ni de rack.`)
      return
    }

    const expected = rows.find((r) => r.pallet.id === pallet.id)?.loc ?? null
    const v = verifyScan(text, expected, pallet, racks, pallets, zones)
    if (v.kind === 'unknown') {
      fail(`No reconozco “${v.text}” como una posición del almacén.`)
    } else if (v.kind === 'blocked') {
      fail(v.reason)
    } else if (v.kind === 'ok') {
      navigator.vibrate?.(60)
      setFeedback({ kind: 'ok', message: `Correcto: ${pallet.pal} va en ${v.code}.` })
      setInHand(null)
      void confirm(pallet, v.loc)
    } else {
      navigator.vibrate?.([80, 60, 80])
      setFeedback({
        kind: 'other',
        palletId: pallet.id,
        loc: v.loc,
        message: `Ese es ${v.code}${v.expected ? ` y el sistema te indicó ${v.expected}` : ''}. Se puede dejar ahí, pero no es el lugar sugerido.`,
      })
    }
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

      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={() =>
            labelPrinter.print(
              targets.map((p) => {
                const product = productById(products, p.productId)
                return {
                  code: p.pal,
                  title: product?.name ?? 'Producto',
                  lines: [`${totals(p).boxes} cajas · ${p.kind === 'completo' ? 'Completo' : 'Mermado'}`, ...(p.lote ? [`Lote ${p.lote}`] : []), ...(p.vence ? [`Vence ${p.vence.split('-').reverse().join('/')}`] : [])],
                  color: product?.color,
                }
              }),
            )
          }
        >
          <Printer /> Imprimir etiquetas de pallets
        </Button>
      </div>
      {labelPrinter.sheet}

      <section className="flex flex-col gap-2 rounded-2xl border border-border p-3">
        <p className="text-sm font-semibold">Confirmar con escáner</p>
        <p className="text-xs text-muted-foreground">
          {targets.length > 1 ? 'Escaneá la etiqueta del pallet y después la del rack. ' : 'Escaneá la etiqueta del rack donde lo dejás. '}
          Con la pistola, tocá el campo y disparala; con el teléfono, usá la cámara.
        </p>
        <ScanInput onScan={handleScan} />
        {feedback && (
          <div
            role={feedback.kind === 'error' ? 'alert' : 'status'}
            className={cn(
              'flex flex-col gap-2 rounded-xl border p-3 text-sm font-medium',
              feedback.kind === 'ok' && 'border-[color:var(--ok,#1b7f47)] bg-[color:var(--ok,#1b7f47)]/15',
              feedback.kind === 'error' && 'border-destructive bg-destructive/15',
              feedback.kind === 'other' && 'border-[#f59e0b] bg-[#f59e0b]/15',
              feedback.kind === 'info' && 'border-primary/40 bg-primary/10',
            )}
          >
            <p>
              {feedback.kind === 'ok' && '✓ '}
              {feedback.kind === 'error' && '✗ '}
              {feedback.message}
            </p>
            {feedback.kind === 'other' && (
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={busy}
                  onClick={() => {
                    const p = targets.find((t) => t.id === feedback.palletId)
                    if (p) void confirm(p, feedback.loc)
                    setFeedback(null)
                    setInHand(null)
                  }}
                >
                  <CheckCircle2 /> Ubicar acá igual
                </Button>
                <Button variant="outline" onClick={() => setFeedback(null)}>
                  Cancelar
                </Button>
              </div>
            )}
          </div>
        )}
      </section>

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
            <li key={p.id} className={cn('flex flex-col gap-3 rounded-2xl border bg-card p-3', active || inHand === p.id ? 'border-primary' : 'border-border', inHand === p.id && 'ring-2 ring-primary')}>
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
                    {inHand === p.id && <span className="rounded-md bg-primary px-1.5 text-[11px] font-semibold uppercase text-primary-foreground">En mano</span>}
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

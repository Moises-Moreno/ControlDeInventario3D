import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigation, Search, X } from 'lucide-react'
import { useInventory } from '@/store/inventory'
import { useUi } from '@/store/ui'
import { totals } from '@/domain/pallet'
import { locCode, type Pallet, type Product, type Rack } from '@/domain/inventory'
import { buildPlan, describeLeg, planRoute } from '@/domain/warehousePlan'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const fmt = (n: number) => n.toLocaleString('es-BO', { maximumFractionDigits: 1 })
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const fmtDate = (iso: string) => iso.split('-').reverse().join('/')

/** Orden de retiro: primero lo que vence antes, después los mermados (para vaciarlos). */
function pickOrder(a: Pallet, b: Pallet): number {
  if (a.vence && b.vence && a.vence !== b.vence) return a.vence < b.vence ? -1 : 1
  if (a.vence && !b.vence) return -1
  if (!a.vence && b.vence) return 1
  if (a.kind !== b.kind) return a.kind === 'mermado' ? -1 : 1
  return a.id - b.id
}

/**
 * Buscador del almacén: elegís uno o varios productos y arma la ruta más corta desde
 * el ingreso que pasa por sus pallets, con las paradas en orden.
 */
export function ProductFinder() {
  const products = useInventory((s) => s.products)
  const pallets = useInventory((s) => s.pallets)
  const racks = useInventory((s) => s.racks)
  const setGuide = useUi((s) => s.setGuide)
  const clearGuide = useUi((s) => s.clearGuide)

  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<number[]>([])
  const [excluded, setExcluded] = useState<number[]>([])
  const [guiding, setGuiding] = useState(false)

  const plan = useMemo(() => buildPlan(racks), [racks])
  const located = useMemo(() => pallets.filter((p) => p.loc), [pallets])

  // Resultados: por código o nombre del producto, o por pallet/lote (devuelve su producto).
  const results = useMemo(() => {
    const q = norm(query.trim())
    if (!q) return []
    const byPallet = new Set(pallets.filter((p) => norm(p.pal).includes(q) || norm(p.lote).includes(q)).map((p) => p.productId))
    return products.filter((p) => p.active).filter((p) => norm(p.code).includes(q) || norm(p.name).includes(q) || byPallet.has(p.id)).slice(0, 8)
  }, [query, products, pallets])

  const groups = selected.map((id) => {
    const product = products.find((p) => p.id === id)!
    const list = located.filter((p) => p.productId === id).sort(pickOrder)
    const unplaced = pallets.filter((p) => p.productId === id && !p.loc).length
    return { product, list, unplaced }
  })

  const stops = groups.flatMap(({ product, list }) =>
    list
      .filter((p) => !excluded.includes(p.id))
      .map((p) => ({ loc: p.loc!, label: `${product.name} · ${p.pal} · ${totals(p).boxes} cajas`, pallet: p, product })),
  )

  const route = useMemo(
    () => (stops.length ? planRoute(plan, stops.map((s) => ({ loc: s.loc, label: s.label })), true) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [plan, stops.map((s) => s.pallet.id).join(',')],
  )

  // Mientras se guía, el plano y el 3D siguen la selección.
  const owns = useRef(false)
  useEffect(() => {
    if (guiding && route) {
      setGuide(route.stops.map((s) => s.loc), route)
      owns.current = true
    } else if (owns.current) {
      clearGuide()
      owns.current = false
    }
  }, [guiding, route, setGuide, clearGuide])
  useEffect(
    () => () => {
      if (owns.current) clearGuide()
    },
    [clearGuide],
  )

  function toggleProduct(id: number) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
    setQuery('')
  }

  function reset() {
    setSelected([])
    setExcluded([])
    setGuiding(false)
    setQuery('')
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Buscar y retirar productos</h2>

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Producto, código, lote o pallet…"
          aria-label="Buscar producto"
          className="h-12 w-full rounded-xl border border-border bg-secondary pr-3 pl-10 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {results.length > 0 && (
          <ul className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
            {results.map((p) => {
              const count = located.filter((x) => x.productId === p.id).length
              const on = selected.includes(p.id)
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => toggleProduct(p.id)}
                    className="flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left hover:bg-secondary focus-visible:bg-secondary focus-visible:outline-none"
                  >
                    <span className="size-4 shrink-0 rounded border border-border" style={{ background: p.color }} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{p.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {p.code} · {count ? `${count} ${count === 1 ? 'pallet ubicado' : 'pallets ubicados'}` : 'sin pallets ubicados'}
                      </span>
                    </span>
                    <span className="text-xs font-semibold text-primary">{on ? 'Quitar' : 'Agregar'}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        {query.trim() && results.length === 0 && (
          <p className="mt-1 text-xs text-muted-foreground">No hay productos que coincidan con “{query.trim()}”.</p>
        )}
      </div>

      {groups.length === 0 ? (
        <p className="text-xs text-muted-foreground">Buscá uno o varios productos y te marco la ruta más corta para retirarlos.</p>
      ) : (
        <>
          {groups.map(({ product, list, unplaced }) => (
            <ProductGroup
              key={product.id}
              product={product}
              list={list}
              unplaced={unplaced}
              racks={racks}
              excluded={excluded}
              onToggle={(id) => setExcluded((e) => (e.includes(id) ? e.filter((x) => x !== id) : [...e, id]))}
              onRemove={() => toggleProduct(product.id)}
            />
          ))}

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setGuiding((g) => !g)} disabled={!stops.length}>
              <Navigation /> {guiding ? 'Ocultar ruta' : `Guiarme (${stops.length} ${stops.length === 1 ? 'parada' : 'paradas'})`}
            </Button>
            <Button variant="outline" onClick={reset}>
              <X /> Limpiar
            </Button>
          </div>

          {guiding && route && (
            <div className="flex flex-col gap-2 rounded-2xl border border-primary/40 bg-primary/5 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                Ruta más corta · {fmt(route.meters)} m · ida y vuelta al ingreso
              </p>
              <ol className="flex flex-col gap-2">
                {route.stops.map((stop, i) => {
                  const s = stops.find((x) => x.loc === stop.loc)!
                  const rack = racks.find((r) => r.id === stop.loc.rackId)
                  return (
                    <li key={i} className="flex gap-3">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#f59e0b] text-sm font-bold text-[#1f2937]">
                        {i + 1}
                      </span>
                      <div className="min-w-0 text-sm">
                        <p className="text-lg leading-tight font-bold tabular-nums">{locCode(rack, stop.loc)}</p>
                        <p>{s.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {describeLeg(plan, route.legs[i]).join(' ')} Nivel {stop.loc.level}.
                        </p>
                      </div>
                    </li>
                  )
                })}
                <li className="pl-10 text-xs text-muted-foreground">{describeLeg(plan, route.legs[route.legs.length - 1]).join(' ')}</li>
              </ol>
            </div>
          )}
        </>
      )}
    </section>
  )
}

function ProductGroup({
  product,
  list,
  unplaced,
  racks,
  excluded,
  onToggle,
  onRemove,
}: {
  product: Product
  list: Pallet[]
  unplaced: number
  racks: Rack[]
  excluded: number[]
  onToggle: (id: number) => void
  onRemove: () => void
}) {
  const boxes = list.filter((p) => !excluded.includes(p.id)).reduce((s, p) => s + totals(p).boxes, 0)
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border p-3">
      <div className="flex items-center gap-2">
        <span className="size-4 shrink-0 rounded border border-border" style={{ background: product.color }} />
        <p className="min-w-0 flex-1 truncate font-semibold">
          {product.name} <span className="text-xs font-normal text-muted-foreground">· {boxes} cajas elegidas</span>
        </p>
        <Button variant="ghost" size="icon" aria-label={`Quitar ${product.name} de la búsqueda`} onClick={onRemove}>
          <X />
        </Button>
      </div>
      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">No tiene pallets ubicados en el almacén.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {list.map((p) => {
            const on = !excluded.includes(p.id)
            return (
              <li key={p.id}>
                <label className={cn('flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-2', on ? 'bg-secondary' : 'opacity-60')}>
                  <input type="checkbox" checked={on} onChange={() => onToggle(p.id)} className="size-5 accent-[var(--primary)]" />
                  <span className="w-24 shrink-0 font-semibold tabular-nums">{locCode(racks.find((r) => r.id === p.loc!.rackId), p.loc!)}</span>
                  <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                    {p.pal} · {totals(p).boxes} cajas · {p.kind}
                    {p.vence ? ` · vence ${fmtDate(p.vence)}` : ''}
                  </span>
                </label>
              </li>
            )
          })}
        </ul>
      )}
      {unplaced > 0 && (
        <p className="text-xs text-muted-foreground">
          {unplaced} {unplaced === 1 ? 'pallet está' : 'pallets están'} sin ubicar (no entran en la ruta).
        </p>
      )}
    </div>
  )
}

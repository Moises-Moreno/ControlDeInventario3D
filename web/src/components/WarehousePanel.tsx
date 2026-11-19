import { useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { useInventory } from '@/store/inventory'
import { useUi } from '@/store/ui'
import { useBuilder } from '@/store/builder'
import { useAuth } from '@/store/auth'
import { PlacementGuide } from '@/components/PlacementGuide'
import { WarehouseMap } from '@/components/WarehouseMap'
import {
  freeSlots,
  occupancy,
  palletAt,
  productById,
  locCode,
  describe,
  presentationOf,
  MAX_RACKS,
  MAX_LEVELS,
  MAX_POS,
  type Loc,
  type Rack,
} from '@/domain/inventory'

const fmtDate = (iso: string) => iso.split('-').reverse().join('/')

export function WarehousePanel() {
  const racks = useInventory((s) => s.racks)
  const pallets = useInventory((s) => s.pallets)
  const products = useInventory((s) => s.products)
  const placePallet = useInventory((s) => s.placePallet)
  const unplacePallet = useInventory((s) => s.unplacePallet)
  const addRack = useInventory((s) => s.addRack)
  const deleteRack = useInventory((s) => s.deleteRack)

  const placingId = useUi((s) => s.placingId)
  const setPlacing = useUi((s) => s.setPlacing)
  const selectedSlot = useUi((s) => s.selectedSlot)
  const selectSlot = useUi((s) => s.selectSlot)
  const guideLocs = useUi((s) => s.guideLocs)
  const route = useUi((s) => s.route)
  const setTab = useUi((s) => s.setTab)
  const loadBuilder = useBuilder((s) => s.load)

  const [rackError, setRackError] = useState('')

  const free = freeSlots(racks, pallets)
  const { cap, used } = occupancy(racks, pallets)
  const placing = pallets.find((p) => p.id === placingId) ?? null
  const unplaced = pallets.filter((p) => !p.loc)

  async function place(loc: Loc) {
    if (!placing) return
    const res = await placePallet(placing.id, loc)
    if (res.ok) {
      setPlacing(null)
      selectSlot({ ...loc })
    }
  }

  const selectedRack = selectedSlot ? racks.find((r) => r.id === selectedSlot.rackId) : undefined
  const occ = selectedSlot ? palletAt(pallets, selectedSlot) : null

  return (
    <div className="flex flex-col gap-6">
      {/* Pallet en espera de ubicación */}
      {placing && (
        <div className="flex flex-col gap-2.5 rounded-lg border border-[color:var(--ok,#1b7f47)] bg-secondary p-3">
          <strong>
            {placing.loc ? `Mover ${placing.pal} desde ${locCode(racks.find((r) => r.id === placing.loc!.rackId), placing.loc)}` : `Ubicar ${placing.pal}`}
          </strong>
          <p className="text-xs text-muted-foreground">
            Tocá una posición libre (verde) en la vista 3D, o elegila en esta lista.
          </p>
          <select
            value={selectedSlot && !palletAt(pallets, selectedSlot) ? `${selectedSlot.rackId}|${selectedSlot.level}|${selectedSlot.pos}` : ''}
            disabled={!free.length}
            onChange={(e) => {
              const [rackId, level, pos] = e.target.value.split('|').map(Number)
              selectSlot({ rackId, level, pos })
            }}
            className="h-9 w-full rounded-md border border-border bg-card px-2.5 outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            <option value="" disabled>
              {free.length ? 'Elegí una posición' : 'No hay posiciones libres'}
            </option>
            {free.map((loc) => (
              <option key={`${loc.rackId}|${loc.level}|${loc.pos}`} value={`${loc.rackId}|${loc.level}|${loc.pos}`}>
                {locCode(racks.find((r) => r.id === loc.rackId), loc)}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!selectedSlot || !!palletAt(pallets, selectedSlot)}
              onClick={() => selectedSlot && place(selectedSlot)}
              className="h-9 flex-1 rounded-md bg-primary font-semibold text-primary-foreground hover:brightness-110 disabled:opacity-50"
            >
              Ubicar aquí
            </button>
            <button type="button" onClick={() => setPlacing(null)} className="h-9 rounded-md border border-border bg-card px-3 font-semibold hover:bg-secondary">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Plano del almacén */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Plano del almacén</h2>
        <WarehouseMap
          racks={racks}
          pallets={pallets}
          products={products}
          selected={selectedSlot}
          guideLocs={guideLocs}
          route={route}
          onSelectFila={(rackId, pos) => selectSlot({ rackId, level: 1, pos })}
        />
        <p className="text-xs text-muted-foreground">
          Tocá una fila para ver su primer nivel. Cada fila se identifica como rack-fila-nivel, por ejemplo A-F001-N1.
        </p>
      </section>

      {/* Pallets sin ubicar */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">1 · Pallets sin ubicar ({unplaced.length})</h2>
        {unplaced.length ? (
          <PlacementGuide palletIds={unplaced.map((p) => p.id)} />
        ) : (
          <p className="text-sm text-muted-foreground">
            {pallets.length ? 'Todos los pallets guardados están en el rack.' : 'Aún no hay pallets. Recibí mercadería en Recepción o armalos en la pestaña Armar.'}
          </p>
        )}
      </section>

      {/* Posición seleccionada */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">2 · Posición seleccionada</h2>
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-secondary p-3">
          {!selectedSlot ? (
            <p className="text-sm text-muted-foreground">
              {racks.length ? 'Tocá una posición del rack en la vista 3D para ver qué contiene.' : 'Agregá un rack para empezar a ubicar pallets.'}
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2">
                <span className="text-2xl font-bold tabular-nums">{locCode(selectedRack, selectedSlot)}</span>
                <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase ${occ ? 'text-primary' : 'text-[color:var(--ok,#1b7f47)]'}`}>
                  {occ ? 'Ocupada' : 'Libre'}
                </span>
              </div>
              {occ ? (
                <>
                  <p className="text-sm">
                    <strong>{occ.pal}</strong> · {productById(products, occ.productId)?.name ?? 'Producto eliminado'}
                  </p>
                  <p className="text-sm">{describe(occ, presentationOf(products, occ), productById(products, occ.productId)?.unit)}</p>
                  {(occ.lote || occ.vence) && (
                    <p className="text-xs text-muted-foreground">
                      {occ.lote ? `Lote ${occ.lote}` : ''}
                      {occ.lote && occ.vence ? ' · ' : ''}
                      {occ.vence ? `Vence ${fmtDate(occ.vence)}` : ''}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => { loadBuilder(occ); setTab('armar') }} className="h-8 rounded-md border border-border bg-card px-3 text-sm font-medium hover:bg-secondary">Recontar</button>
                    <button type="button" onClick={() => setPlacing(occ.id)} className="h-8 rounded-md border border-border bg-card px-3 text-sm font-medium hover:bg-secondary">Mover</button>
                    <button type="button" onClick={() => unplacePallet(occ.id)} className="h-8 rounded-md border border-border bg-card px-3 text-sm font-medium hover:bg-secondary">Bajar del rack</button>
                  </div>
                </>
              ) : placing ? (
                <button type="button" onClick={() => place(selectedSlot)} className="h-9 rounded-md bg-primary font-semibold text-primary-foreground hover:brightness-110">
                  Ubicar {placing.pal} aquí
                </button>
              ) : (
                <p className="text-sm text-muted-foreground">Para llenarla, pulsá Ubicar en un pallet sin ubicar o Mover en uno ya ubicado.</p>
              )}
            </>
          )}
        </div>
      </section>

      {/* Racks */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">3 · Racks</h2>
        <ul className="flex flex-col gap-2">
          {racks.map((r) => (
            <RackEditor key={r.id} rack={r} onError={setRackError} onDelete={async () => { const res = await deleteRack(r.id); setRackError(res.ok ? '' : res.error) }} />
          ))}
        </ul>
        {rackError && <p className="text-sm text-destructive" role="alert">{rackError}</p>}
        <button
          type="button"
          disabled={racks.length >= MAX_RACKS}
          onClick={async () => { const res = await addRack(); setRackError(res.ok ? '' : res.error) }}
          className="h-9 self-start rounded-md border border-border bg-card px-3 font-semibold hover:bg-secondary disabled:opacity-50"
        >
          Agregar rack
        </button>
        <p className="text-xs text-muted-foreground">
          Hasta {MAX_RACKS} racks, {MAX_LEVELS} niveles y {MAX_POS} posiciones por nivel. Van de dos en dos, espalda con espalda, con un pasillo entre cada par. La altura de los niveles se ajusta sola al pallet más alto. {used} de {cap} posiciones ocupadas.
        </p>
      </section>
    </div>
  )
}

function RackEditor({ rack, onError, onDelete }: { rack: Rack; onError: (msg: string) => void; onDelete: () => void }) {
  const pallets = useInventory((s) => s.pallets)
  const renameRack = useInventory((s) => s.renameRack)
  const setRackSize = useInventory((s) => s.setRackSize)
  const isAdmin = useAuth((s) => s.user?.role) === 'admin'
  const [name, setName] = useState(rack.name)

  const inRack = pallets.filter((p) => p.loc && p.loc.rackId === rack.id)

  return (
    <li className="flex flex-col gap-2 rounded-md border border-border p-2.5">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Rack</span>
        <input
          type="text"
          maxLength={3}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={async () => {
            const res = await renameRack(rack.id, name)
            if (!res.ok) {
              onError(res.error)
              setName(rack.name)
            } else onError('')
          }}
          className="w-16 rounded-md border border-border bg-secondary px-2 py-1 font-semibold uppercase outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <span className="flex-1 text-right text-xs text-muted-foreground">
          {inRack.length} de {rack.levels * rack.positions} ocupadas
        </span>
        {isAdmin && <button type="button" onClick={onDelete} className="px-1 text-xs font-medium text-destructive">Quitar</button>}
      </div>
      <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-3">
        <RackStepper rack={rack} field="levels" label="Niveles de alto" max={MAX_LEVELS} onError={onError} setRackSize={setRackSize} />
        <RackStepper rack={rack} field="positions" label="Filas del rack" max={MAX_POS} onError={onError} setRackSize={setRackSize} />
      </div>
    </li>
  )
}

function RackStepper({
  rack,
  field,
  label,
  max,
  onError,
  setRackSize,
}: {
  rack: Rack
  field: 'levels' | 'positions'
  label: string
  max: number
  onError: (msg: string) => void
  setRackSize: (id: number, key: 'levels' | 'positions', value: number) => Promise<{ ok: true } | { ok: false; error: string }>
}) {
  const value = rack[field]
  async function set(v: number) {
    const res = await setRackSize(rack.id, field, v)
    onError(res.ok ? '' : res.error)
  }
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="grid grid-cols-[44px_minmax(0,1fr)_44px]">
        <button type="button" aria-label={`Reducir ${label}`} onClick={() => set(value - 1)} disabled={value <= 1} className="flex h-11 items-center justify-center rounded-l-md border border-border bg-card hover:bg-secondary disabled:opacity-40">
          <Minus className="size-4" />
        </button>
        <input readOnly value={value} className="h-11 w-full min-w-0 border-y border-border bg-secondary text-center tabular-nums outline-none" />
        <button type="button" aria-label={`Aumentar ${label}`} onClick={() => set(value + 1)} disabled={value >= max} className="flex h-11 items-center justify-center rounded-r-md border border-border bg-card hover:bg-secondary disabled:opacity-40">
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { useInventory } from '@/store/inventory'
import { useAuth } from '@/store/auth'
import { CategoriesSection } from '@/components/CategoriesSection'
import { locLabels, usePrintLabels } from '@/components/LabelSheet'
import { MAX_RACKS, MAX_LEVELS, MAX_POS, occupancy, type Rack } from '@/domain/inventory'

/** Configuración del almacén (solo admin): categorías, racks y etiquetas. */
export function AdminPanel() {
  const racks = useInventory((s) => s.racks)
  const pallets = useInventory((s) => s.pallets)
  const categories = useInventory((s) => s.categories)
  const addRack = useInventory((s) => s.addRack)
  const deleteRack = useInventory((s) => s.deleteRack)
  const labelPrinter = usePrintLabels()
  const [rackError, setRackError] = useState('')
  const { cap, used } = occupancy(racks, pallets)

  return (
    <div className="flex flex-col gap-6">
      <CategoriesSection />

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Racks</h2>
        <ul className="flex flex-col gap-2">
          {racks.map((r) => (
            <RackEditor
              key={r.id}
              rack={r}
              onError={setRackError}
              onPrint={() => labelPrinter.print(locLabels([r], categories))}
              onDelete={async () => {
                const res = await deleteRack(r.id)
                setRackError(res.ok ? '' : res.error)
              }}
            />
          ))}
        </ul>
        {rackError && (
          <p className="text-sm text-destructive" role="alert">
            {rackError}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={racks.length >= MAX_RACKS}
            onClick={async () => {
              const res = await addRack()
              setRackError(res.ok ? '' : res.error)
            }}
            className="h-11 rounded-xl border border-border bg-card px-3 font-semibold hover:bg-secondary disabled:opacity-50"
          >
            Agregar rack
          </button>
          <button
            type="button"
            disabled={!racks.length}
            onClick={() => labelPrinter.print(locLabels(racks, categories))}
            className="h-11 rounded-xl border border-border bg-card px-3 font-semibold hover:bg-secondary disabled:opacity-50"
          >
            Imprimir etiquetas de todos los racks
          </button>
        </div>
        {labelPrinter.sheet}
        <p className="text-xs text-muted-foreground">
          Hasta {MAX_RACKS} racks de {MAX_LEVELS} niveles y {MAX_POS} filas. {used} de {cap} posiciones ocupadas.
        </p>
      </section>
    </div>
  )
}

function RackEditor({ rack, onError, onDelete, onPrint }: { rack: Rack; onError: (msg: string) => void; onDelete: () => void; onPrint: () => void }) {
  const pallets = useInventory((s) => s.pallets)
  const renameRack = useInventory((s) => s.renameRack)
  const setRackSize = useInventory((s) => s.setRackSize)
  const setRackCategory = useInventory((s) => s.setRackCategory)
  const categories = useInventory((s) => s.categories)
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
        <button type="button" onClick={onPrint} className="px-1 text-xs font-medium text-primary">Etiquetas</button>
        {isAdmin && <button type="button" onClick={onDelete} className="px-1 text-xs font-medium text-destructive">Quitar</button>}
      </div>
      <label className="flex min-w-0 flex-col gap-1">
        <span className="text-xs font-medium text-muted-foreground">Categoría que acepta este rack</span>
        <select
          value={rack.categoryId ?? ''}
          disabled={!isAdmin}
          onChange={async (e) => {
            const res = await setRackCategory(rack.id, e.target.value ? Number(e.target.value) : null)
            onError(res.ok ? '' : res.error)
          }}
          className="h-11 w-full rounded-md border border-border bg-secondary px-2.5 outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-70"
        >
          <option value="">Sin categoría (cualquiera, sin mezclar)</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
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

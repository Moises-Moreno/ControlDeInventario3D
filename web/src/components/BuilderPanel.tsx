import { useEffect } from 'react'
import { useBuilder } from '@/store/builder'
import { useInventory } from '@/store/inventory'
import { useUi } from '@/store/ui'
import { LIMITS, maxLoose, totals } from '@/domain/pallet'
import { productById, locCode, compositionLabel, boxesPerPallet, type Pallet } from '@/domain/inventory'
import { Stepper } from './Stepper'

const fmt = (n: number) => n.toLocaleString('es-BO')

export function BuilderPanel() {
  const b = useBuilder()
  const products = useInventory((s) => s.products)
  const pallets = useInventory((s) => s.pallets)
  const racks = useInventory((s) => s.racks)
  const savePallet = useInventory((s) => s.savePallet)
  const deletePallet = useInventory((s) => s.deletePallet)
  const editProduct = useUi((s) => s.editProduct)

  const product = productById(products, b.productId)
  const presentations = product?.presentations.filter((x) => x.active || x.id === b.presentationId) ?? []
  const presentation = presentations.find((x) => x.id === b.presentationId) ?? null
  const t = totals({ front: b.front, depth: b.depth, rows: b.rows, loose: b.loose }, presentation?.unitsPerBox ?? 0)
  const volume = presentation && product ? t.units * presentation.contentPerUnit : 0
  const looseMax = maxLoose(b.front, b.depth)

  // Si no hay producto elegido pero existe catálogo, usa el primero.
  useEffect(() => {
    if (b.productId == null && products.length) b.set({ productId: (products.find((p) => p.active) ?? products[0]).id })
  }, [b, products])

  // La presentación debe ser una de las del producto elegido.
  useEffect(() => {
    if (!product) return
    if (!product.presentations.some((x) => x.id === b.presentationId)) {
      const first = product.presentations.find((x) => x.active) ?? product.presentations[0]
      if (first) b.set({ presentationId: first.id })
    }
  }, [b, product])

  const editing = b.editingId != null && pallets.some((p) => p.id === b.editingId)

  const save = async () => {
    if (b.productId == null || b.presentationId == null) return
    const id = await savePallet(
      { productId: b.productId, presentationId: b.presentationId, front: b.front, depth: b.depth, rows: b.rows, loose: b.loose, lote: b.lote, vence: b.vence },
      b.editingId,
    )
    if (id != null) useBuilder.setState({ editingId: id })
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Paso 1: producto */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          1 · Producto del pallet
        </h2>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">Producto</span>
          <select
            value={b.productId ?? ''}
            disabled={!products.length}
            onChange={(e) => b.set({ productId: Number(e.target.value), presentationId: null })}
            className="h-11 w-full rounded-xl border border-border bg-secondary px-3 outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            {products.filter((p) => p.active || p.id === b.productId).map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} · {p.name}{p.active ? '' : ' (inactivo)'}
              </option>
            ))}
          </select>
        </label>

        {product && (
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Presentación</span>
            <select
              value={b.presentationId ?? ''}
              onChange={(e) => b.set({ presentationId: Number(e.target.value) })}
              className="h-11 w-full rounded-xl border border-border bg-secondary px-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {presentations.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          </label>
        )}

        {product ? (
          <div className="flex items-center gap-2.5 rounded-md border border-border p-2.5 text-sm">
            <span className="size-7 rounded border border-border" style={{ background: product.color }} />
            <div>
              <strong>{presentation ? compositionLabel(presentation, product.unit) : product.name}</strong>
              {presentation && (
                <span className="block text-xs text-muted-foreground">
                  Pallet completo: {boxesPerPallet(presentation)} cajas ({presentation.front} × {presentation.depth} × {presentation.levels} niveles)
                </span>
              )}
              <button
                type="button"
                onClick={() => editProduct(product.id)}
                className="block text-sm font-semibold text-primary"
              >
                Editar este producto
              </button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            No hay productos. Crea uno en la pestaña Productos para armar un pallet.
          </p>
        )}

        <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Lote (opcional)</span>
            <input
              type="text"
              maxLength={20}
              value={b.lote}
              onChange={(e) => b.set({ lote: e.target.value })}
              className="h-9 w-full rounded-md border border-border bg-secondary px-2.5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Vence (opcional)</span>
            <input
              type="date"
              value={b.vence}
              onChange={(e) => b.set({ vence: e.target.value })}
              className="h-9 w-full rounded-md border border-border bg-secondary px-2.5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
        </div>
      </section>

      {/* Paso 2: armado */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          2 · Armado del pallet
        </h2>
        <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-3">
          <Stepper label="Cajas de frente" value={b.front} min={LIMITS.front.min} max={LIMITS.front.max} onChange={(v) => b.set({ front: v })} onStep={(d) => b.step('front', d)} />
          <Stepper label="Cajas de fondo" value={b.depth} min={LIMITS.depth.min} max={LIMITS.depth.max} onChange={(v) => b.set({ depth: v })} onStep={(d) => b.step('depth', d)} />
          <Stepper label="Filas completas" value={b.rows} min={LIMITS.rows.min} max={LIMITS.rows.max} onChange={(v) => b.set({ rows: v })} onStep={(d) => b.step('rows', d)} />
          <Stepper label="Cajas sueltas arriba" tone="loose" value={b.loose} min={0} max={looseMax} onChange={(v) => b.set({ loose: v })} onStep={(d) => b.step('loose', d)} />
        </div>
        <p className="text-xs text-muted-foreground">
          {looseMax === 0
            ? 'Con una sola caja por fila no hay sueltas: cada caja es una fila completa.'
            : `Cada fila lleva ${t.base} cajas. Arriba caben hasta ${looseMax} sueltas; con ${t.base} ya es otra fila.`}
        </p>

        <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-secondary p-3.5" aria-live="polite">
          <div className="text-sm text-muted-foreground tabular-nums">
            <b className="text-foreground">{b.front} × {b.depth}</b> de base × <b className="text-foreground">{b.rows}</b> {b.rows === 1 ? 'fila' : 'filas'} +{' '}
            <span className="font-semibold text-loose">{b.loose} {b.loose === 1 ? 'suelta' : 'sueltas'}</span>
          </div>
          <div className="text-4xl font-bold tabular-nums">
            {fmt(t.boxes)} <span className="text-lg font-medium text-muted-foreground">cajas</span>
          </div>
          <div className="text-sm tabular-nums">
            {product && presentation ? `${fmt(t.boxes)} cajas × ${fmt(presentation.unitsPerBox)} envases = ${fmt(t.units)} envases · ${fmt(volume)} ${product.unit}` : 'Elige un producto para ver las unidades.'}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={save}
            disabled={!product || !presentation}
            className="h-10 flex-1 rounded-md bg-primary font-semibold text-primary-foreground hover:brightness-110 disabled:opacity-50"
          >
            {editing ? 'Guardar cambios' : 'Guardar pallet'}
          </button>
          <button
            type="button"
            onClick={() => b.newPallet(b.productId)}
            className="h-10 rounded-md border border-border bg-card px-4 font-semibold hover:bg-secondary"
          >
            Nuevo pallet
          </button>
        </div>
      </section>

      {/* Paso 3: pallets armados */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          3 · Pallets armados
        </h2>
        <ul className="flex flex-col gap-1.5">
          {pallets.map((p) => (
            <PalletRow key={p.id} pallet={p} active={p.id === b.editingId} onOpen={() => b.load(p)} onDelete={() => deletePallet(p.id)} />
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">
          {pallets.length
            ? `${pallets.length} ${pallets.length === 1 ? 'pallet' : 'pallets'}, ${fmt(
                pallets.reduce((s, p) => s + totals(p).boxes, 0),
              )} cajas en total. Tocá uno para abrirlo y recontarlo.`
            : 'Todavía no guardaste ningún pallet. Armá uno y pulsá Guardar pallet.'}
        </p>
      </section>
    </div>
  )

  function PalletRow({ pallet, active, onOpen, onDelete }: { pallet: Pallet; active: boolean; onOpen: () => void; onDelete: () => void }) {
    const pr = productById(products, pallet.productId)
    const boxes = totals(pallet).boxes
    const rack = racks.find((r) => r.id === pallet.loc?.rackId)
    let sub = pr ? `${pr.code} · ${pr.name}` : 'Producto eliminado'
    if (pallet.lote) sub += ` · Lote ${pallet.lote}`
    sub += ` · ${pallet.loc ? locCode(rack, pallet.loc) : 'Sin ubicar'}`
    return (
      <li className={`grid grid-cols-[14px_1fr_auto_auto] items-center gap-2.5 rounded-md border p-2 ${active ? 'border-primary' : 'border-border'}`}>
        <span className="size-3.5 rounded-sm border border-border" style={{ background: pr?.color ?? 'transparent' }} />
        <button type="button" onClick={onOpen} className="min-w-0 text-left">
          <span className="font-semibold tabular-nums">{pallet.pal}</span>
          <span className="block truncate text-xs text-muted-foreground">{sub}</span>
        </button>
        <span className="text-lg font-semibold tabular-nums">{fmt(boxes)}</span>
        <button type="button" onClick={onDelete} className="px-1 text-xs font-medium text-destructive">
          Quitar
        </button>
      </li>
    )
  }
}

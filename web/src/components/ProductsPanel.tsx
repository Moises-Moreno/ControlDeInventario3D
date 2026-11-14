import { useEffect, useState } from 'react'
import { useInventory } from '@/store/inventory'
import { useUi } from '@/store/ui'
import { useAuth } from '@/store/auth'
import { stock } from '@/domain/inventory'

const fmt = (n: number) => n.toLocaleString('es-BO')

const BLANK = { code: '', name: '', unitsPerBox: 12, color: '#c89a5a' }

export function ProductsPanel() {
  const products = useInventory((s) => s.products)
  const pallets = useInventory((s) => s.pallets)
  const addProduct = useInventory((s) => s.addProduct)
  const updateProduct = useInventory((s) => s.updateProduct)
  const deleteProduct = useInventory((s) => s.deleteProduct)
  const editProductId = useUi((s) => s.editProductId)
  const clearEditProduct = useUi((s) => s.clearEditProduct)
  const isAdmin = useAuth((s) => s.user?.role) === 'admin'

  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(BLANK)
  const [error, setError] = useState('')

  function startEdit(id: number) {
    const p = products.find((x) => x.id === id)
    if (!p) return
    setEditingId(id)
    setForm({ code: p.code, name: p.name, unitsPerBox: p.unitsPerBox, color: p.color })
    setError('')
  }

  function clear() {
    setEditingId(null)
    setForm(BLANK)
    setError('')
  }

  // Edición solicitada desde el armador ("Editar este producto").
  useEffect(() => {
    if (editProductId != null) {
      startEdit(editProductId)
      clearEditProduct()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editProductId])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const res = editingId != null ? await updateProduct(editingId, form) : await addProduct(form)
    if (!res.ok) {
      setError(res.error)
      return
    }
    clear()
  }

  async function remove() {
    if (editingId == null) return
    const res = await deleteProduct(editingId)
    if (!res.ok) {
      setError(res.error)
      return
    }
    clear()
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Catálogo y stock</h2>
        <ul className="flex flex-col gap-1.5">
          {products.map((p) => {
            const st = stock(pallets, p.id)
            return (
              <li key={p.id} className={`grid grid-cols-[14px_1fr_auto] items-center gap-2.5 rounded-md border p-2 ${p.id === editingId ? 'border-primary' : 'border-border'}`}>
                <span className="size-3.5 rounded-sm border border-border" style={{ background: p.color }} />
                <button type="button" onClick={() => startEdit(p.id)} className="min-w-0 text-left">
                  <span className="font-semibold tabular-nums">
                    {p.code}
                    {p.example && <span className="ml-1.5 rounded border border-border px-1 text-[10px] uppercase text-muted-foreground">Ejemplo</span>}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">{p.name} · {fmt(p.unitsPerBox)} u por caja</span>
                </button>
                <span className="text-right text-lg font-semibold leading-tight tabular-nums">
                  {fmt(st.boxes)}
                  <small className="block text-[11px] font-medium text-muted-foreground">
                    cajas en {st.pallets} {st.pallets === 1 ? 'pallet' : 'pallets'}
                  </small>
                </span>
              </li>
            )
          })}
        </ul>
        <p className="text-xs text-muted-foreground">
          {products.length
            ? 'El stock de cada producto es la suma de sus pallets guardados. Tocá un producto para editarlo.'
            : 'El catálogo está vacío. Agregá tu primer producto con el formulario de abajo.'}
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {editingId != null ? 'Editar producto' : 'Nuevo producto'}
        </h2>
        <form onSubmit={submit} className="grid grid-cols-2 gap-3" noValidate>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Código</span>
            <input type="text" maxLength={20} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="h-9 rounded-md border border-border bg-secondary px-2.5 uppercase outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Unidades por caja</span>
            <input type="number" min={1} max={9999} inputMode="numeric" value={form.unitsPerBox} onChange={(e) => setForm({ ...form, unitsPerBox: Number(e.target.value) })} className="h-9 rounded-md border border-border bg-secondary px-2.5 tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </label>
          <label className="col-span-2 flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Nombre del producto</span>
            <input type="text" maxLength={60} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-9 rounded-md border border-border bg-secondary px-2.5 outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </label>
          <label className="col-span-2 flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Color de la caja</span>
            <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="h-9 w-full cursor-pointer rounded-md border border-border bg-secondary p-1" />
          </label>
          {error && <p className="col-span-2 text-sm text-destructive" role="alert">{error}</p>}
          <div className="col-span-2 flex flex-wrap gap-2">
            <button type="submit" className="h-10 flex-1 rounded-md bg-primary font-semibold text-primary-foreground hover:brightness-110">
              {editingId != null ? 'Guardar cambios' : 'Agregar producto'}
            </button>
            <button type="button" onClick={clear} className="h-10 rounded-md border border-border bg-card px-4 font-semibold hover:bg-secondary">
              {editingId != null ? 'Cancelar' : 'Limpiar'}
            </button>
            {editingId != null && isAdmin && (
              <button type="button" onClick={remove} className="h-10 rounded-md border border-border bg-card px-4 font-semibold text-destructive hover:bg-secondary">
                Eliminar
              </button>
            )}
          </div>
        </form>
      </section>
    </div>
  )
}

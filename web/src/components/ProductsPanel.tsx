import { useEffect, useState } from 'react'
import { ImageOff, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useInventory } from '@/store/inventory'
import { useUi } from '@/store/ui'
import { useAuth } from '@/store/auth'
import type { PresentationInput, ProductInput } from '@/api/inventory'
import { boxesPerPallet, compositionLabel, stock, UNITS, volumeOf, type Product } from '@/domain/inventory'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PhotoInput } from '@/components/PhotoInput'
import { cn } from '@/lib/utils'

const fmt = (n: number) => n.toLocaleString('es-BO', { maximumFractionDigits: 2 })

const INPUT =
  'h-11 w-full min-w-0 rounded-xl border border-border bg-secondary px-3 outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60'

const BLANK_PRESENTATION: PresentationInput = {
  name: '',
  contentPerUnit: 1,
  unitsPerBox: 1,
  front: 5,
  depth: 2,
  levels: 4,
  active: true,
}

function blankForm(): ProductInput {
  return { code: '', name: '', unit: 'L', color: '#5fa8d3', photo: null, active: true, presentations: [{ ...BLANK_PRESENTATION }] }
}

function formFrom(p: Product): ProductInput {
  return {
    code: p.code,
    name: p.name,
    unit: p.unit,
    color: p.color,
    photo: p.photo,
    active: p.active,
    presentations: p.presentations.map((x) => ({
      id: x.id,
      name: x.name,
      contentPerUnit: x.contentPerUnit,
      unitsPerBox: x.unitsPerBox,
      front: x.front,
      depth: x.depth,
      levels: x.levels,
      active: x.active,
    })),
  }
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn('flex min-w-0 flex-col gap-1', className)}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

function NumberInput({
  value,
  onChange,
  min = 1,
  max,
  step,
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number | 'any'
}) {
  return (
    <input
      type="number"
      inputMode={step === 'any' ? 'decimal' : 'numeric'}
      min={min}
      max={max}
      step={step}
      value={Number.isFinite(value) ? value : ''}
      onChange={(e) => onChange(e.target.value === '' ? Number.NaN : Number(e.target.value))}
      className={cn(INPUT, 'tabular-nums')}
    />
  )
}

export function ProductsPanel() {
  const products = useInventory((s) => s.products)
  const pallets = useInventory((s) => s.pallets)
  const addProduct = useInventory((s) => s.addProduct)
  const updateProduct = useInventory((s) => s.updateProduct)
  const deleteProduct = useInventory((s) => s.deleteProduct)
  const editProductId = useUi((s) => s.editProductId)
  const clearEditProduct = useUi((s) => s.clearEditProduct)
  const newProductRequest = useUi((s) => s.newProductRequest)
  const clearNewProduct = useUi((s) => s.clearNewProduct)
  const isAdmin = useAuth((s) => s.user?.role) === 'admin'

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState<ProductInput>(blankForm)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showInactive, setShowInactive] = useState(true)

  function openNew() {
    setEditing(null)
    setForm(blankForm())
    setError('')
    setOpen(true)
  }

  function openEdit(p: Product) {
    setEditing(p)
    setForm(formFrom(p))
    setError('')
    setOpen(true)
  }

  // Edición solicitada desde otra sección ("Editar este producto").
  useEffect(() => {
    if (editProductId == null) return
    const p = products.find((x) => x.id === editProductId)
    if (p) openEdit(p)
    clearEditProduct()
  }, [editProductId, products, clearEditProduct])

  // Alta solicitada desde otra sección (p. ej. Recepción).
  useEffect(() => {
    if (!newProductRequest) return
    openNew()
    clearNewProduct()
  }, [newProductRequest, clearNewProduct])

  function patch(p: Partial<ProductInput>) {
    setForm((f) => ({ ...f, ...p }))
  }

  function patchPresentation(i: number, p: Partial<PresentationInput>) {
    setForm((f) => ({ ...f, presentations: f.presentations.map((x, k) => (k === i ? { ...x, ...p } : x)) }))
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const problem = validate(form)
    if (problem) {
      setError(problem)
      return
    }
    const res = editing ? await updateProduct(editing.id, form) : await addProduct(form)
    if (!res.ok) {
      setError(res.error)
      return
    }
    toast.success(editing ? 'Producto actualizado.' : 'Producto agregado.')
    setOpen(false)
  }

  async function remove() {
    if (!editing) return
    const res = await deleteProduct(editing.id)
    setConfirmDelete(false)
    if (!res.ok) {
      setError(res.error)
      return
    }
    toast.success('Producto eliminado.')
    setOpen(false)
  }

  const visible = products.filter((p) => showInactive || p.active)
  const inactiveCount = products.filter((p) => !p.active).length

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {products.length} {products.length === 1 ? 'producto' : 'productos'}
          {inactiveCount > 0 && ` · ${inactiveCount} inactivo${inactiveCount === 1 ? '' : 's'}`}
        </p>
        <Button onClick={openNew}>
          <Plus /> Nuevo producto
        </Button>
      </div>

      {inactiveCount > 0 && (
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="size-5 accent-[var(--primary)]"
          />
          Mostrar productos inactivos
        </label>
      )}

      <ul className="flex flex-col gap-2">
        {visible.map((p) => {
          const st = stock(pallets, p.id)
          const vol = volumeOf(pallets, p)
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => openEdit(p)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  !p.active && 'opacity-60',
                )}
              >
                <span
                  className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border"
                  style={{ background: p.photo ? undefined : p.color }}
                >
                  {p.photo ? <img src={p.photo} alt="" className="size-full object-cover" /> : <ImageOff className="size-5 text-black/40" aria-hidden />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="font-semibold tabular-nums">{p.code}</span>
                    <span className="rounded-md border border-border px-1.5 text-[11px] font-semibold uppercase text-muted-foreground">
                      {p.unit}
                    </span>
                    {!p.active && (
                      <span className="rounded-md bg-muted px-1.5 text-[11px] font-semibold uppercase text-muted-foreground">Inactivo</span>
                    )}
                  </span>
                  <span className="block truncate text-sm">{p.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {p.presentations
                      .filter((x) => x.active)
                      .map((x) => `${x.name} · ${compositionLabel(x, p.unit)} · pallet de ${boxesPerPallet(x)} cajas`)
                      .join(' | ')}
                  </span>
                </span>
                <span className="shrink-0 text-right leading-tight">
                  <span className="block text-lg font-semibold tabular-nums">{fmt(st.boxes)}</span>
                  <span className="block text-[11px] text-muted-foreground">
                    cajas · {st.pallets} {st.pallets === 1 ? 'pallet' : 'pallets'}
                  </span>
                  {vol > 0 && (
                    <span className="block text-[11px] text-muted-foreground">
                      {fmt(vol)} {p.unit}
                    </span>
                  )}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? `Editar ${editing.code}` : 'Nuevo producto'}</DialogTitle>
            <DialogDescription>
              Define cómo viene el producto: al recibir mercadería solo cargás la cantidad y el sistema calcula las cajas y los pallets.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={save} className="flex flex-col gap-4" noValidate>
            <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-3">
              <Field label="Id del producto">
                <input
                  type="text"
                  maxLength={20}
                  value={form.code}
                  onChange={(e) => patch({ code: e.target.value })}
                  className={cn(INPUT, 'uppercase')}
                  autoComplete="off"
                />
              </Field>
              <Field label="Unidad de medida">
                <select value={form.unit} onChange={(e) => patch({ unit: e.target.value })} className={INPUT}>
                  {UNITS.map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Nombre del producto" className="col-span-2">
                <input type="text" maxLength={60} value={form.name} onChange={(e) => patch({ name: e.target.value })} className={INPUT} autoComplete="off" />
              </Field>
              <Field label="Color de la caja (en el 3D)">
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => patch({ color: e.target.value })}
                  className="h-11 w-full cursor-pointer rounded-xl border border-border bg-secondary p-1"
                />
              </Field>
              <label className="flex min-h-11 items-center gap-3 self-end rounded-xl border border-border px-3 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => patch({ active: e.target.checked })}
                  className="size-5 accent-[var(--primary)]"
                />
                Producto activo
              </label>
            </div>

            <PhotoInput
              label="Foto del producto"
              max={1}
              maxSide={480}
              photos={form.photo ? [form.photo] : []}
              onChange={(list) => patch({ photo: list[0] ?? null })}
            />

            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Presentaciones</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => patch({ presentations: [...form.presentations, { ...BLANK_PRESENTATION }] })}
                >
                  <Plus /> Agregar
                </Button>
              </div>

              {form.presentations.map((pr, i) => (
                <div key={pr.id ?? `n${i}`} className={cn('flex flex-col gap-3 rounded-2xl border border-border p-3', !pr.active && 'opacity-60')}>
                  <div className="flex items-end gap-2">
                    <Field label="Nombre de la presentación" className="flex-1">
                      <input
                        type="text"
                        maxLength={40}
                        placeholder={`Envase 5 ${form.unit}`}
                        value={pr.name}
                        onChange={(e) => patchPresentation(i, { name: e.target.value })}
                        className={INPUT}
                      />
                    </Field>
                    {form.presentations.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Quitar presentación"
                        onClick={() => patch({ presentations: form.presentations.filter((_, k) => k !== i) })}
                      >
                        <Trash2 />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-3">
                    <Field label={`Contenido de cada envase (${form.unit})`}>
                      <NumberInput value={pr.contentPerUnit} step="any" min={0.001} onChange={(v) => patchPresentation(i, { contentPerUnit: v })} />
                    </Field>
                    <Field label="Envases por caja">
                      <NumberInput value={pr.unitsPerBox} max={9999} onChange={(v) => patchPresentation(i, { unitsPerBox: v })} />
                    </Field>
                  </div>

                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">Pallet completo</p>
                    <div className="grid grid-cols-[repeat(3,minmax(0,1fr))] gap-2">
                      <Field label="Frente">
                        <NumberInput value={pr.front} max={6} onChange={(v) => patchPresentation(i, { front: v })} />
                      </Field>
                      <Field label="Fondo">
                        <NumberInput value={pr.depth} max={6} onChange={(v) => patchPresentation(i, { depth: v })} />
                      </Field>
                      <Field label="Niveles de alto">
                        <NumberInput value={pr.levels} max={10} onChange={(v) => patchPresentation(i, { levels: v })} />
                      </Field>
                    </div>
                  </div>

                  <p className="rounded-xl bg-secondary px-3 py-2 text-sm">
                    {summary(pr, form.unit)}
                  </p>

                  {pr.id != null && (
                    <label className="flex min-h-11 items-center gap-3 text-sm">
                      <input
                        type="checkbox"
                        checked={pr.active}
                        onChange={(e) => patchPresentation(i, { active: e.target.checked })}
                        className="size-5 accent-[var(--primary)]"
                      />
                      Presentación activa
                    </label>
                  )}
                </div>
              ))}
            </section>

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            <DialogFooter>
              {editing && isAdmin && (
                <Button type="button" variant="outline" className="text-destructive sm:mr-auto" onClick={() => setConfirmDelete(true)}>
                  <Trash2 /> Eliminar
                </Button>
              )}
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">{editing ? 'Guardar cambios' : 'Agregar producto'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar {editing?.code}?</AlertDialogTitle>
            <AlertDialogDescription>
              Solo se puede eliminar si nunca tuvo pallets ni recepciones. Si ya tiene historial, mejor desactivalo para que no se use más.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-white" onClick={remove}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/** Resumen de cómo queda conformada una presentación. */
function summary(pr: PresentationInput, unit: string): string {
  const perLevel = pr.front * pr.depth
  const boxes = perLevel * pr.levels
  if (![pr.contentPerUnit, pr.unitsPerBox, pr.front, pr.depth, pr.levels].every(Number.isFinite)) return 'Completá todos los datos.'
  const perBox = pr.unitsPerBox * pr.contentPerUnit
  return `Caja de ${pr.unitsPerBox} × ${pr.contentPerUnit} ${unit} (${fmt(perBox)} ${unit}) · ${perLevel} cajas por nivel × ${pr.levels} niveles = ${boxes} cajas = ${fmt(boxes * perBox)} ${unit} por pallet completo.`
}

function validate(f: ProductInput): string | null {
  if (!f.code.trim()) return 'Escribe el id del producto.'
  if (!f.name.trim()) return 'Escribe el nombre del producto.'
  if (f.presentations.length === 0) return 'El producto necesita al menos una presentación.'
  for (const [i, p] of f.presentations.entries()) {
    const n = i + 1
    if (!p.name.trim()) return `Escribe el nombre de la presentación ${n}.`
    if (!(p.contentPerUnit > 0)) return `El contenido por envase de la presentación ${n} debe ser mayor que 0.`
    if (!Number.isInteger(p.unitsPerBox) || p.unitsPerBox < 1) return `Los envases por caja de la presentación ${n} deben ser 1 o más.`
    if (!Number.isInteger(p.front) || p.front < 1 || p.front > 6) return `El frente del pallet de la presentación ${n} va de 1 a 6 cajas.`
    if (!Number.isInteger(p.depth) || p.depth < 1 || p.depth > 6) return `El fondo del pallet de la presentación ${n} va de 1 a 6 cajas.`
    if (!Number.isInteger(p.levels) || p.levels < 1 || p.levels > 10) return `Los niveles del pallet de la presentación ${n} van de 1 a 10.`
  }
  if (!f.presentations.some((p) => p.active)) return 'Deja al menos una presentación activa.'
  return null
}

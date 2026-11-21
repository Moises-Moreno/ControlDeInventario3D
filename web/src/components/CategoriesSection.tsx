import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useInventory } from '@/store/inventory'
import { useAuth } from '@/store/auth'
import type { Category } from '@/domain/inventory'
import { Button } from '@/components/ui/button'

/** Colores que se van proponiendo para las categorías nuevas (así no salen todas iguales). */
const PALETTE = ['#38bdf8', '#f59e0b', '#34d399', '#f472b6', '#a78bfa', '#fb7185', '#2dd4bf', '#facc15']

const INPUT =
  'h-11 min-w-0 flex-1 rounded-xl border border-border bg-secondary px-3 outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-70'

/**
 * Categorías de producto (detergente en polvo, en barra, líquido...). Cada rack se asigna a
 * una para que no se mezclen. Solo el admin las crea, edita y borra.
 */
export function CategoriesSection() {
  const categories = useInventory((s) => s.categories)
  const products = useInventory((s) => s.products)
  const racks = useInventory((s) => s.racks)
  const addCategory = useInventory((s) => s.addCategory)
  const isAdmin = useAuth((s) => s.user?.role) === 'admin'

  const [name, setName] = useState('')
  const [picked, setPicked] = useState<string | null>(null)
  const color = picked ?? PALETTE[categories.length % PALETTE.length]

  async function add(e: React.FormEvent) {
    e.preventDefault()
    const res = await addCategory({ name, color })
    if (res.ok) {
      setName('')
      setPicked(null)
      toast.success('Categoría creada.')
    } else toast.error(res.error)
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Categorías de producto</h2>
      <p className="text-xs text-muted-foreground">
        Cada rack acepta solo productos de su categoría.
      </p>

      {categories.length === 0 && (
        <p className="text-sm text-muted-foreground">Todavía no hay categorías.{isAdmin ? ' Creá la primera abajo.' : ''}</p>
      )}
      <ul className="flex flex-col gap-2">
        {categories.map((c) => (
          <CategoryRow
            key={c.id}
            category={c}
            isAdmin={isAdmin}
            products={products.filter((p) => p.categoryId === c.id).length}
            racks={racks.filter((r) => r.categoryId === c.id).map((r) => r.name)}
          />
        ))}
      </ul>

      {isAdmin && (
        <form onSubmit={add} className="flex items-center gap-2" noValidate>
          <input
            type="color"
            value={color}
            onChange={(e) => setPicked(e.target.value)}
            aria-label="Color de la categoría"
            className="h-11 w-12 shrink-0 cursor-pointer rounded-xl border border-border bg-secondary p-1"
          />
          <input
            type="text"
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nueva categoría, p. ej. Detergente en polvo"
            aria-label="Nombre de la nueva categoría"
            className={INPUT}
          />
          <Button type="submit" disabled={!name.trim()}>
            <Plus /> Agregar
          </Button>
        </form>
      )}
    </section>
  )
}

function CategoryRow({ category, isAdmin, products, racks }: { category: Category; isAdmin: boolean; products: number; racks: string[] }) {
  const updateCategory = useInventory((s) => s.updateCategory)
  const deleteCategory = useInventory((s) => s.deleteCategory)
  const [name, setName] = useState(category.name)

  async function save(patch: { name?: string; color?: string }) {
    const res = await updateCategory(category.id, { name: patch.name ?? name, color: patch.color ?? category.color })
    if (!res.ok) {
      toast.error(res.error)
      setName(category.name)
    }
  }

  async function remove() {
    const res = await deleteCategory(category.id)
    if (res.ok) toast.success('Categoría eliminada.')
    else toast.error(res.error)
  }

  return (
    <li className="flex flex-col gap-1 rounded-xl border border-border p-2.5">
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={category.color}
          disabled={!isAdmin}
          onChange={(e) => save({ color: e.target.value })}
          aria-label={`Color de ${category.name}`}
          className="h-11 w-12 shrink-0 cursor-pointer rounded-xl border border-border bg-secondary p-1 disabled:cursor-default"
        />
        <input
          type="text"
          value={name}
          maxLength={40}
          disabled={!isAdmin}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name.trim() && name.trim() !== category.name && save({ name })}
          aria-label="Nombre de la categoría"
          className={INPUT}
        />
        {isAdmin && (
          <Button variant="ghost" size="icon" aria-label={`Eliminar ${category.name}`} onClick={remove}>
            <Trash2 />
          </Button>
        )}
      </div>
      <p className="pl-14 text-xs text-muted-foreground">
        {products} {products === 1 ? 'producto' : 'productos'} · {racks.length ? `Rack ${racks.join(', ')}` : 'sin rack asignado'}
      </p>
    </li>
  )
}

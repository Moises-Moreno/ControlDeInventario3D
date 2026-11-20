import { useCallback, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '@/api/client'
import { inventoryApi, type CategoryInput, type PalletInput, type ProductInput } from '@/api/inventory'
import type { Category, Loc, Pallet, Product, Rack } from '@/domain/inventory'
import type { ZoneContext } from '@/domain/zones'

/** Resultado de una acción que puede fallar con un mensaje en español. */
export type Result = { ok: true } | { ok: false; error: string }
export type { ProductInput, PalletInput, CategoryInput }

export interface InventoryState {
  products: Product[]
  pallets: Pallet[]
  racks: Rack[]
  categories: Category[]
  isLoading: boolean
  addProduct: (d: ProductInput) => Promise<Result>
  updateProduct: (id: number, d: ProductInput) => Promise<Result>
  deleteProduct: (id: number) => Promise<Result>
  /** Crea o recuenta un pallet; devuelve su id o null si falló. */
  savePallet: (input: PalletInput, editingId: number | null) => Promise<number | null>
  /** Da de baja (baja lógica) un pallet. */
  deletePallet: (id: number) => Promise<void>
  placePallet: (id: number, loc: Loc) => Promise<Result>
  unplacePallet: (id: number) => Promise<void>
  addRack: () => Promise<Result>
  renameRack: (id: number, name: string) => Promise<Result>
  setRackSize: (id: number, key: 'levels' | 'positions', value: number) => Promise<Result>
  deleteRack: (id: number) => Promise<Result>
  setRackCategory: (id: number, categoryId: number | null) => Promise<Result>
  addCategory: (d: CategoryInput) => Promise<Result>
  updateCategory: (id: number, d: CategoryInput) => Promise<Result>
  deleteCategory: (id: number) => Promise<Result>
}

function toResult(p: Promise<unknown>): Promise<Result> {
  return p.then(
    () => ({ ok: true }) as Result,
    (e) => ({ ok: false, error: e instanceof ApiError ? e.message : 'Ocurrió un error inesperado.' }) as Result,
  )
}

function useInventoryState(): InventoryState {
  const qc = useQueryClient()
  const products = useQuery({ queryKey: ['products'], queryFn: inventoryApi.getProducts })
  const racks = useQuery({ queryKey: ['racks'], queryFn: inventoryApi.getRacks })
  const pallets = useQuery({ queryKey: ['pallets'], queryFn: inventoryApi.getPallets })
  const categories = useQuery({ queryKey: ['categories'], queryFn: inventoryApi.getCategories })

  const invalidate = useCallback(
    (keys: string[]) => Promise.all(keys.map((k) => qc.invalidateQueries({ queryKey: [k] }))),
    [qc],
  )

  return {
    products: products.data ?? [],
    racks: racks.data ?? [],
    pallets: pallets.data ?? [],
    categories: categories.data ?? [],
    isLoading: products.isLoading || racks.isLoading || pallets.isLoading,

    addProduct: async (d) => {
      const r = await toResult(inventoryApi.createProduct(d))
      if (r.ok) await invalidate(['products'])
      return r
    },
    updateProduct: async (id, d) => {
      const r = await toResult(inventoryApi.updateProduct(id, d))
      if (r.ok) await invalidate(['products', 'pallets'])
      return r
    },
    deleteProduct: async (id) => {
      const r = await toResult(inventoryApi.deleteProduct(id, true))
      // Se borran pallets, movimientos y recepciones: se refresca todo.
      if (r.ok) await qc.invalidateQueries()
      return r
    },

    savePallet: async (input, editingId) => {
      try {
        const p = editingId != null ? await inventoryApi.recountPallet(editingId, input) : await inventoryApi.createPallet(input)
        await invalidate(['pallets', 'products'])
        return p.id
      } catch {
        return null
      }
    },
    deletePallet: async (id) => {
      await toResult(inventoryApi.bajaPallet(id))
      await invalidate(['pallets', 'products'])
    },
    placePallet: async (id, loc) => {
      const r = await toResult(inventoryApi.placePallet(id, loc))
      if (r.ok) await invalidate(['pallets'])
      return r
    },
    unplacePallet: async (id) => {
      await toResult(inventoryApi.unplacePallet(id))
      await invalidate(['pallets'])
    },

    addRack: async () => {
      const r = await toResult(inventoryApi.createRack())
      if (r.ok) await invalidate(['racks'])
      return r
    },
    renameRack: async (id, name) => {
      const r = await toResult(inventoryApi.updateRack(id, { name }))
      if (r.ok) await invalidate(['racks'])
      return r
    },
    setRackSize: async (id, key, value) => {
      const r = await toResult(inventoryApi.updateRack(id, { [key]: value }))
      if (r.ok) await invalidate(['racks', 'pallets'])
      return r
    },
    deleteRack: async (id) => {
      const r = await toResult(inventoryApi.deleteRack(id))
      if (r.ok) await invalidate(['racks'])
      return r
    },
    setRackCategory: async (id, categoryId) => {
      const r = await toResult(inventoryApi.updateRack(id, { categoryId }))
      if (r.ok) await invalidate(['racks'])
      return r
    },

    addCategory: async (d) => {
      const r = await toResult(inventoryApi.createCategory(d))
      if (r.ok) await invalidate(['categories'])
      return r
    },
    updateCategory: async (id, d) => {
      const r = await toResult(inventoryApi.updateCategory(id, d))
      if (r.ok) await invalidate(['categories'])
      return r
    },
    deleteCategory: async (id) => {
      const r = await toResult(inventoryApi.deleteCategory(id))
      if (r.ok) await invalidate(['categories'])
      return r
    },
  }
}

/**
 * Datos de inventario desde la API (vía TanStack Query), con una firma de selector
 * compatible con el store anterior: `useInventory((s) => s.products)`.
 */
export function useInventory(): InventoryState
export function useInventory<T>(selector: (s: InventoryState) => T): T
export function useInventory<T>(selector?: (s: InventoryState) => T): T | InventoryState {
  const state = useInventoryState()
  return selector ? selector(state) : state
}

/** Contexto de zonas (categoría de cada producto y nombres) para sugerir y validar ubicaciones. */
export function useZones(): ZoneContext {
  const products = useInventory((s) => s.products)
  const categories = useInventory((s) => s.categories)
  return useMemo(() => {
    const byProduct = new Map(products.map((p) => [p.id, p.categoryId]))
    return {
      categoryOf: (productId: number) => byProduct.get(productId) ?? null,
      names: new Map(categories.map((c) => [c.id, c.name])),
    }
  }, [products, categories])
}

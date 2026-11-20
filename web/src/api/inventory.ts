import { api } from './client'
import type { Product, Pallet, Rack, Loc, Category } from '@/domain/inventory'
import type { PalletBuild } from '@/domain/pallet'

export interface PresentationInput {
  /** Presente si se edita una presentación existente. */
  id?: number
  name: string
  contentPerUnit: number
  unitsPerBox: number
  front: number
  depth: number
  levels: number
  active: boolean
}

export interface ProductInput {
  code: string
  name: string
  unit: string
  color: string
  /** Foto (data URL), null para quitarla o undefined para no tocarla. */
  photo?: string | null
  active: boolean
  /** Categoría (null = sin categoría). */
  categoryId: number | null
  presentations: PresentationInput[]
}

export interface ProductUsage {
  code: string
  name: string
  pallets: number
  palletsInRack: number
  movements: number
  receptionLines: number
  receptions: number
}

export interface CategoryInput {
  name: string
  color?: string
}

export interface PalletInput extends PalletBuild {
  productId: number
  presentationId: number
  lote: string
  vence: string
}

export const inventoryApi = {
  getProducts: () => api.get<Product[]>('/products'),
  createProduct: (d: ProductInput) => api.post<Product>('/products', d),
  updateProduct: (id: number, d: ProductInput) => api.patch<Product>(`/products/${id}`, d),
  /** Con cascade=true borra también pallets, movimientos y líneas de recepción (solo admin). */
  deleteProduct: (id: number, cascade = false) => api.del<void>(`/products/${id}${cascade ? '?cascade=true' : ''}`),
  productUsage: (id: number) => api.get<ProductUsage>(`/products/${id}/uso`),

  getCategories: () => api.get<Category[]>('/categories'),
  createCategory: (d: CategoryInput) => api.post<Category>('/categories', d),
  updateCategory: (id: number, d: CategoryInput) => api.patch<Category>(`/categories/${id}`, d),
  deleteCategory: (id: number) => api.del<void>(`/categories/${id}`),

  getRacks: () => api.get<Rack[]>('/racks'),
  createRack: () => api.post<Rack>('/racks'),
  updateRack: (id: number, d: { name?: string; levels?: number; positions?: number; categoryId?: number | null }) =>
    api.patch<Rack>(`/racks/${id}`, d),
  deleteRack: (id: number) => api.del<void>(`/racks/${id}`),

  getPallets: () => api.get<Pallet[]>('/pallets'),
  createPallet: (d: PalletInput) => api.post<Pallet>('/pallets', d),
  recountPallet: (id: number, d: PalletInput) => api.patch<Pallet>(`/pallets/${id}`, d),
  placePallet: (id: number, loc: Loc) => api.post<Pallet>(`/pallets/${id}/ubicacion`, loc),
  unplacePallet: (id: number) => api.del<Pallet>(`/pallets/${id}/ubicacion`),
  bajaPallet: (id: number) => api.post<void>(`/pallets/${id}/baja`),
}

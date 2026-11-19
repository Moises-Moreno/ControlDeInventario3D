import { api } from './client'
import type { Product, Pallet, Rack, Loc } from '@/domain/inventory'
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
  presentations: PresentationInput[]
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
  deleteProduct: (id: number) => api.del<void>(`/products/${id}`),

  getRacks: () => api.get<Rack[]>('/racks'),
  createRack: () => api.post<Rack>('/racks'),
  updateRack: (id: number, d: { name?: string; levels?: number; positions?: number }) =>
    api.patch<Rack>(`/racks/${id}`, d),
  deleteRack: (id: number) => api.del<void>(`/racks/${id}`),

  getPallets: () => api.get<Pallet[]>('/pallets'),
  createPallet: (d: PalletInput) => api.post<Pallet>('/pallets', d),
  recountPallet: (id: number, d: PalletInput) => api.patch<Pallet>(`/pallets/${id}`, d),
  placePallet: (id: number, loc: Loc) => api.post<Pallet>(`/pallets/${id}/ubicacion`, loc),
  unplacePallet: (id: number) => api.del<Pallet>(`/pallets/${id}/ubicacion`),
  bajaPallet: (id: number) => api.post<void>(`/pallets/${id}/baja`),
}

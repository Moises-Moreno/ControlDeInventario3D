import { create } from 'zustand'
import type { Loc } from '@/domain/inventory'
import type { Route } from '@/domain/warehousePlan'

export type Tab = 'recepcion' | 'armar' | 'productos' | 'almacen' | 'resumen' | 'historial'

interface UiState {
  tab: Tab
  /** Pallet que se está ubicando (o null). */
  placingId: number | null
  /** Posición del almacén seleccionada (o null). */
  selectedSlot: Loc | null
  /** Producto a editar al abrir la pestaña Productos (o null). */
  editProductId: number | null
  /** Posiciones sugeridas que se resaltan en el 3D y en el mapa. */
  guideLocs: Loc[]
  /** Ruta que se dibuja en el mapa y en el 3D (o null). */
  route: Route | null
  setGuide: (locs: Loc[], route: Route | null) => void
  clearGuide: () => void
  setTab: (t: Tab) => void
  setPlacing: (id: number | null) => void
  selectSlot: (loc: Loc | null) => void
  /** Va a la pestaña Productos con un producto cargado para editar. */
  editProduct: (id: number) => void
  clearEditProduct: () => void
  /** Pide abrir el formulario de producto nuevo al entrar a Productos. */
  newProductRequest: boolean
  requestNewProduct: () => void
  clearNewProduct: () => void
}

export const useUi = create<UiState>((set) => ({
  tab: 'recepcion',
  placingId: null,
  selectedSlot: null,
  editProductId: null,
  guideLocs: [],
  route: null,
  setGuide: (locs, route) => set({ guideLocs: locs, route }),
  clearGuide: () => set({ guideLocs: [], route: null }),
  setTab: (t) => set({ tab: t }),
  setPlacing: (id) => set({ placingId: id }),
  selectSlot: (loc) => set({ selectedSlot: loc }),
  editProduct: (id) => set({ tab: 'productos', editProductId: id }),
  clearEditProduct: () => set({ editProductId: null }),
  newProductRequest: false,
  requestNewProduct: () => set({ tab: 'productos', newProductRequest: true }),
  clearNewProduct: () => set({ newProductRequest: false }),
}))

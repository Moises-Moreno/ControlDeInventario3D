import { create } from 'zustand'
import type { Loc } from '@/domain/inventory'

export type Tab = 'armar' | 'productos' | 'almacen' | 'resumen' | 'historial'

interface UiState {
  tab: Tab
  /** Pallet que se está ubicando (o null). */
  placingId: number | null
  /** Posición del almacén seleccionada (o null). */
  selectedSlot: Loc | null
  /** Producto a editar al abrir la pestaña Productos (o null). */
  editProductId: number | null
  setTab: (t: Tab) => void
  setPlacing: (id: number | null) => void
  selectSlot: (loc: Loc | null) => void
  /** Va a la pestaña Productos con un producto cargado para editar. */
  editProduct: (id: number) => void
  clearEditProduct: () => void
}

export const useUi = create<UiState>((set) => ({
  tab: 'armar',
  placingId: null,
  selectedSlot: null,
  editProductId: null,
  setTab: (t) => set({ tab: t }),
  setPlacing: (id) => set({ placingId: id }),
  selectSlot: (loc) => set({ selectedSlot: loc }),
  editProduct: (id) => set({ tab: 'productos', editProductId: id }),
  clearEditProduct: () => set({ editProductId: null }),
}))

import { create } from 'zustand'
import type { Loc } from '@/domain/inventory'
import type { Route } from '@/domain/warehousePlan'

/** Secciones principales, por tarea. */
export type Tab = 'almacen' | 'recibir' | 'guardar' | 'retirar' | 'mas'

/** Sub-secciones de "Más" (administración). */
export type MasSection = 'productos' | 'recepciones' | 'armar' | 'resumen' | 'historial' | 'admin'

interface UiState {
  tab: Tab
  /** Sub-sección abierta dentro de "Más". */
  masSection: MasSection
  /** Pallet que se está ubicando (o null). */
  placingId: number | null
  /** Posición del almacén seleccionada (o null). */
  selectedSlot: Loc | null
  /** Producto a editar al abrir Productos (o null). */
  editProductId: number | null
  /** Posiciones sugeridas que se resaltan en el plano y en el 3D. */
  guideLocs: Loc[]
  /** Ruta que se dibuja en el plano y en el 3D (o null). */
  route: Route | null
  setGuide: (locs: Loc[], route: Route | null) => void
  clearGuide: () => void
  setTab: (t: Tab) => void
  /** Abre una sub-sección de "Más". */
  openMas: (s: MasSection) => void
  setPlacing: (id: number | null) => void
  selectSlot: (loc: Loc | null) => void
  /** Va a Productos con un producto cargado para editar. */
  editProduct: (id: number) => void
  clearEditProduct: () => void
  /** Pide abrir el formulario de producto nuevo al entrar a Productos. */
  newProductRequest: boolean
  requestNewProduct: () => void
  clearNewProduct: () => void
}

export const useUi = create<UiState>((set) => ({
  tab: 'almacen',
  masSection: 'productos',
  placingId: null,
  selectedSlot: null,
  editProductId: null,
  guideLocs: [],
  route: null,
  setGuide: (locs, route) => set({ guideLocs: locs, route }),
  clearGuide: () => set({ guideLocs: [], route: null }),
  setTab: (t) => set({ tab: t }),
  openMas: (s) => set({ tab: 'mas', masSection: s }),
  setPlacing: (id) => set({ placingId: id }),
  selectSlot: (loc) => set({ selectedSlot: loc }),
  editProduct: (id) => set({ tab: 'mas', masSection: 'productos', editProductId: id }),
  clearEditProduct: () => set({ editProductId: null }),
  newProductRequest: false,
  requestNewProduct: () => set({ tab: 'mas', masSection: 'productos', newProductRequest: true }),
  clearNewProduct: () => set({ newProductRequest: false }),
}))

import { create } from 'zustand'
import { normalizeBuild, type PalletBuild } from '@/domain/pallet'
import type { Pallet } from '@/domain/inventory'

/**
 * Estado del pallet que se está armando (formulario). Es transitorio: toma el
 * producto, dimensiones, lote y vencimiento. Al guardar, el store de inventario
 * crea o actualiza el Pallet correspondiente.
 */
export interface BuilderState extends PalletBuild {
  productId: number | null
  presentationId: number | null
  lote: string
  vence: string
  /** Id del pallet que se está editando (null si es nuevo). */
  editingId: number | null

  set: (patch: Partial<BuilderFields>) => void
  step: (field: keyof PalletBuild, delta: number) => void
  /** Pallet nuevo en blanco, conservando el producto elegido. */
  newPallet: (keepProduct?: number | null) => void
  /** Carga un pallet existente para recontarlo/editarlo. */
  load: (p: Pallet) => void
  /** Si no hay producto elegido, usa el id indicado. */
  ensureProduct: (productId: number | null) => void
}

type BuilderFields = PalletBuild & {
  productId: number | null
  presentationId: number | null
  lote: string
  vence: string
}

const BLANK: PalletBuild = { front: 2, depth: 2, rows: 1, loose: 0 }

export const useBuilder = create<BuilderState>()((set, get) => ({
  ...BLANK,
  productId: null,
  presentationId: null,
  lote: '',
  vence: '',
  editingId: null,

  set: (patch) =>
    set((state) => {
      const merged = { ...state, ...patch }
      const build = normalizeBuild(merged)
      return { ...build, productId: merged.productId, presentationId: merged.presentationId, lote: merged.lote, vence: merged.vence }
    }),

  step: (field, delta) => {
    const current = get()[field]
    get().set({ [field]: current + delta } as Partial<BuilderFields>)
  },

  newPallet: (keepProduct) =>
    set((state) => ({
      ...BLANK,
      productId: keepProduct ?? state.productId,
      presentationId: keepProduct == null || keepProduct === state.productId ? state.presentationId : null,
      lote: '',
      vence: '',
      editingId: null,
    })),

  load: (p) =>
    set({
      front: p.front,
      depth: p.depth,
      rows: p.rows,
      loose: p.loose,
      productId: p.productId,
      presentationId: p.presentationId,
      lote: p.lote,
      vence: p.vence,
      editingId: p.id,
    }),

  ensureProduct: (productId) =>
    set((state) => (state.productId == null ? { productId } : {})),
}))

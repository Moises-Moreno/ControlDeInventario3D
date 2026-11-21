import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ReceptionDetail } from '@/api/receptions'

export interface DraftLine {
  key: string
  presentationId: number
  /** Cantidad en la unidad de medida del producto (p. ej. litros). */
  quantity: number
  lote: string
  vence: string
}

interface ReceptionState {
  /** Siempre 'recibir': guardar los pallets es la sección Guardar (se mantiene por compatibilidad). */
  step: 'recibir' | 'ubicar'
  lines: DraftLine[]
  observations: string
  photos: string[]
  signature: string | null
  /** La recepción recién confirmada (paso "ubicar"). */
  confirmed: ReceptionDetail | null

  addLine: (line: Omit<DraftLine, 'key'>) => void
  removeLine: (key: string) => void
  setObservations: (v: string) => void
  setPhotos: (v: string[]) => void
  setSignature: (v: string | null) => void
  /** Deja la recepción confirmada y pasa a ubicar los pallets. */
  confirm: (reception: ReceptionDetail) => void
  /** Vuelve a un borrador en blanco. */
  reset: () => void
}

const BLANK = { step: 'recibir' as const, lines: [], observations: '', photos: [], signature: null, confirmed: null }

/**
 * Borrador de la recepción en curso. Se guardan las líneas y las observaciones para
 * no perder lo cargado si se cierra la pestaña; las fotos y la firma pesan y se piden de nuevo.
 */
export const useReception = create<ReceptionState>()(
  persist(
    (set) => ({
      ...BLANK,
      addLine: (line) => set((s) => ({ lines: [...s.lines, { ...line, key: crypto.randomUUID() }] })),
      removeLine: (key) => set((s) => ({ lines: s.lines.filter((l) => l.key !== key) })),
      setObservations: (observations) => set({ observations }),
      setPhotos: (photos) => set({ photos }),
      setSignature: (signature) => set({ signature }),
      confirm: (confirmed) => set({ step: 'recibir', confirmed, lines: [], observations: '', photos: [], signature: null }),
      reset: () => set({ ...BLANK }),
    }),
    {
      name: 'recepcion-borrador-v1',
      partialize: (s) => ({ lines: s.lines, observations: s.observations }),
    },
  ),
)

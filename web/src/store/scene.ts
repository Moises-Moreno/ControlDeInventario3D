import { create } from 'zustand'
import type { PalletBuild } from '@/domain/pallet'

/** Un pallet que se muestra en el 3D sin ser el del armador (p. ej. el de una recepción). */
export interface ScenePreview {
  build: PalletBuild
  color: string
  /** Texto de la etiqueta de la escena (p. ej. "Pallet 3 de 7 · completo"). */
  title: string
  subtitle: string
}

interface SceneState {
  /** Cambia cada vez que se pide reencuadrar la cámara ("Vista inicial"). */
  frameNonce: number
  requestFrame: () => void
  /** Si hay una vista previa, el armador 3D la muestra en lugar del pallet del armador. */
  preview: ScenePreview | null
  setPreview: (p: ScenePreview | null) => void
}

export const useScene = create<SceneState>((set) => ({
  frameNonce: 0,
  requestFrame: () => set((s) => ({ frameNonce: s.frameNonce + 1 })),
  preview: null,
  setPreview: (preview) => set({ preview }),
}))

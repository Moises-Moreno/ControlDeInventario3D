import { create } from 'zustand'

interface SceneState {
  /** Cambia cada vez que se pide reencuadrar la cámara ("Vista inicial"). */
  frameNonce: number
  requestFrame: () => void
}

export const useScene = create<SceneState>((set) => ({
  frameNonce: 0,
  requestFrame: () => set((s) => ({ frameNonce: s.frameNonce + 1 })),
}))

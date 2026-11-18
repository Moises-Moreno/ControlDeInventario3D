import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** Límites del tamaño de la escena (vista apilada) y del panel (vista lateral). */
export const SCENE_FRACTION = { min: 0.22, max: 0.75, default: 0.42 }
export const PANEL_WIDTH = { min: 340, max: 640, default: 420 }

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

interface LayoutState {
  /** Fracción de alto que ocupa la escena en teléfono/tablet vertical. */
  sceneFraction: number
  /** Ancho del panel en laptop/tablet horizontal (px). */
  panelWidth: number
  /** Escena a pantalla completa (oculta el panel). */
  sceneFull: boolean
  setSceneFraction: (f: number) => void
  setPanelWidth: (w: number) => void
  toggleSceneFull: () => void
  setSceneFull: (v: boolean) => void
}

export const useLayout = create<LayoutState>()(
  persist(
    (set) => ({
      sceneFraction: SCENE_FRACTION.default,
      panelWidth: PANEL_WIDTH.default,
      sceneFull: false,
      setSceneFraction: (f) => set({ sceneFraction: clamp(f, SCENE_FRACTION.min, SCENE_FRACTION.max) }),
      setPanelWidth: (w) => set({ panelWidth: clamp(Math.round(w), PANEL_WIDTH.min, PANEL_WIDTH.max) }),
      toggleSceneFull: () => set((s) => ({ sceneFull: !s.sceneFull })),
      setSceneFull: (v) => set({ sceneFull: v }),
    }),
    {
      name: 'layout-v1',
      // La pantalla completa no se recuerda entre sesiones.
      partialize: (s) => ({ sceneFraction: s.sceneFraction, panelWidth: s.panelWidth }),
    },
  ),
)

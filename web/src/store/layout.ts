import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** Límites del tamaño de la escena (vista apilada) y del panel (vista lateral). */
export const SCENE_FRACTION = { min: 0.22, max: 0.75, default: 0.42 }
export const PANEL_WIDTH = { min: 340, max: 640, default: 420 }

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** Qué se muestra en 3D (solo a pedido): el almacén o el pallet que se está armando. */
export type View3D = 'almacen' | 'pallet'

interface LayoutState {
  /** 3D abierto a pedido, o null: lo principal es el plano 2D. */
  view3d: View3D | null
  open3d: (kind: View3D) => void
  close3d: () => void
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
      view3d: null,
      open3d: (kind) => set({ view3d: kind }),
      close3d: () => set({ view3d: null, sceneFull: false }),
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

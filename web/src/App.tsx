import { useIsDesktop } from '@/hooks/useMediaQuery'
import { DesktopLayout } from '@/components/layout/DesktopLayout'
import { StackedLayout } from '@/components/layout/StackedLayout'

/**
 * Elige un único layout según el ancho (así se monta una sola escena 3D):
 * - < 1024 px (teléfono, tablet vertical): escena arriba, panel abajo, navegación inferior.
 * - ≥ 1024 px (laptop, tablet horizontal): barra lateral de íconos, panel y escena.
 */
export default function App() {
  const isDesktop = useIsDesktop()
  return isDesktop ? <DesktopLayout /> : <StackedLayout />
}

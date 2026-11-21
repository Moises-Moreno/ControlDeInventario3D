import { ReceptionPanel } from '@/components/ReceptionPanel'
import { AlmacenPanel, GuardarPanel, RetirarPanel } from '@/components/TaskPanels'
import { MasPanel } from '@/components/MasPanel'
import { useUi } from '@/store/ui'

/** Contenido del panel según la tarea activa. */
export function TabContent() {
  const tab = useUi((s) => s.tab)
  switch (tab) {
    case 'almacen':
      return <AlmacenPanel />
    case 'recibir':
      return <ReceptionPanel />
    case 'guardar':
      return <GuardarPanel />
    case 'retirar':
      return <RetirarPanel />
    case 'mas':
      return <MasPanel />
  }
}

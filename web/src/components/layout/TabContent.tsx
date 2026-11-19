import { ReceptionPanel } from '@/components/ReceptionPanel'
import { BuilderPanel } from '@/components/BuilderPanel'
import { ProductsPanel } from '@/components/ProductsPanel'
import { WarehousePanel } from '@/components/WarehousePanel'
import { ResumenPanel } from '@/components/ResumenPanel'
import { HistorialPanel } from '@/components/HistorialPanel'
import { useUi } from '@/store/ui'

/** Contenido del panel según la sección activa. */
export function TabContent() {
  const tab = useUi((s) => s.tab)
  switch (tab) {
    case 'recepcion':
      return <ReceptionPanel />
    case 'armar':
      return <BuilderPanel />
    case 'productos':
      return <ProductsPanel />
    case 'almacen':
      return <WarehousePanel />
    case 'resumen':
      return <ResumenPanel />
    case 'historial':
      return <HistorialPanel />
  }
}

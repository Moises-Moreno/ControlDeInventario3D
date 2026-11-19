import { ChartColumn, History, Package, PackagePlus, Tags, Warehouse, type LucideIcon } from 'lucide-react'
import type { Tab } from '@/store/ui'

export interface NavItem {
  id: Tab
  /** Etiqueta corta para la barra de navegación. */
  label: string
  /** Título del panel. */
  title: string
  /** Descripción breve bajo el título. */
  description: string
  icon: LucideIcon
}

export const NAV: NavItem[] = [
  { id: 'recepcion', label: 'Recepción', title: 'Recepción', description: 'Recibí mercadería y ubicá los pallets', icon: PackagePlus },
  { id: 'armar', label: 'Armar', title: 'Armar pallet', description: 'Armá y recontá pallets', icon: Package },
  { id: 'productos', label: 'Productos', title: 'Productos', description: 'Catálogo y stock', icon: Tags },
  { id: 'almacen', label: 'Almacén', title: 'Almacén', description: 'Racks y ubicaciones', icon: Warehouse },
  { id: 'resumen', label: 'Resumen', title: 'Resumen', description: 'Indicadores y datos', icon: ChartColumn },
  { id: 'historial', label: 'Historial', title: 'Historial', description: 'Movimientos registrados', icon: History },
]

export function navItem(id: Tab): NavItem {
  return NAV.find((n) => n.id === id) ?? NAV[0]
}

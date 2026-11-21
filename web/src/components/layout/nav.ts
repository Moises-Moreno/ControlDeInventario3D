import { ArrowDownToLine, ArrowUpFromLine, Menu, PackagePlus, Warehouse, type LucideIcon } from 'lucide-react'
import type { MasSection, Tab } from '@/store/ui'

export interface NavItem {
  id: Tab
  /** Etiqueta corta para la barra de navegación. */
  label: string
  /** Título del panel. */
  title: string
  /** Descripción breve bajo el título. */
  description: string
  icon: LucideIcon
  /** Solo para el admin (el operador ve solo lo operativo). */
  adminOnly?: boolean
}

/** Navegación por tareas: lo que hace el operador en el depósito. */
export const NAV: NavItem[] = [
  { id: 'almacen', label: 'Almacén', title: 'Almacén', description: 'Plano y tareas pendientes', icon: Warehouse },
  { id: 'recibir', label: 'Recibir', title: 'Recibir', description: 'Cargá la mercadería que llega', icon: PackagePlus },
  { id: 'guardar', label: 'Guardar', title: 'Guardar', description: 'Llevá los pallets a su lugar', icon: ArrowDownToLine },
  { id: 'retirar', label: 'Retirar', title: 'Retirar', description: 'Buscá productos y la ruta más corta', icon: ArrowUpFromLine },
  { id: 'mas', label: 'Más', title: 'Más', description: 'Productos, informes y configuración', icon: Menu, adminOnly: true },
]

export const MAS_SECTIONS: { id: MasSection; label: string }[] = [
  { id: 'productos', label: 'Productos' },
  { id: 'recepciones', label: 'Recepciones' },
  { id: 'armar', label: 'Armar pallet' },
  { id: 'resumen', label: 'Resumen' },
  { id: 'historial', label: 'Historial' },
  { id: 'admin', label: 'Racks y categorías' },
]

/** Lo que ve cada rol en la barra de navegación. */
export function navFor(isAdmin: boolean): NavItem[] {
  return NAV.filter((n) => isAdmin || !n.adminOnly)
}

export function navItem(id: Tab): NavItem {
  return NAV.find((n) => n.id === id) ?? NAV[0]
}

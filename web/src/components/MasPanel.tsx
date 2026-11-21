import { ArrowLeft } from 'lucide-react'
import { useUi } from '@/store/ui'
import { useAuth } from '@/store/auth'
import { ProductsPanel } from '@/components/ProductsPanel'
import { BuilderPanel } from '@/components/BuilderPanel'
import { ResumenPanel } from '@/components/ResumenPanel'
import { HistorialPanel } from '@/components/HistorialPanel'
import { AdminPanel } from '@/components/AdminPanel'
import { RecentReceptions } from '@/components/ReceptionPanel'
import { MAS_SECTIONS } from '@/components/layout/nav'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * "Más": productos, informes y configuración, para el admin. El operador solo llega acá
 * para dar de alta un producto que no existe mientras recibe mercadería.
 */
export function MasPanel() {
  const section = useUi((s) => s.masSection)
  const openMas = useUi((s) => s.openMas)
  const setTab = useUi((s) => s.setTab)
  const isAdmin = useAuth((s) => s.user?.role) === 'admin'

  if (!isAdmin) {
    return (
      <div className="flex flex-col gap-4">
        <Button variant="outline" className="self-start" onClick={() => setTab('recibir')}>
          <ArrowLeft /> Volver a Recibir
        </Button>
        <ProductsPanel />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <nav aria-label="Secciones de Más" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {MAS_SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => openMas(s.id)}
            aria-current={section === s.id ? 'page' : undefined}
            className={cn(
              'h-10 shrink-0 rounded-full border px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              section === s.id ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card hover:bg-secondary',
            )}
          >
            {s.label}
          </button>
        ))}
      </nav>
      {section === 'productos' && <ProductsPanel />}
      {section === 'recepciones' && <RecentReceptions />}
      {section === 'armar' && <BuilderPanel />}
      {section === 'resumen' && <ResumenPanel />}
      {section === 'historial' && <HistorialPanel />}
      {section === 'admin' && <AdminPanel />}
    </div>
  )
}

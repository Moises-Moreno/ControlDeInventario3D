import { Boxes } from 'lucide-react'
import { useUi } from '@/store/ui'
import { useLayout } from '@/store/layout'
import { navItem } from './nav'
import { BottomNav } from './BottomNav'
import { LogoutButton, ThemeToggle, UserBadge } from './HeaderActions'
import { Stage3D } from './Stage3D'
import { TabContent } from './TabContent'

/**
 * Teléfono y tablet vertical: el panel usa toda la pantalla (el plano 2D va dentro de cada
 * sección) y el 3D se abre a pantalla completa solo cuando se pide.
 */
export function StackedLayout() {
  const tab = useUi((s) => s.tab)
  const view3d = useLayout((s) => s.view3d)
  const item = navItem(tab)

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      <header className="shrink-0 border-b border-border bg-card pt-[env(safe-area-inset-top)]">
        <div className="flex h-14 items-center gap-3 px-3 sm:px-4">
          <Boxes className="size-6 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0 flex-1 leading-tight">
            <span className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Inventario</span>
            <h1 className="truncate text-base font-bold">{item.title}</h1>
          </div>
          <UserBadge className="hidden sm:flex" />
          <ThemeToggle />
          <LogoutButton />
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
        <div className="mx-auto w-full max-w-2xl">
          <TabContent />
        </div>
      </main>

      <BottomNav />

      {view3d && (
        <section aria-label="Vista 3D" className="fixed inset-0 z-40 bg-background pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
          <Stage3D kind={view3d} compact />
        </section>
      )}
    </div>
  )
}

import { useRef } from 'react'
import { Boxes } from 'lucide-react'
import { useUi } from '@/store/ui'
import { SCENE_FRACTION, useLayout } from '@/store/layout'
import { navItem } from './nav'
import { BottomNav } from './BottomNav'
import { LogoutButton, ThemeToggle, UserBadge } from './HeaderActions'
import { SceneStage } from './SceneStage'
import { Splitter } from './Splitter'
import { TabContent } from './TabContent'

/** Teléfono y tablet vertical: escena arriba (ajustable), panel debajo y navegación inferior. */
export function StackedLayout() {
  const tab = useUi((s) => s.tab)
  const sceneFraction = useLayout((s) => s.sceneFraction)
  const setSceneFraction = useLayout((s) => s.setSceneFraction)
  const sceneFull = useLayout((s) => s.sceneFull)
  const regionRef = useRef<HTMLDivElement>(null)
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

      <div ref={regionRef} className="flex min-h-0 flex-1 flex-col">
        <section
          aria-label="Vista 3D"
          className="relative min-h-0"
          style={{ flex: sceneFull ? '1 1 auto' : `0 0 ${sceneFraction * 100}%` }}
        >
          <SceneStage compact />
        </section>

        {!sceneFull && (
          <>
            <Splitter
              orientation="horizontal"
              label="Ajustar el tamaño de la vista 3D"
              valueNow={Math.round(sceneFraction * 100)}
              valueMin={Math.round(SCENE_FRACTION.min * 100)}
              valueMax={Math.round(SCENE_FRACTION.max * 100)}
              onDrag={(_x, y) => {
                const r = regionRef.current?.getBoundingClientRect()
                if (r && r.height > 0) setSceneFraction((y - r.top) / r.height)
              }}
              onStep={(d) => setSceneFraction(sceneFraction + d * 0.05)}
              onReset={() => setSceneFraction(SCENE_FRACTION.default)}
            />
            <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
              <div className="mx-auto w-full max-w-2xl">
                <TabContent />
              </div>
            </main>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  )
}

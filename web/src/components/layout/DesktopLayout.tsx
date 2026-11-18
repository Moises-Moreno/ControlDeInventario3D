import { useRef } from 'react'
import { useUi } from '@/store/ui'
import { PANEL_WIDTH, useLayout } from '@/store/layout'
import { navItem } from './nav'
import { SideRail } from './SideRail'
import { SceneStage } from './SceneStage'
import { Splitter } from './Splitter'
import { TabContent } from './TabContent'

/** Laptop y tablet horizontal: barra de íconos, panel redimensionable y escena grande. */
export function DesktopLayout() {
  const tab = useUi((s) => s.tab)
  const panelWidth = useLayout((s) => s.panelWidth)
  const setPanelWidth = useLayout((s) => s.setPanelWidth)
  const sceneFull = useLayout((s) => s.sceneFull)
  const rowRef = useRef<HTMLDivElement>(null)
  const item = navItem(tab)

  return (
    <div className="flex h-dvh overflow-hidden bg-background pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      <SideRail />

      <div ref={rowRef} className="flex min-w-0 flex-1">
        {!sceneFull && (
          <>
            <aside
              aria-label={item.title}
              className="flex min-h-0 shrink-0 flex-col bg-card"
              style={{ width: panelWidth, maxWidth: '60%' }}
            >
              <header className="shrink-0 border-b border-border px-5 py-4">
                <h1 className="text-xl font-bold tracking-tight">{item.title}</h1>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </header>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5">
                <TabContent />
              </div>
            </aside>
            <Splitter
              orientation="vertical"
              label="Ajustar el ancho del panel"
              valueNow={panelWidth}
              valueMin={PANEL_WIDTH.min}
              valueMax={PANEL_WIDTH.max}
              onDrag={(x) => {
                const r = rowRef.current?.getBoundingClientRect()
                if (r) setPanelWidth(Math.min(x - r.left, r.width * 0.6))
              }}
              onStep={(d) => setPanelWidth(panelWidth + d * 24)}
              onReset={() => setPanelWidth(PANEL_WIDTH.default)}
            />
          </>
        )}

        <main aria-label="Vista 3D" className="relative min-w-0 flex-1">
          <SceneStage />
        </main>
      </div>
    </div>
  )
}

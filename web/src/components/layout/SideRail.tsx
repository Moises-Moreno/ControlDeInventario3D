import { Boxes } from 'lucide-react'
import { useUi } from '@/store/ui'
import { cn } from '@/lib/utils'
import { NAV } from './nav'
import { LogoutButton, ThemeToggle, UserBadge } from './HeaderActions'

/** Barra lateral de íconos para laptop y tablet horizontal. */
export function SideRail() {
  const tab = useUi((s) => s.tab)
  const setTab = useUi((s) => s.setTab)

  return (
    <nav
      aria-label="Secciones"
      className="flex h-full w-[5.5rem] shrink-0 flex-col items-center gap-1 overflow-y-auto border-r border-border bg-card py-3"
    >
      <div className="mb-3 flex flex-col items-center gap-1" title="Inventario de almacén">
        <Boxes className="size-7 text-primary" aria-hidden />
        <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Inventario</span>
      </div>

      <ul className="flex w-full flex-col items-center gap-1 px-2">
        {NAV.map(({ id, label, icon: Icon }) => {
          const active = tab === id
          return (
            <li key={id} className="w-full">
              <button
                type="button"
                onClick={() => setTab(id)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex w-full flex-col items-center gap-1 rounded-xl py-2.5 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  active ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                )}
              >
                <Icon className="size-5" aria-hidden />
                {label}
              </button>
            </li>
          )
        })}
      </ul>

      <div className="mt-auto flex w-full flex-col items-center gap-2 px-2 pt-3">
        <UserBadge layout="column" className="w-full" />
        <ThemeToggle />
        <LogoutButton />
      </div>
    </nav>
  )
}

import { useUi } from '@/store/ui'
import { cn } from '@/lib/utils'
import { useAuth } from '@/store/auth'
import { navFor } from './nav'

/** Navegación inferior para teléfono y tablet vertical: al alcance del pulgar. */
export function BottomNav() {
  const tab = useUi((s) => s.tab)
  const setTab = useUi((s) => s.setTab)
  const items = navFor(useAuth((s) => s.user?.role) === 'admin')

  return (
    <nav
      aria-label="Secciones"
      className="shrink-0 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="mx-auto grid max-w-2xl" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map(({ id, label, icon: Icon }) => {
          const active = tab === id
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => setTab(id)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-16 w-full flex-col items-center justify-center gap-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                  active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <span
                  className={cn(
                    'flex h-8 w-12 items-center justify-center rounded-full transition-colors',
                    active && 'bg-primary/15',
                  )}
                >
                  <Icon className="size-5" aria-hidden />
                </span>
                {label}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

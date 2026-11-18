import { LogOut, Moon, Sun } from 'lucide-react'
import { useTheme } from '@/store/theme'
import { useAuth } from '@/store/auth'
import { cn } from '@/lib/utils'

/** Botón cuadrado de 44 px (objetivo táctil mínimo). */
const ICON_BUTTON =
  'flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function ThemeToggle({ className }: { className?: string }) {
  const theme = useTheme((s) => s.theme)
  const toggle = useTheme((s) => s.toggle)
  const label = theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'
  return (
    <button type="button" onClick={toggle} aria-label={label} title={label} className={cn(ICON_BUTTON, className)}>
      {theme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </button>
  )
}

export function LogoutButton({ className }: { className?: string }) {
  const logout = useAuth((s) => s.logout)
  return (
    <button type="button" onClick={logout} aria-label="Cerrar sesión" title="Cerrar sesión" className={cn(ICON_BUTTON, className)}>
      <LogOut className="size-5" />
    </button>
  )
}

/** Inicial del usuario en un círculo, con nombre y rol opcionales al lado o debajo. */
export function UserBadge({ layout = 'row', className }: { layout?: 'row' | 'column'; className?: string }) {
  const user = useAuth((s) => s.user)
  if (!user) return null
  const initial = user.username.charAt(0).toUpperCase()
  return (
    <div
      className={cn('flex min-w-0 items-center gap-2', layout === 'column' && 'flex-col gap-1 text-center', className)}
      aria-label={`Sesión de ${user.username} (${user.role})`}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
        {initial}
      </span>
      <span className={cn('min-w-0 leading-tight', layout === 'column' && 'w-full')}>
        <span className="block truncate text-xs font-semibold">{user.username}</span>
        <span className="block truncate text-[10px] uppercase tracking-wide text-muted-foreground">{user.role}</span>
      </span>
    </div>
  )
}

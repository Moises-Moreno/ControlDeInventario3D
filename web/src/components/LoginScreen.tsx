import { useState } from 'react'
import { Boxes, LogIn } from 'lucide-react'
import { useAuth } from '@/store/auth'

export function LoginScreen() {
  const login = useAuth((s) => s.login)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const res = await login(username, password)
    setBusy(false)
    if (!res.ok) setError(res.error)
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="flex w-full max-w-sm flex-col gap-6 rounded-xl border border-border bg-card p-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <Boxes className="size-9 text-primary" />
          <h1 className="text-2xl font-bold uppercase tracking-tight">Inventario de almacén</h1>
          <p className="text-sm text-muted-foreground">Iniciá sesión para continuar.</p>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Usuario</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
              className="h-10 rounded-md border border-border bg-secondary px-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Contraseña</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="h-10 rounded-md border border-border bg-secondary px-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>

          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="flex h-10 items-center justify-center gap-2 rounded-md bg-primary font-semibold text-primary-foreground hover:brightness-110 disabled:opacity-50"
          >
            <LogIn className="size-4" />
            {busy ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          Demo: <b>admin / admin123</b> (admin) · <b>operador / operador123</b> (operador)
        </p>
      </div>
    </div>
  )
}

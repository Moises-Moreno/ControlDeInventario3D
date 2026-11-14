import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ApiError } from '@/api/client'
import { authApi, type AuthUser } from '@/api/auth'
import { setToken, onUnauthorized } from '@/api/token'

type Result = { ok: true } | { ok: false; error: string }

interface AuthState {
  token: string | null
  user: AuthUser | null
  login: (username: string, password: string) => Promise<Result>
  logout: () => void
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      login: async (username, password) => {
        try {
          const res = await authApi.login({ username, password })
          setToken(res.token)
          set({ token: res.token, user: res.user })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: e instanceof ApiError ? e.message : 'No se pudo iniciar sesión.' }
        }
      },
      logout: () => {
        setToken(null)
        set({ token: null, user: null })
      },
    }),
    {
      name: 'auth-v1',
      onRehydrateStorage: () => (state) => {
        setToken(state?.token ?? null)
      },
    },
  ),
)

// Al recibir un 401, el cliente cierra la sesión.
onUnauthorized.handler = () => useAuth.getState().logout()

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/queryClient'
import { useAuth } from '@/store/auth'
import { LoginScreen } from '@/components/LoginScreen'
import './index.css'
import App from './App.tsx'

function Root() {
  const token = useAuth((s) => s.token)
  const user = useAuth((s) => s.user)
  return token && user ? <App /> : <LoginScreen />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Root />
    </QueryClientProvider>
  </StrictMode>,
)

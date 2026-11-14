import { QueryClient } from '@tanstack/react-query'

/** Cliente de TanStack Query. El estado del servidor vive acá; Zustand queda para el estado de UI. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

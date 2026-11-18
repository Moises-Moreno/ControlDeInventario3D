import { useSyncExternalStore } from 'react'

/** `true` mientras la media query se cumpla. Reacciona a cambios de tamaño/orientación. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window === 'undefined' || !window.matchMedia) return () => {}
      const mq = window.matchMedia(query)
      mq.addEventListener('change', onChange)
      return () => mq.removeEventListener('change', onChange)
    },
    () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false),
    () => false,
  )
}

/** Laptop y tablet horizontal (≥ 1024 px): barra lateral + panel + escena. */
export const DESKTOP_QUERY = '(min-width: 1024px)'

export function useIsDesktop(): boolean {
  return useMediaQuery(DESKTOP_QUERY)
}

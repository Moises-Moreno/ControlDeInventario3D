import { lazy, Suspense } from 'react'
import type { View3D } from '@/store/layout'

// three + R3F + drei pesan mucho: se descargan recién cuando alguien abre el 3D.
const SceneStage = lazy(() => import('./SceneStage').then((m) => ({ default: m.SceneStage })))

/** Vista 3D a pedido (almacén o pallet), con carga diferida. */
export function Stage3D({ kind, compact = false }: { kind: View3D; compact?: boolean }) {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center bg-gradient-to-b from-secondary to-background text-sm text-muted-foreground">
          Cargando la vista 3D…
        </div>
      }
    >
      <SceneStage kind={kind} compact={compact} />
    </Suspense>
  )
}

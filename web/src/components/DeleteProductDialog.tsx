import { useEffect, useState } from 'react'
import { AlertTriangle, EyeOff, Trash2 } from 'lucide-react'
import { inventoryApi, type ProductUsage } from '@/api/inventory'
import { ApiError } from '@/api/client'
import type { Product } from '@/domain/inventory'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface Props {
  product: Product | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Elimina el producto con todos sus registros. */
  onDelete: () => Promise<void>
  /** Alternativa: desactivarlo y conservar el historial. */
  onDeactivate: () => Promise<void>
}

/**
 * Confirmación para eliminar un producto (solo admin). Muestra qué se va a borrar y
 * pide escribir el código del producto, porque no se puede deshacer.
 */
export function DeleteProductDialog({ product, open, onOpenChange, onDelete, onDeactivate }: Props) {
  const [usage, setUsage] = useState<ProductUsage | null>(null)
  const [error, setError] = useState('')
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open || !product) return
    setUsage(null)
    setError('')
    setTyped('')
    let alive = true
    inventoryApi
      .productUsage(product.id)
      .then((u) => alive && setUsage(u))
      .catch((e) => alive && setError(e instanceof ApiError ? e.message : 'No se pudo consultar el producto.'))
    return () => {
      alive = false
    }
  }, [open, product])

  if (!product) return null
  const hasRecords = !!usage && (usage.pallets > 0 || usage.receptionLines > 0)
  const matches = typed.trim().toUpperCase() === product.code.toUpperCase()

  async function run(action: () => Promise<void>) {
    setBusy(true)
    try {
      await action()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-5" /> Eliminar {product.code}
          </DialogTitle>
          <DialogDescription>
            {product.name}. Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>

        {!usage && !error && <p className="text-sm text-muted-foreground">Revisando sus registros…</p>}
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        {usage && (
          <div className="flex flex-col gap-3 text-sm">
            {hasRecords ? (
              <>
                <p>Se van a borrar también todos sus registros:</p>
                <ul className="flex flex-col gap-1 rounded-xl bg-secondary p-3">
                  <li>
                    <b>{usage.pallets}</b> {usage.pallets === 1 ? 'pallet' : 'pallets'}
                    {usage.palletsInRack > 0 && ` (${usage.palletsInRack} en el rack: se liberan sus posiciones)`}
                  </li>
                  <li>
                    <b>{usage.movements}</b> {usage.movements === 1 ? 'movimiento' : 'movimientos'} del historial
                  </li>
                  <li>
                    <b>{usage.receptionLines}</b> {usage.receptionLines === 1 ? 'línea' : 'líneas'} en {usage.receptions}{' '}
                    {usage.receptions === 1 ? 'recepción' : 'recepciones'} (si una recepción queda vacía, se borra con sus fotos)
                  </li>
                </ul>
                <p className="text-muted-foreground">
                  Si solo dejó de usarse, conviene <b>desactivarlo</b>: no aparece en búsquedas ni recepciones y se conserva el historial.
                </p>
              </>
            ) : (
              <p>No tiene pallets ni recepciones: se borra solo el producto.</p>
            )}

            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">
                Para confirmar, escribí el código <b className="text-foreground">{product.code}</b>
              </span>
              <input
                type="text"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoComplete="off"
                className="h-11 rounded-xl border border-border bg-secondary px-3 uppercase outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
          </div>
        )}

        <DialogFooter className="sm:flex-col-reverse sm:justify-start [&>button]:w-full">
          {product.active && (
            <Button variant="outline" disabled={busy} onClick={() => run(onDeactivate)}>
              <EyeOff /> Desactivar en su lugar
            </Button>
          )}
          <Button variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="destructive" disabled={!usage || !matches || busy} onClick={() => run(onDelete)}>
            <Trash2 /> {busy ? 'Eliminando…' : hasRecords ? 'Eliminar todo' : 'Eliminar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

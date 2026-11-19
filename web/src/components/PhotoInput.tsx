import { useRef, useState } from 'react'
import { Camera, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { imageToDataUrl } from '@/lib/image'
import { cn } from '@/lib/utils'

interface Props {
  photos: string[]
  onChange: (photos: string[]) => void
  /** Máximo de fotos (1 = una sola foto que se reemplaza). */
  max?: number
  label?: string
  /** Tamaño máximo del lado mayor al guardar. */
  maxSide?: number
  className?: string
}

/**
 * Agrega fotos desde la cámara (en teléfono y tablet abre la cámara trasera) o desde
 * un archivo (en laptop). Las imágenes se reducen antes de guardarse.
 */
export function PhotoInput({ photos, onChange, max = 8, label = 'Fotos', maxSide = 1280, className }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const single = max === 1

  async function add(files: FileList | null) {
    if (!files?.length) return
    setError('')
    setBusy(true)
    try {
      const next = single ? [] : [...photos]
      for (const file of Array.from(files)) {
        if (next.length >= max) break
        next.push(await imageToDataUrl(file, maxSide))
      }
      onChange(next)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo agregar la foto.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          {label}
          {!single && <span className="ml-1 font-normal">({photos.length}/{max})</span>}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy || (!single && photos.length >= max)}
          onClick={() => inputRef.current?.click()}
        >
          <Camera /> {single ? (photos.length ? 'Cambiar' : 'Tomar foto') : 'Agregar foto'}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple={!single}
          className="hidden"
          onChange={(e) => {
            void add(e.target.files)
            e.target.value = ''
          }}
        />
      </div>

      {photos.length > 0 && (
        <ul className={cn('grid gap-2', single ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3')}>
          {photos.map((src, i) => (
            <li key={i} className="relative overflow-hidden rounded-xl border border-border bg-secondary">
              <img src={src} alt={`${label} ${i + 1}`} className={cn('w-full object-cover', single ? 'h-40' : 'aspect-[4/3]')} />
              <button
                type="button"
                aria-label={`Quitar ${label.toLowerCase()} ${i + 1}`}
                onClick={() => onChange(photos.filter((_, k) => k !== i))}
                className="absolute top-1.5 right-1.5 flex size-9 items-center justify-center rounded-lg bg-black/60 text-white backdrop-blur hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { Camera, ScanLine, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  /** Se llama con el texto leído (por la pistola o por la cámara). */
  onScan: (text: string) => void
  placeholder?: string
}

/**
 * Entrada de escaneo con dos caminos al mismo `onScan`:
 *  - Pistola lectora USB/Bluetooth: se comporta como un teclado que escribe el código y
 *    pulsa Enter, así que alcanza con tener este campo enfocado.
 *  - Cámara del teléfono (necesita https o localhost, por una restricción del navegador).
 */
export function ScanInput({ onScan, placeholder = 'Escaneá una etiqueta o escribí el código' }: Props) {
  const [text, setText] = useState('')
  const [cameraOpen, setCameraOpen] = useState(false)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const value = text.trim()
    if (!value) return
    onScan(value)
    setText('')
  }

  return (
    <div className="flex flex-col gap-2">
      <form onSubmit={submit} className="flex items-center gap-2" noValidate>
        <div className="relative min-w-0 flex-1">
          <ScanLine className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={placeholder}
            aria-label="Código escaneado"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            className="h-12 w-full rounded-xl border border-border bg-secondary pr-3 pl-10 uppercase outline-none placeholder:normal-case focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <Button type="button" variant="outline" onClick={() => setCameraOpen((o) => !o)} aria-pressed={cameraOpen} className="h-12">
          {cameraOpen ? <X /> : <Camera />} {cameraOpen ? 'Cerrar' : 'Cámara'}
        </Button>
      </form>
      {cameraOpen && (
        <CameraScanner
          onResult={(value) => {
            setCameraOpen(false)
            onScan(value)
          }}
          onClose={() => setCameraOpen(false)}
        />
      )}
    </div>
  )
}

function CameraScanner({ onResult, onClose }: { onResult: (text: string) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState('')
  const onResultRef = useRef(onResult)
  onResultRef.current = onResult

  useEffect(() => {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError('La cámara solo funciona con https (o en localhost). Usá la pistola o escribí el código.')
      return
    }
    let stopped = false
    let controls: { stop: () => void } | undefined
    ;(async () => {
      try {
        // La librería se carga recién al abrir la cámara.
        const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([import('@zxing/browser'), import('@zxing/library')])
        const hints = new Map()
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.CODE_128, BarcodeFormat.QR_CODE])
        const reader = new BrowserMultiFormatReader(hints)
        controls = await reader.decodeFromConstraints({ video: { facingMode: 'environment' } }, video.current ?? undefined, (result, _err, c) => {
          if (result && !stopped) {
            stopped = true
            c.stop()
            navigator.vibrate?.(60)
            onResultRef.current(result.getText())
          }
        })
        if (stopped) controls.stop()
      } catch {
        setError('No se pudo abrir la cámara. Revisá el permiso del navegador.')
      }
    })()
    return () => {
      stopped = true
      controls?.stop()
    }
  }, [])

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-black p-2">
      {error ? (
        <p className="p-3 text-sm text-white" role="alert">
          {error}
        </p>
      ) : (
        <video ref={video} muted playsInline className="max-h-72 w-full rounded-lg object-cover" />
      )}
      <Button type="button" variant="outline" onClick={onClose}>
        Cerrar cámara
      </Button>
    </div>
  )
}

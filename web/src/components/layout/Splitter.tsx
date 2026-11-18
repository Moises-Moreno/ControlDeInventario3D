import { useRef } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  /**
   * `horizontal`: barra a lo ancho que se arrastra hacia arriba/abajo (vista apilada).
   * `vertical`: barra a lo alto que se arrastra a izquierda/derecha (vista lateral).
   */
  orientation: 'horizontal' | 'vertical'
  label: string
  valueNow: number
  valueMin: number
  valueMax: number
  /** Posición del puntero mientras se arrastra. */
  onDrag: (clientX: number, clientY: number) => void
  /** Paso con el teclado (−1 / +1). */
  onStep: (delta: number) => void
  /** Volver al tamaño por defecto (doble clic o Inicio). */
  onReset: () => void
}

/** Divisor arrastrable con mouse, dedo o teclado. */
export function Splitter({ orientation, label, valueNow, valueMin, valueMax, onDrag, onStep, onReset }: Props) {
  const dragging = useRef(false)
  const horizontal = orientation === 'horizontal'

  return (
    <div
      role="separator"
      aria-orientation={horizontal ? 'horizontal' : 'vertical'}
      aria-label={label}
      aria-valuenow={valueNow}
      aria-valuemin={valueMin}
      aria-valuemax={valueMax}
      tabIndex={0}
      title={label}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        dragging.current = true
      }}
      onPointerMove={(e) => {
        if (dragging.current) onDrag(e.clientX, e.clientY)
      }}
      onPointerUp={(e) => {
        dragging.current = false
        if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
      }}
      onPointerCancel={() => {
        dragging.current = false
      }}
      onDoubleClick={onReset}
      onKeyDown={(e) => {
        const dec = horizontal ? 'ArrowUp' : 'ArrowLeft'
        const inc = horizontal ? 'ArrowDown' : 'ArrowRight'
        if (e.key === dec) {
          e.preventDefault()
          onStep(-1)
        } else if (e.key === inc) {
          e.preventDefault()
          onStep(1)
        } else if (e.key === 'Home') {
          e.preventDefault()
          onReset()
        }
      }}
      className={cn(
        'group relative z-10 flex shrink-0 touch-none select-none items-center justify-center bg-card outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
        horizontal
          ? 'h-6 w-full cursor-row-resize border-y border-border'
          : // Visualmente fino, pero con zona táctil de 24 px gracias al pseudo-elemento.
            'h-full w-2 cursor-col-resize border-x border-border before:absolute before:inset-y-0 before:-inset-x-2 before:content-[""]',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'rounded-full bg-muted-foreground/40 transition-colors group-hover:bg-primary group-focus-visible:bg-primary',
          horizontal ? 'h-1.5 w-12' : 'h-12 w-1',
        )}
      />
    </div>
  )
}

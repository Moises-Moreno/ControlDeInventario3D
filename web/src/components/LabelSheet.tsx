import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Barcode } from '@/components/Barcode'
import { locCode, type Category, type Rack } from '@/domain/inventory'

export interface LabelData {
  /** Texto que lleva el código de barras (A-F001-N1, PAL-001). */
  code: string
  /** Línea grande debajo del código. */
  title?: string
  /** Detalle chico. */
  lines?: string[]
  /** Color de la categoría o del producto (franja lateral). */
  color?: string
}

/**
 * Hoja de etiquetas para imprimir. Se dibuja fuera de la pantalla normal (solo se ve al
 * imprimir) y `printLabels()` abre el diálogo de impresión del navegador.
 */
export function LabelSheet({ labels }: { labels: LabelData[] }) {
  if (!labels.length) return null
  return createPortal(
    <div className="print-only label-sheet" aria-hidden>
      {labels.map((l) => (
        <div key={l.code} className="label" style={{ borderLeftColor: l.color ?? '#000' }}>
          <Barcode value={l.code} height={46} className="label-bars" />
          <div className="label-code">{l.code}</div>
          {l.title && <div className="label-title">{l.title}</div>}
          {l.lines?.map((line) => (
            <div key={line} className="label-line">
              {line}
            </div>
          ))}
        </div>
      ))}
    </div>,
    document.body,
  )
}

/** Imprime solo la hoja de etiquetas (oculta el resto de la app mientras tanto). */
export function printLabels() {
  document.body.classList.add('printing-labels')
  const done = () => {
    document.body.classList.remove('printing-labels')
    window.removeEventListener('afterprint', done)
  }
  window.addEventListener('afterprint', done)
  // Deja que el navegador pinte los códigos antes de abrir la impresión.
  requestAnimationFrame(() => window.print())
}

/** Etiquetas de todas las posiciones (fila × nivel) de los racks indicados. */
export function locLabels(racks: Rack[], categories: Category[]): LabelData[] {
  const out: LabelData[] = []
  for (const rack of racks) {
    const category = categories.find((c) => c.id === rack.categoryId)
    for (let pos = 1; pos <= rack.positions; pos++) {
      for (let level = 1; level <= rack.levels; level++) {
        out.push({
          code: locCode(rack, { rackId: rack.id, level, pos }),
          title: `Rack ${rack.name} · Fila ${String(pos).padStart(3, '0')} · Nivel ${level}`,
          lines: category ? [category.name] : undefined,
          color: category?.color,
        })
      }
    }
  }
  return out
}

/** Estado + hoja para imprimir etiquetas desde cualquier pantalla: `print(labels)` y renderizar `sheet`. */
export function usePrintLabels() {
  const [labels, setLabels] = useState<LabelData[]>([])
  useEffect(() => {
    if (labels.length) printLabels()
  }, [labels])
  return { print: (l: LabelData[]) => setLabels([...l]), sheet: <LabelSheet labels={labels} /> }
}

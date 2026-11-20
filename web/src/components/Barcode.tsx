import { useEffect, useRef } from 'react'
import JsBarcode from 'jsbarcode'

/**
 * Código de barras Code128 (el que leen casi todas las pistolas) como SVG.
 * Los códigos del sistema (A-F001-N1, PAL-001) solo usan letras, números y guion.
 */
export function Barcode({ value, height = 44, className }: { value: string; height?: number; className?: string }) {
  const ref = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!ref.current) return
    try {
      JsBarcode(ref.current, value, {
        format: 'CODE128',
        displayValue: false,
        height,
        width: 2,
        margin: 0,
        background: '#ffffff',
        lineColor: '#000000',
      })
    } catch {
      // Un valor que Code128 no puede codificar queda sin dibujar.
    }
  }, [value, height])

  return <svg ref={ref} role="img" aria-label={`Código de barras ${value}`} className={className} />
}

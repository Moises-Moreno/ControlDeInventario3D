const pad = (n: number, width: number) => String(n).padStart(width, '0');

/** Código correlativo de pallet, p. ej. PAL-007. */
export function palCode(n: number): string {
  return 'PAL-' + pad(n, 3);
}

/** Código correlativo de recepción, p. ej. REC-0012. */
export function recCode(n: number): string {
  return 'REC-' + pad(n, 4);
}

/** Código de una posición: rack A, fila 3, nivel 1 → A-F003-N1. */
export function locCode(rackName: string, level: number, pos: number): string {
  return `${rackName}-F${pad(pos, 3)}-N${level}`;
}

/** Código correlativo de pallet, p. ej. PAL-007. */
export function palCode(n: number): string {
  return 'PAL-' + String(n).padStart(3, '0');
}

/** Código de una posición, p. ej. A-N2-P3. */
export function locCode(rackName: string, level: number, pos: number): string {
  return `${rackName}-N${level}-P${pos}`;
}

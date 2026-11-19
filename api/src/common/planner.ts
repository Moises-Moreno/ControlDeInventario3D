/** Cómo viene un producto y cómo se arma su pallet completo. */
export interface PresentationLike {
  /** Contenido de cada envase en la unidad del producto (5 → 5 L). */
  contentPerUnit: number;
  /** Envases por caja. */
  unitsPerBox: number;
  front: number;
  depth: number;
  levels: number;
}

export interface PlannedPallet {
  front: number;
  depth: number;
  rows: number;
  loose: number;
  boxes: number;
  kind: 'completo' | 'mermado';
}

export interface ReceptionPlan {
  /** Envases recibidos (enteros). */
  units: number;
  boxes: number;
  /** Envases que sobran y no completan una caja. */
  leftoverUnits: number;
  boxesPerPallet: number;
  fullPallets: number;
  partialPallets: number;
  pallets: PlannedPallet[];
}

const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

export function boxesPerPallet(p: Pick<PresentationLike, 'front' | 'depth' | 'levels'>): number {
  return p.front * p.depth * p.levels;
}

/**
 * Convierte una cantidad (p. ej. 5000 L) en envases, cajas y pallets:
 * los pallets completos primero y, si sobra, un pallet mermado.
 */
export function planReception(quantity: number, p: PresentationLike): ReceptionPlan {
  const content = p.contentPerUnit > 0 ? p.contentPerUnit : 1;
  const units = Math.max(0, Math.floor(round6(quantity / content)));
  const boxes = Math.floor(units / p.unitsPerBox);
  const leftoverUnits = units - boxes * p.unitsPerBox;
  const capacity = boxesPerPallet(p);
  const base = p.front * p.depth;

  const fullPallets = Math.floor(boxes / capacity);
  const remainder = boxes - fullPallets * capacity;

  const pallets: PlannedPallet[] = [];
  for (let i = 0; i < fullPallets; i++) {
    pallets.push({ front: p.front, depth: p.depth, rows: p.levels, loose: 0, boxes: capacity, kind: 'completo' });
  }
  if (remainder > 0) {
    pallets.push({
      front: p.front,
      depth: p.depth,
      rows: Math.floor(remainder / base),
      loose: remainder % base,
      boxes: remainder,
      kind: 'mermado',
    });
  }

  return {
    units,
    boxes,
    leftoverUnits,
    boxesPerPallet: capacity,
    fullPallets,
    partialPallets: remainder > 0 ? 1 : 0,
    pallets,
  };
}

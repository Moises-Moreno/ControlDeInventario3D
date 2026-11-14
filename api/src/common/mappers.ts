import type { Pallet as PrismaPallet } from '@prisma/client';

export interface ApiLoc {
  rackId: number;
  level: number;
  pos: number;
}

export interface ApiPallet {
  id: number;
  pal: string;
  productId: number;
  front: number;
  depth: number;
  rows: number;
  loose: number;
  lote: string;
  vence: string;
  loc: ApiLoc | null;
}

/** Convierte un pallet de Prisma a la forma que consume el frontend (pal + loc anidada). */
export function toApiPallet(p: PrismaPallet): ApiPallet {
  const placed = p.rackId != null && p.level != null && p.pos != null;
  return {
    id: p.id,
    pal: p.code ?? '',
    productId: p.productId,
    front: p.front,
    depth: p.depth,
    rows: p.rows,
    loose: p.loose,
    lote: p.lote,
    vence: p.vence,
    loc: placed ? { rackId: p.rackId!, level: p.level!, pos: p.pos! } : null,
  };
}

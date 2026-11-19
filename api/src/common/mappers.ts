import type { Pallet as PrismaPallet, Presentation } from '@prisma/client';
import { boxesPerPallet } from './planner.js';

export interface ApiLoc {
  rackId: number;
  level: number;
  pos: number;
}

export interface ApiPallet {
  id: number;
  pal: string;
  productId: number;
  presentationId: number | null;
  receptionId: number | null;
  front: number;
  depth: number;
  rows: number;
  loose: number;
  lote: string;
  vence: string;
  /** completo | mermado (según el estándar de la presentación). */
  kind: 'completo' | 'mermado';
  loc: ApiLoc | null;
}

/** Convierte un pallet de Prisma a la forma que consume el frontend (pal + loc anidada). */
export function toApiPallet(p: PrismaPallet, presentation?: Presentation | null): ApiPallet {
  const placed = p.rackId != null && p.level != null && p.pos != null;
  const boxes = p.front * p.depth * p.rows + p.loose;
  const full = presentation ? boxes >= boxesPerPallet(presentation) : false;
  return {
    id: p.id,
    pal: p.code ?? '',
    productId: p.productId,
    presentationId: p.presentationId,
    receptionId: p.receptionId,
    front: p.front,
    depth: p.depth,
    rows: p.rows,
    loose: p.loose,
    lote: p.lote,
    vence: p.vence,
    kind: full ? 'completo' : 'mermado',
    loc: placed ? { rackId: p.rackId!, level: p.level!, pos: p.pos! } : null,
  };
}

import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ImportDto } from './dto.js';

const EXPORT_VERSION = 2;

interface RawCategory { id: number; name: string; color?: string }
interface RawProduct { id: number; code: string; name: string; unit?: string; photo?: string | null; color: string; active?: boolean; example?: boolean; categoryId?: number | null }
interface RawPresentation { id: number; productId: number; name: string; contentPerUnit: number; unitsPerBox: number; front: number; depth: number; levels: number; active?: boolean }
interface RawRack { id: number; name: string; levels: number; positions: number; categoryId?: number | null }
interface RawPallet {
  id: number; code?: string | null; productId: number; presentationId?: number | null; receptionId?: number | null;
  front: number; depth: number; rows: number; loose: number;
  lote?: string; vence?: string; rackId?: number | null; level?: number | null; pos?: number | null; status?: string;
}
interface RawReception {
  id: number; code: string; status?: string; receivedAt?: string; user: string; signature?: string | null; observations?: string;
  photos?: string[];
  lines?: { presentationId: number; quantity: number; boxes: number; leftoverUnits?: number; lote?: string; vence?: string }[];
}

/** Tablas que se importan con su id original (constantes, no vienen del usuario). */
const ID_TABLES = ['categories', 'products', 'presentations', 'racks', 'receptions', 'pallets'] as const;

@Injectable()
export class DataService {
  constructor(private readonly prisma: PrismaService) {}

  async export() {
    const [categories, products, presentations, racks, pallets, receptions] = await Promise.all([
      this.prisma.category.findMany({ orderBy: { id: 'asc' } }),
      this.prisma.product.findMany({ orderBy: { id: 'asc' } }),
      this.prisma.presentation.findMany({ orderBy: { id: 'asc' } }),
      this.prisma.rack.findMany({ orderBy: { id: 'asc' } }),
      this.prisma.pallet.findMany({ orderBy: { id: 'asc' } }),
      this.prisma.reception.findMany({ orderBy: { id: 'asc' }, include: { photos: true, lines: true } }),
    ]);
    return {
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      categories: categories.map((c) => ({ id: c.id, name: c.name, color: c.color })),
      products: products.map((p) => ({ id: p.id, code: p.code, name: p.name, unit: p.unit, photo: p.photo, color: p.color, active: p.active, example: p.example, categoryId: p.categoryId })),
      presentations: presentations.map((p) => ({ id: p.id, productId: p.productId, name: p.name, contentPerUnit: p.contentPerUnit, unitsPerBox: p.unitsPerBox, front: p.front, depth: p.depth, levels: p.levels, active: p.active })),
      racks: racks.map((r) => ({ id: r.id, name: r.name, levels: r.levels, positions: r.positions, categoryId: r.categoryId })),
      pallets: pallets.map((p) => ({
        id: p.id, code: p.code, productId: p.productId, presentationId: p.presentationId, receptionId: p.receptionId,
        front: p.front, depth: p.depth, rows: p.rows, loose: p.loose,
        lote: p.lote, vence: p.vence, rackId: p.rackId, level: p.level, pos: p.pos, status: p.status,
      })),
      receptions: receptions.map((r) => ({
        id: r.id, code: r.code, status: r.status, receivedAt: r.receivedAt.toISOString(), user: r.user,
        signature: r.signature, observations: r.observations,
        photos: r.photos.map((f) => f.data),
        lines: r.lines.map((l) => ({ presentationId: l.presentationId, quantity: l.quantity, boxes: l.boxes, leftoverUnits: l.leftoverUnits, lote: l.lote, vence: l.vence })),
      })),
    };
  }

  async import(dto: ImportDto) {
    if (dto.version !== EXPORT_VERSION) {
      throw new BadRequestException(
        `Versión de archivo no compatible (se esperaba ${EXPORT_VERSION}). Exporta de nuevo desde esta versión del sistema.`,
      );
    }
    const categories = (dto.categories ?? []) as RawCategory[];
    const products = dto.products as RawProduct[];
    const presentations = dto.presentations as RawPresentation[];
    const racks = dto.racks as RawRack[];
    const pallets = dto.pallets as RawPallet[];
    const receptions = (dto.receptions ?? []) as RawReception[];
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.movement.deleteMany();
        await tx.pallet.deleteMany();
        await tx.receptionLine.deleteMany();
        await tx.receptionPhoto.deleteMany();
        await tx.reception.deleteMany();
        await tx.presentation.deleteMany();
        await tx.rack.deleteMany();
        await tx.product.deleteMany();
        await tx.category.deleteMany();
        for (const c of categories) {
          await tx.category.create({ data: { id: c.id, name: c.name, color: c.color ?? '#64748b' } });
        }
        for (const p of products) {
          await tx.product.create({ data: { id: p.id, code: p.code, name: p.name, unit: p.unit ?? 'un', photo: p.photo ?? null, color: p.color, active: p.active ?? true, example: !!p.example, categoryId: p.categoryId ?? null } });
        }
        for (const p of presentations) {
          await tx.presentation.create({ data: { id: p.id, productId: p.productId, name: p.name, contentPerUnit: p.contentPerUnit, unitsPerBox: p.unitsPerBox, front: p.front, depth: p.depth, levels: p.levels, active: p.active ?? true } });
        }
        for (const r of racks) {
          await tx.rack.create({ data: { id: r.id, name: r.name, levels: r.levels, positions: r.positions, categoryId: r.categoryId ?? null } });
        }
        for (const r of receptions) {
          await tx.reception.create({
            data: {
              id: r.id, code: r.code, status: r.status ?? 'confirmada',
              receivedAt: r.receivedAt ? new Date(r.receivedAt) : new Date(),
              user: r.user, signature: r.signature ?? null, observations: r.observations ?? '',
              photos: { create: (r.photos ?? []).map((data) => ({ data })) },
              lines: { create: (r.lines ?? []).map((l) => ({ presentationId: l.presentationId, quantity: l.quantity, boxes: l.boxes, leftoverUnits: l.leftoverUnits ?? 0, lote: l.lote ?? '', vence: l.vence ?? '' })) },
            },
          });
        }
        for (const p of pallets) {
          await tx.pallet.create({
            data: {
              id: p.id, code: p.code ?? null, productId: p.productId,
              presentationId: p.presentationId ?? null, receptionId: p.receptionId ?? null,
              front: p.front, depth: p.depth, rows: p.rows, loose: p.loose,
              lote: p.lote ?? '', vence: p.vence ?? '',
              rackId: p.rackId ?? null, level: p.level ?? null, pos: p.pos ?? null,
              status: p.status ?? 'activo',
            },
          });
        }
        // PostgreSQL no adelanta el contador de ids cuando se insertan ids explícitos:
        // se lo lleva al máximo importado para que los próximos registros no choquen.
        if (process.env.DATABASE_URL?.startsWith('postgres')) {
          for (const table of ID_TABLES) {
            await tx.$executeRawUnsafe(
              `SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), COALESCE((SELECT MAX(id) FROM "${table}"), 0) + 1, false)`,
            );
          }
        }
      });
    } catch {
      throw new BadRequestException('No se pudo importar: el archivo no tiene el formato esperado o tiene datos inconsistentes.');
    }
    return { ok: true, counts: { products: products.length, racks: racks.length, pallets: pallets.length } };
  }
}

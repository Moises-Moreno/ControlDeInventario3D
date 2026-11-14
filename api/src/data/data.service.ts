import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ImportDto } from './dto.js';

const EXPORT_VERSION = 1;

interface RawProduct { id: number; code: string; name: string; unitsPerBox: number; color: string; example?: boolean }
interface RawRack { id: number; name: string; levels: number; positions: number }
interface RawPallet {
  id: number; code?: string | null; productId: number; front: number; depth: number; rows: number; loose: number;
  lote?: string; vence?: string; rackId?: number | null; level?: number | null; pos?: number | null; status?: string;
}

@Injectable()
export class DataService {
  constructor(private readonly prisma: PrismaService) {}

  async export() {
    const [products, racks, pallets] = await Promise.all([
      this.prisma.product.findMany({ orderBy: { id: 'asc' } }),
      this.prisma.rack.findMany({ orderBy: { id: 'asc' } }),
      this.prisma.pallet.findMany({ orderBy: { id: 'asc' } }),
    ]);
    return {
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      products: products.map((p) => ({ id: p.id, code: p.code, name: p.name, unitsPerBox: p.unitsPerBox, color: p.color, example: p.example })),
      racks: racks.map((r) => ({ id: r.id, name: r.name, levels: r.levels, positions: r.positions })),
      pallets: pallets.map((p) => ({
        id: p.id, code: p.code, productId: p.productId, front: p.front, depth: p.depth, rows: p.rows, loose: p.loose,
        lote: p.lote, vence: p.vence, rackId: p.rackId, level: p.level, pos: p.pos, status: p.status,
      })),
    };
  }

  async import(dto: ImportDto) {
    if (dto.version !== EXPORT_VERSION) {
      throw new BadRequestException(`Versión de archivo no compatible (se esperaba ${EXPORT_VERSION}).`);
    }
    const products = dto.products as RawProduct[];
    const racks = dto.racks as RawRack[];
    const pallets = dto.pallets as RawPallet[];
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.movement.deleteMany();
        await tx.pallet.deleteMany();
        await tx.rack.deleteMany();
        await tx.product.deleteMany();
        for (const p of products) {
          await tx.product.create({ data: { id: p.id, code: p.code, name: p.name, unitsPerBox: p.unitsPerBox, color: p.color, example: !!p.example } });
        }
        for (const r of racks) {
          await tx.rack.create({ data: { id: r.id, name: r.name, levels: r.levels, positions: r.positions } });
        }
        for (const p of pallets) {
          await tx.pallet.create({
            data: {
              id: p.id, code: p.code ?? null, productId: p.productId,
              front: p.front, depth: p.depth, rows: p.rows, loose: p.loose,
              lote: p.lote ?? '', vence: p.vence ?? '',
              rackId: p.rackId ?? null, level: p.level ?? null, pos: p.pos ?? null,
              status: p.status ?? 'activo',
            },
          });
        }
      });
    } catch {
      throw new BadRequestException('No se pudo importar: el archivo no tiene el formato esperado o tiene datos inconsistentes.');
    }
    return { ok: true, counts: { products: products.length, racks: racks.length, pallets: pallets.length } };
  }
}

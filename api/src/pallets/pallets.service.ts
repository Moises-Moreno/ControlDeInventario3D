import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { normalizeBuild } from '../common/build.js';
import { palCode, locCode } from '../common/codes.js';
import { toApiPallet } from '../common/mappers.js';
import type { CreatePalletDto, PlaceDto } from './dto.js';

function isUniqueViolation(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';
}

@Injectable()
export class PalletsService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const pallets = await this.prisma.pallet.findMany({ where: { status: 'activo' }, orderBy: { id: 'asc' } });
    return pallets.map(toApiPallet);
  }

  async create(dto: CreatePalletDto) {
    await this.ensureProduct(dto.productId);
    const b = normalizeBuild(dto);
    const pallet = await this.prisma.$transaction(async (tx) => {
      const created = await tx.pallet.create({
        data: {
          productId: dto.productId,
          front: b.front,
          depth: b.depth,
          rows: b.rows,
          loose: b.loose,
          lote: (dto.lote ?? '').trim(),
          vence: dto.vence ?? '',
        },
      });
      const withCode = await tx.pallet.update({ where: { id: created.id }, data: { code: palCode(created.id) } });
      await tx.movement.create({ data: { palletId: created.id, type: 'alta' } });
      return withCode;
    });
    return toApiPallet(pallet);
  }

  async recount(id: number, dto: CreatePalletDto) {
    await this.getActive(id);
    await this.ensureProduct(dto.productId);
    const b = normalizeBuild(dto);
    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.pallet.update({
        where: { id },
        data: {
          productId: dto.productId,
          front: b.front,
          depth: b.depth,
          rows: b.rows,
          loose: b.loose,
          lote: (dto.lote ?? '').trim(),
          vence: dto.vence ?? '',
        },
      });
      await tx.movement.create({ data: { palletId: id, type: 'recuento' } });
      return u;
    });
    return toApiPallet(updated);
  }

  async place(id: number, dto: PlaceDto) {
    const pallet = await this.getActive(id);
    const rack = await this.prisma.rack.findUnique({ where: { id: dto.rackId } });
    if (!rack) throw new BadRequestException('No se encontró el rack indicado.');
    if (dto.level > rack.levels || dto.pos > rack.positions) {
      throw new BadRequestException('Esa posición no existe en el rack.');
    }
    const wasPlaced = pallet.rackId != null;
    const fromText = wasPlaced ? await this.locText(pallet.rackId!, pallet.level!, pallet.pos!) : null;
    const toText = locCode(rack.name, dto.level, dto.pos);
    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        const u = await tx.pallet.update({ where: { id }, data: { rackId: dto.rackId, level: dto.level, pos: dto.pos } });
        await tx.movement.create({ data: { palletId: id, type: wasPlaced ? 'traslado' : 'ubicacion', fromText, toText } });
        return u;
      });
      return toApiPallet(updated);
    } catch (e) {
      if (isUniqueViolation(e)) throw new ConflictException('Esa posición ya está ocupada por otro pallet.');
      throw e;
    }
  }

  async unplace(id: number) {
    const pallet = await this.getActive(id);
    if (pallet.rackId == null) return toApiPallet(pallet);
    const fromText = await this.locText(pallet.rackId, pallet.level!, pallet.pos!);
    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.pallet.update({ where: { id }, data: { rackId: null, level: null, pos: null } });
      await tx.movement.create({ data: { palletId: id, type: 'ubicacion', fromText, toText: null } });
      return u;
    });
    return toApiPallet(updated);
  }

  async baja(id: number) {
    const pallet = await this.getActive(id);
    const fromText = pallet.rackId != null ? await this.locText(pallet.rackId, pallet.level!, pallet.pos!) : null;
    await this.prisma.$transaction(async (tx) => {
      await tx.pallet.update({ where: { id }, data: { status: 'baja', rackId: null, level: null, pos: null } });
      await tx.movement.create({ data: { palletId: id, type: 'baja', fromText } });
    });
    return { ok: true };
  }

  private async getActive(id: number) {
    const p = await this.prisma.pallet.findUnique({ where: { id } });
    if (!p || p.status !== 'activo') throw new NotFoundException('No se encontró el pallet.');
    return p;
  }

  private async ensureProduct(productId: number) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new BadRequestException('El producto indicado no existe.');
  }

  private async locText(rackId: number, level: number, pos: number) {
    const rack = await this.prisma.rack.findUnique({ where: { id: rackId } });
    return locCode(rack?.name ?? '?', level, pos);
  }
}

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
    const pallets = await this.prisma.pallet.findMany({
      where: { status: 'activo' },
      orderBy: { id: 'asc' },
      include: { presentation: true },
    });
    return pallets.map((p) => toApiPallet(p, p.presentation));
  }

  async create(dto: CreatePalletDto, user: string) {
    const presentation = await this.ensurePresentation(dto.productId, dto.presentationId);
    const b = normalizeBuild(dto);
    const pallet = await this.prisma.$transaction(async (tx) => {
      const created = await tx.pallet.create({
        data: {
          productId: dto.productId,
          presentationId: dto.presentationId,
          front: b.front,
          depth: b.depth,
          rows: b.rows,
          loose: b.loose,
          lote: (dto.lote ?? '').trim(),
          vence: dto.vence ?? '',
        },
      });
      const withCode = await tx.pallet.update({ where: { id: created.id }, data: { code: palCode(created.id) } });
      await tx.movement.create({ data: { palletId: created.id, type: 'alta', user } });
      return withCode;
    });
    return toApiPallet(pallet, presentation);
  }

  async recount(id: number, dto: CreatePalletDto, user: string) {
    await this.getActive(id);
    const presentation = await this.ensurePresentation(dto.productId, dto.presentationId);
    const b = normalizeBuild(dto);
    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.pallet.update({
        where: { id },
        data: {
          productId: dto.productId,
          presentationId: dto.presentationId,
          front: b.front,
          depth: b.depth,
          rows: b.rows,
          loose: b.loose,
          lote: (dto.lote ?? '').trim(),
          vence: dto.vence ?? '',
        },
      });
      await tx.movement.create({ data: { palletId: id, type: 'recuento', user } });
      return u;
    });
    return toApiPallet(updated, presentation);
  }

  async place(id: number, dto: PlaceDto, user: string) {
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
        await tx.movement.create({ data: { palletId: id, type: wasPlaced ? 'traslado' : 'ubicacion', fromText, toText, user } });
        return u;
      });
      return toApiPallet(updated, await this.presentationOf(updated.presentationId));
    } catch (e) {
      if (isUniqueViolation(e)) throw new ConflictException('Esa posición ya está ocupada por otro pallet.');
      throw e;
    }
  }

  async unplace(id: number, user: string) {
    const pallet = await this.getActive(id);
    const presentation = await this.presentationOf(pallet.presentationId);
    if (pallet.rackId == null) return toApiPallet(pallet, presentation);
    const fromText = await this.locText(pallet.rackId, pallet.level!, pallet.pos!);
    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.pallet.update({ where: { id }, data: { rackId: null, level: null, pos: null } });
      await tx.movement.create({ data: { palletId: id, type: 'ubicacion', fromText, toText: null, user } });
      return u;
    });
    return toApiPallet(updated, presentation);
  }

  async baja(id: number, user: string) {
    const pallet = await this.getActive(id);
    const fromText = pallet.rackId != null ? await this.locText(pallet.rackId, pallet.level!, pallet.pos!) : null;
    await this.prisma.$transaction(async (tx) => {
      await tx.pallet.update({ where: { id }, data: { status: 'baja', rackId: null, level: null, pos: null } });
      await tx.movement.create({ data: { palletId: id, type: 'baja', fromText, user } });
    });
    return { ok: true };
  }

  private async getActive(id: number) {
    const p = await this.prisma.pallet.findUnique({ where: { id } });
    if (!p || p.status !== 'activo') throw new NotFoundException('No se encontró el pallet.');
    return p;
  }

  /** La presentación debe existir y pertenecer al producto indicado. */
  private async ensurePresentation(productId: number, presentationId: number) {
    const presentation = await this.prisma.presentation.findUnique({ where: { id: presentationId } });
    if (!presentation || presentation.productId !== productId) {
      throw new BadRequestException('La presentación no pertenece al producto elegido.');
    }
    return presentation;
  }

  private presentationOf(id: number | null) {
    return id == null ? Promise.resolve(null) : this.prisma.presentation.findUnique({ where: { id } });
  }

  private async locText(rackId: number, level: number, pos: number) {
    const rack = await this.prisma.rack.findUnique({ where: { id: rackId } });
    return locCode(rack?.name ?? '?', level, pos);
  }
}

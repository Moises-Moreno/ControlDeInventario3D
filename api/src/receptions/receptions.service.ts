import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { palCode, recCode } from '../common/codes.js';
import { toApiPallet } from '../common/mappers.js';
import { planReception } from '../common/planner.js';
import type { CreateReceptionDto } from './dto.js';

@Injectable()
export class ReceptionsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Lista liviana (sin fotos ni firma). */
  async list() {
    const receptions = await this.prisma.reception.findMany({
      orderBy: { id: 'desc' },
      take: 200,
      include: {
        lines: { include: { presentation: { include: { product: true } } } },
        _count: { select: { pallets: true, photos: true } },
      },
    });
    return receptions.map((r) => ({
      id: r.id,
      code: r.code,
      status: r.status,
      receivedAt: r.receivedAt,
      user: r.user,
      observations: r.observations,
      palletCount: r._count.pallets,
      photoCount: r._count.photos,
      hasSignature: !!r.signature,
      lines: r.lines.map((l) => ({
        productCode: l.presentation.product.code,
        productName: l.presentation.product.name,
        presentation: l.presentation.name,
        unit: l.presentation.product.unit,
        quantity: l.quantity,
        boxes: l.boxes,
      })),
    }));
  }

  /** Detalle completo: fotos, firma y pallets creados. */
  async get(id: number) {
    const r = await this.prisma.reception.findUnique({
      where: { id },
      include: {
        photos: { orderBy: { id: 'asc' } },
        lines: { include: { presentation: { include: { product: true } } } },
        pallets: { include: { presentation: true }, orderBy: { id: 'asc' } },
      },
    });
    if (!r) throw new NotFoundException('No se encontró la recepción.');
    return {
      id: r.id,
      code: r.code,
      status: r.status,
      receivedAt: r.receivedAt,
      user: r.user,
      observations: r.observations,
      signature: r.signature,
      photos: r.photos.map((p) => p.data),
      lines: r.lines.map((l) => ({
        presentationId: l.presentationId,
        productCode: l.presentation.product.code,
        productName: l.presentation.product.name,
        presentation: l.presentation.name,
        unit: l.presentation.product.unit,
        quantity: l.quantity,
        boxes: l.boxes,
        leftoverUnits: l.leftoverUnits,
        lote: l.lote,
        vence: l.vence,
      })),
      pallets: r.pallets.map((p) => toApiPallet(p, p.presentation)),
    };
  }

  /**
   * Confirma una recepción: calcula los pallets de cada línea (el servidor es la
   * autoridad), los crea sin ubicar y registra un movimiento de alta por cada uno.
   */
  async create(dto: CreateReceptionDto, user: string) {
    const presentations = await this.prisma.presentation.findMany({
      where: { id: { in: dto.lines.map((l) => l.presentationId) } },
      include: { product: true },
    });

    const lines = dto.lines.map((line) => {
      const presentation = presentations.find((p) => p.id === line.presentationId);
      if (!presentation) throw new BadRequestException('Una presentación indicada no existe.');
      if (!presentation.active || !presentation.product.active) {
        throw new ConflictException(
          `${presentation.product.name} (${presentation.name}) está desactivado. Actívalo en Productos o elige otro.`,
        );
      }
      const plan = planReception(line.quantity, presentation);
      if (plan.boxes === 0) {
        throw new BadRequestException(
          `${line.quantity} ${presentation.product.unit} de ${presentation.product.name} no completan una caja (${presentation.unitsPerBox} × ${presentation.contentPerUnit} ${presentation.product.unit}). Aumenta la cantidad.`,
        );
      }
      return { line, presentation, plan };
    });

    const created = await this.prisma.$transaction(async (tx) => {
      const last = await tx.reception.findFirst({ orderBy: { id: 'desc' }, select: { id: true } });
      const reception = await tx.reception.create({
        data: {
          code: recCode((last?.id ?? 0) + 1),
          user,
          signature: dto.signature ?? null,
          observations: (dto.observations ?? '').trim(),
          photos: { create: (dto.photos ?? []).map((data) => ({ data })) },
        },
      });

      for (const { line, presentation, plan } of lines) {
        await tx.receptionLine.create({
          data: {
            receptionId: reception.id,
            presentationId: presentation.id,
            quantity: line.quantity,
            boxes: plan.boxes,
            leftoverUnits: plan.leftoverUnits,
            lote: (line.lote ?? '').trim(),
            vence: line.vence ?? '',
          },
        });

        for (const pl of plan.pallets) {
          const pallet = await tx.pallet.create({
            data: {
              productId: presentation.productId,
              presentationId: presentation.id,
              receptionId: reception.id,
              front: pl.front,
              depth: pl.depth,
              rows: pl.rows,
              loose: pl.loose,
              lote: (line.lote ?? '').trim(),
              vence: line.vence ?? '',
            },
          });
          await tx.pallet.update({ where: { id: pallet.id }, data: { code: palCode(pallet.id) } });
          await tx.movement.create({
            data: { palletId: pallet.id, type: 'alta', toText: `Recepción ${reception.code}`, user },
          });
        }
      }
      return reception;
    });

    return this.get(created.id);
  }

  /** Anula una recepción: da de baja sus pallets (libera las posiciones) y la marca anulada. */
  async annul(id: number, user: string) {
    const reception = await this.prisma.reception.findUnique({ where: { id }, include: { pallets: true } });
    if (!reception) throw new NotFoundException('No se encontró la recepción.');
    if (reception.status === 'anulada') throw new ConflictException('Esa recepción ya está anulada.');

    await this.prisma.$transaction(async (tx) => {
      for (const p of reception.pallets.filter((x) => x.status === 'activo')) {
        await tx.pallet.update({ where: { id: p.id }, data: { status: 'baja', rackId: null, level: null, pos: null } });
        await tx.movement.create({
          data: { palletId: p.id, type: 'baja', fromText: `Recepción ${reception.code} anulada`, user },
        });
      }
      await tx.reception.update({ where: { id }, data: { status: 'anulada' } });
    });
    return this.get(id);
  }
}

import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { canPlace } from '../common/zones.js';
import { categoryNames } from '../common/zone-check.js';
import type { PresentationDto, ProductDto } from './dto.js';

const WITH_PRESENTATIONS = { presentations: { orderBy: { id: 'asc' as const } } };

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.product.findMany({ orderBy: { id: 'asc' }, include: WITH_PRESENTATIONS });
  }

  async create(data: ProductDto) {
    const code = data.code.trim().toUpperCase();
    await this.ensureUniqueCode(code, null);
    const presentations = data.presentations?.length ? data.presentations : [defaultPresentation()];
    this.checkPresentations(presentations);
    await this.ensureCategory(data.categoryId);
    return this.prisma.product.create({
      data: {
        code,
        categoryId: data.categoryId ?? null,
        name: data.name.trim(),
        unit: data.unit.trim(),
        color: data.color,
        photo: data.photo ?? null,
        active: data.active ?? true,
        presentations: { create: presentations.map(toRow) },
      },
      include: WITH_PRESENTATIONS,
    });
  }

  async update(id: number, data: ProductDto) {
    await this.get(id);
    const code = data.code.trim().toUpperCase();
    await this.ensureUniqueCode(code, id);
    if (data.presentations) this.checkPresentations(data.presentations);
    if (data.categoryId !== undefined) {
      await this.ensureCategory(data.categoryId);
      await this.checkPlacedPallets(id, data.categoryId);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: {
          code,
          name: data.name.trim(),
          unit: data.unit.trim(),
          color: data.color,
          // undefined = no tocar; null = quitar la foto
          ...(data.photo !== undefined ? { photo: data.photo } : {}),
          ...(data.active !== undefined ? { active: data.active } : {}),
          ...(data.categoryId !== undefined ? { categoryId: data.categoryId } : {}),
          example: false,
        },
      });

      if (data.presentations) {
        const existing = await tx.presentation.findMany({ where: { productId: id } });
        const keep = new Set(data.presentations.map((p) => p.id).filter((v): v is number => v != null));

        for (const p of data.presentations) {
          if (p.id != null) {
            if (!existing.some((e) => e.id === p.id)) {
              throw new BadRequestException('Una presentación no pertenece a este producto.');
            }
            await tx.presentation.update({ where: { id: p.id }, data: toRow(p) });
          } else {
            await tx.presentation.create({ data: { ...toRow(p), productId: id } });
          }
        }
        // Las que ya no vienen: se borran si no se usaron; si tienen historial, se desactivan.
        for (const e of existing.filter((x) => !keep.has(x.id))) {
          const used =
            (await tx.pallet.count({ where: { presentationId: e.id } })) +
            (await tx.receptionLine.count({ where: { presentationId: e.id } }));
          if (used > 0) await tx.presentation.update({ where: { id: e.id }, data: { active: false } });
          else await tx.presentation.delete({ where: { id: e.id } });
        }
      }
    });

    return this.prisma.product.findUnique({ where: { id }, include: WITH_PRESENTATIONS });
  }

  /** Qué registros se borrarían junto con el producto. */
  async usage(id: number) {
    const product = await this.get(id);
    const pallets = await this.prisma.pallet.findMany({ where: { productId: id }, select: { id: true, status: true, rackId: true } });
    const ids = pallets.map((p) => p.id);
    const movements = ids.length ? await this.prisma.movement.count({ where: { palletId: { in: ids } } }) : 0;
    const lines = await this.prisma.receptionLine.findMany({ where: { presentation: { productId: id } }, select: { receptionId: true } });
    return {
      code: product.code,
      name: product.name,
      pallets: pallets.length,
      palletsInRack: pallets.filter((p) => p.status === 'activo' && p.rackId != null).length,
      movements,
      receptionLines: lines.length,
      receptions: new Set(lines.map((l) => l.receptionId)).size,
    };
  }

  /**
   * Elimina un producto. Sin `cascade` solo se permite si nunca se usó. Con `cascade`
   * (solo admin) borra también sus pallets (liberando las posiciones), los movimientos
   * de esos pallets y sus líneas de recepción; una recepción que se queda sin líneas se
   * borra con sus fotos. No se puede deshacer.
   */
  async remove(id: number, cascade = false) {
    await this.get(id);
    const pallets = await this.prisma.pallet.count({ where: { productId: id } });
    const lines = await this.prisma.receptionLine.count({ where: { presentation: { productId: id } } });
    if (!cascade && (pallets > 0 || lines > 0)) {
      throw new ConflictException(
        'El producto tiene pallets o recepciones registradas. Desactívalo, o elimínalo junto con todos sus registros.',
      );
    }
    const deleted = await this.prisma.$transaction(async (tx) => {
      const palletIds = (await tx.pallet.findMany({ where: { productId: id }, select: { id: true } })).map((p) => p.id);
      const movements = palletIds.length ? (await tx.movement.deleteMany({ where: { palletId: { in: palletIds } } })).count : 0;
      const palletsDeleted = (await tx.pallet.deleteMany({ where: { productId: id } })).count;

      const receptionIds = [
        ...new Set(
          (await tx.receptionLine.findMany({ where: { presentation: { productId: id } }, select: { receptionId: true } })).map((l) => l.receptionId),
        ),
      ];
      const linesDeleted = (await tx.receptionLine.deleteMany({ where: { presentation: { productId: id } } })).count;
      let receptionsDeleted = 0;
      for (const rid of receptionIds) {
        const left = await tx.receptionLine.count({ where: { receptionId: rid } });
        const others = await tx.pallet.count({ where: { receptionId: rid } });
        if (left === 0 && others === 0) {
          await tx.receptionPhoto.deleteMany({ where: { receptionId: rid } });
          await tx.reception.delete({ where: { id: rid } });
          receptionsDeleted++;
        }
      }
      await tx.presentation.deleteMany({ where: { productId: id } });
      await tx.product.delete({ where: { id } });
      return { pallets: palletsDeleted, movements, receptionLines: linesDeleted, receptions: receptionsDeleted };
    });
    return { ok: true, deleted };
  }

  private checkPresentations(list: PresentationDto[]) {
    if (list.length === 0) throw new BadRequestException('El producto necesita al menos una presentación.');
    if (!list.some((p) => p.active !== false)) {
      throw new BadRequestException('Deja al menos una presentación activa.');
    }
  }

  private async get(id: number) {
    const p = await this.prisma.product.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('No se encontró el producto.');
    return p;
  }

  private async ensureCategory(categoryId: number | null | undefined) {
    if (categoryId == null) return;
    const cat = await this.prisma.category.findUnique({ where: { id: categoryId } });
    if (!cat) throw new BadRequestException('No se encontró la categoría indicada.');
  }

  /** Cambiar la categoría no puede dejar pallets ubicados en un rack de otra categoría. */
  private async checkPlacedPallets(productId: number, categoryId: number | null) {
    const placed = await this.prisma.pallet.findMany({
      where: { productId, status: 'activo', rackId: { not: null } },
      select: { id: true, rack: true },
    });
    if (!placed.length) return;
    const names = await categoryNames(this.prisma);
    for (const p of placed) {
      const rack = p.rack!;
      const others = await this.prisma.pallet.findMany({
        where: { rackId: rack.id, status: 'activo', productId: { not: productId } },
        select: { product: { select: { categoryId: true } } },
      });
      const check = canPlace(categoryId, rack, others.map((o) => o.product.categoryId), names);
      if (!check.ok) {
        throw new ConflictException(`${check.reason} Mové sus pallets a otro rack antes de cambiar la categoría.`);
      }
    }
  }

  private async ensureUniqueCode(code: string, selfId: number | null) {
    const existing = await this.prisma.product.findUnique({ where: { code } });
    if (existing && existing.id !== selfId) {
      throw new ConflictException(`Ya existe un producto con el código ${code}. Usa otro código.`);
    }
  }
}

function defaultPresentation(): PresentationDto {
  return { name: 'Presentación estándar', contentPerUnit: 1, unitsPerBox: 1, front: 5, depth: 2, levels: 4, active: true };
}

function toRow(p: PresentationDto) {
  return {
    name: p.name.trim(),
    contentPerUnit: p.contentPerUnit,
    unitsPerBox: p.unitsPerBox,
    front: p.front,
    depth: p.depth,
    levels: p.levels,
    active: p.active ?? true,
  };
}

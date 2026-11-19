import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
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
    return this.prisma.product.create({
      data: {
        code,
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

  async remove(id: number) {
    await this.get(id);
    const pallets = await this.prisma.pallet.count({ where: { productId: id } });
    const lines = await this.prisma.receptionLine.count({ where: { presentation: { productId: id } } });
    if (pallets > 0 || lines > 0) {
      throw new ConflictException(
        'No se puede eliminar: el producto tiene pallets o recepciones registradas. Desactívalo para que no se use más.',
      );
    }
    await this.prisma.$transaction([
      this.prisma.presentation.deleteMany({ where: { productId: id } }),
      this.prisma.product.delete({ where: { id } }),
    ]);
    return { ok: true };
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

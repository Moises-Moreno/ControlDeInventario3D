import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ProductDto } from './dto.js';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.product.findMany({ orderBy: { id: 'asc' } });
  }

  async create(data: ProductDto) {
    const code = data.code.trim().toUpperCase();
    await this.ensureUniqueCode(code, null);
    return this.prisma.product.create({
      data: { code, name: data.name.trim(), unitsPerBox: data.unitsPerBox, color: data.color },
    });
  }

  async update(id: number, data: ProductDto) {
    await this.get(id);
    const code = data.code.trim().toUpperCase();
    await this.ensureUniqueCode(code, id);
    return this.prisma.product.update({
      where: { id },
      data: { code, name: data.name.trim(), unitsPerBox: data.unitsPerBox, color: data.color, example: false },
    });
  }

  async remove(id: number) {
    await this.get(id);
    const count = await this.prisma.pallet.count({ where: { productId: id } });
    if (count > 0) {
      throw new ConflictException(
        `No se puede eliminar: el producto lo usan ${count} ${count === 1 ? 'pallet' : 'pallets'}. Quita esos pallets primero.`,
      );
    }
    await this.prisma.product.delete({ where: { id } });
    return { ok: true };
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

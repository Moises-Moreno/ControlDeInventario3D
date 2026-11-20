import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CategoryDto } from './dto.js';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.category.findMany({ orderBy: { name: 'asc' } });
  }

  async create(dto: CategoryDto) {
    const name = dto.name.trim();
    await this.ensureUniqueName(name, null);
    return this.prisma.category.create({ data: { name, ...(dto.color ? { color: dto.color } : {}) } });
  }

  async update(id: number, dto: CategoryDto) {
    await this.get(id);
    const name = dto.name.trim();
    await this.ensureUniqueName(name, id);
    return this.prisma.category.update({ where: { id }, data: { name, ...(dto.color ? { color: dto.color } : {}) } });
  }

  async remove(id: number) {
    const cat = await this.get(id);
    const [products, racks] = await Promise.all([
      this.prisma.product.count({ where: { categoryId: id } }),
      this.prisma.rack.count({ where: { categoryId: id } }),
    ]);
    if (products > 0 || racks > 0) {
      throw new ConflictException(
        `La categoría “${cat.name}” está en uso (${products} ${products === 1 ? 'producto' : 'productos'} y ${racks} ${racks === 1 ? 'rack' : 'racks'}). Cambialos de categoría antes de borrarla.`,
      );
    }
    await this.prisma.category.delete({ where: { id } });
    return { ok: true };
  }

  private async get(id: number) {
    const c = await this.prisma.category.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('No se encontró la categoría.');
    return c;
  }

  private async ensureUniqueName(name: string, exceptId: number | null) {
    const clash = await this.prisma.category.findFirst({ where: { name, ...(exceptId != null ? { NOT: { id: exceptId } } : {}) } });
    if (clash) throw new ConflictException(`Ya existe la categoría “${name}”.`);
  }
}

import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { MAX_RACKS, RACK_LETTERS } from '../common/limits.js';
import { canPlace } from '../common/zones.js';
import { categoryNames } from '../common/zone-check.js';
import type { UpdateRackDto } from './dto.js';

@Injectable()
export class RacksService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.rack.findMany({ orderBy: { id: 'asc' } });
  }

  async create() {
    const racks = await this.prisma.rack.findMany();
    if (racks.length >= MAX_RACKS) {
      throw new ConflictException(`Ya hay ${MAX_RACKS} racks, el máximo.`);
    }
    const used = new Set(racks.map((r) => r.name));
    let name = 'R' + (racks.length + 1);
    for (const letter of RACK_LETTERS) {
      if (!used.has(letter)) {
        name = letter;
        break;
      }
    }
    return this.prisma.rack.create({ data: { name, levels: 3, positions: 4 } });
  }

  async update(id: number, dto: UpdateRackDto) {
    const rack = await this.get(id);

    if (dto.name != null) {
      const name = dto.name.trim().toUpperCase();
      const clash = await this.prisma.rack.findFirst({ where: { name, NOT: { id } } });
      if (clash) throw new ConflictException(`Ya existe un rack ${name}. Usa otro nombre.`);
      await this.prisma.rack.update({ where: { id }, data: { name } });
    }

    if (dto.categoryId !== undefined) await this.setCategory(rack, dto.categoryId);

    if (dto.levels != null) await this.resize(id, rack.name, 'level', 'levels', dto.levels);
    if (dto.positions != null) await this.resize(id, rack.name, 'pos', 'positions', dto.positions);

    return this.prisma.rack.findUnique({ where: { id } });
  }

  async remove(id: number) {
    const rack = await this.get(id);
    const inRack = await this.prisma.pallet.count({ where: { rackId: id } });
    if (inRack > 0) {
      throw new ConflictException(
        `El rack ${rack.name} tiene ${inRack} ${inRack === 1 ? 'pallet' : 'pallets'}. Bájalos o muévelos antes de quitarlo.`,
      );
    }
    await this.prisma.rack.delete({ where: { id } });
    return { ok: true };
  }

  /** Asigna la categoría del rack; si ya tiene pallets, todos tienen que ser de esa categoría. */
  private async setCategory(rack: { id: number; name: string }, categoryId: number | null) {
    if (categoryId != null) {
      const cat = await this.prisma.category.findUnique({ where: { id: categoryId } });
      if (!cat) throw new BadRequestException('No se encontró la categoría indicada.');
      const names = await categoryNames(this.prisma);
      const inRack = await this.prisma.pallet.findMany({
        where: { rackId: rack.id, status: 'activo' },
        select: { product: { select: { categoryId: true } } },
      });
      for (const p of inRack) {
        const check = canPlace(p.product.categoryId, { name: rack.name, categoryId }, [], names);
        if (!check.ok) {
          throw new ConflictException(`${check.reason} Movelos o dalos de baja antes de asignar la categoría.`);
        }
      }
    }
    await this.prisma.rack.update({ where: { id: rack.id }, data: { categoryId } });
  }

  private async resize(id: number, rackName: string, field: 'level' | 'pos', column: 'levels' | 'positions', value: number) {
    const placed = await this.prisma.pallet.findMany({ where: { rackId: id }, select: { level: true, pos: true } });
    let need = 0;
    for (const p of placed) need = Math.max(need, (field === 'level' ? p.level : p.pos) ?? 0);
    if (value < need) {
      throw new ConflictException(
        `Hay un pallet en ${field === 'level' ? 'el nivel' : 'la posición'} ${need} del rack ${rackName}. Bájalo o muévelo antes de reducir.`,
      );
    }
    await this.prisma.rack.update({ where: { id }, data: { [column]: value } });
  }

  private async get(id: number) {
    const r = await this.prisma.rack.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('No se encontró el rack.');
    return r;
  }
}

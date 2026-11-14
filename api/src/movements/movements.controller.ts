import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service.js';

@ApiTags('movimientos')
@Controller('movements')
export class MovementsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list() {
    const movements = await this.prisma.movement.findMany({
      orderBy: { id: 'desc' },
      take: 200,
      include: { pallet: { select: { code: true } } },
    });
    return movements.map((m) => ({
      id: m.id,
      pal: m.pallet?.code ?? '',
      type: m.type,
      fromText: m.fromText,
      toText: m.toText,
      user: m.user,
      createdAt: m.createdAt,
    }));
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

const EXPIRY_DAYS = 60; // "próximo a vencer" si vence dentro de este plazo

@Injectable()
export class StockService {
  constructor(private readonly prisma: PrismaService) {}

  async summary() {
    const [products, pallets] = await Promise.all([
      this.prisma.product.findMany({ orderBy: { id: 'asc' } }),
      this.prisma.pallet.findMany({ where: { status: 'activo' } }),
    ]);

    const rows = products.map((p) => {
      const own = pallets.filter((x) => x.productId === p.id);
      const boxes = own.reduce((s, x) => s + (x.front * x.depth * x.rows + x.loose), 0);
      return {
        productId: p.id,
        code: p.code,
        name: p.name,
        color: p.color,
        unitsPerBox: p.unitsPerBox,
        boxes,
        units: boxes * p.unitsPerBox,
        pallets: own.length,
      };
    });

    const totals = rows.reduce(
      (acc, r) => ({
        products: acc.products + 1,
        pallets: acc.pallets + r.pallets,
        boxes: acc.boxes + r.boxes,
        units: acc.units + r.units,
      }),
      { products: 0, pallets: 0, boxes: 0, units: 0 },
    );

    // Próximos a vencer (y vencidos)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiring = pallets
      .filter((x) => x.vence)
      .map((x) => {
        const d = new Date(x.vence + 'T00:00:00');
        const daysLeft = Math.round((d.getTime() - today.getTime()) / 86400000);
        const product = products.find((p) => p.id === x.productId);
        return { pal: x.code ?? '', code: product?.code ?? '', name: product?.name ?? '', vence: x.vence, daysLeft };
      })
      .filter((x) => Number.isFinite(x.daysLeft) && x.daysLeft <= EXPIRY_DAYS)
      .sort((a, b) => a.daysLeft - b.daysLeft);

    return { rows, totals, expiring };
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { boxesPerPallet } from '../common/planner.js';

const EXPIRY_DAYS = 60; // "próximo a vencer" si vence dentro de este plazo

@Injectable()
export class StockService {
  constructor(private readonly prisma: PrismaService) {}

  async summary() {
    const [products, pallets] = await Promise.all([
      this.prisma.product.findMany({ orderBy: { id: 'asc' }, include: { presentations: true } }),
      this.prisma.pallet.findMany({ where: { status: 'activo' }, include: { presentation: true } }),
    ]);

    const rows = products.map((p) => {
      const own = pallets.filter((x) => x.productId === p.id);
      let boxes = 0;
      let units = 0; // envases
      let volume = 0; // en la unidad del producto (L, kg...)
      let full = 0;
      let partial = 0;
      for (const x of own) {
        const b = x.front * x.depth * x.rows + x.loose;
        const per = x.presentation?.unitsPerBox ?? 1;
        const content = x.presentation?.contentPerUnit ?? 1;
        boxes += b;
        units += b * per;
        volume += b * per * content;
        if (x.presentation && b >= boxesPerPallet(x.presentation)) full++;
        else partial++;
      }
      return {
        productId: p.id,
        code: p.code,
        name: p.name,
        color: p.color,
        unit: p.unit,
        active: p.active,
        boxes,
        units,
        volume,
        pallets: own.length,
        fullPallets: full,
        partialPallets: partial,
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

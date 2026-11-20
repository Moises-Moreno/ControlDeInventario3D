import type { PrismaService } from '../prisma/prisma.service.js';
import { canPlace, type ZoneCheck, type ZoneRack } from './zones.js';

export async function categoryNames(prisma: PrismaService): Promise<Map<number, string>> {
  const cats = await prisma.category.findMany({ select: { id: true, name: true } });
  return new Map(cats.map((c) => [c.id, c.name]));
}

/** ¿Puede un producto de esa categoría ocupar un lugar en el rack? Ignora los pallets de `ignorePalletIds`. */
export async function checkRack(
  prisma: PrismaService,
  productCategoryId: number | null,
  rack: ZoneRack & { id: number },
  ignorePalletIds: number[] = [],
): Promise<ZoneCheck> {
  const inRack = await prisma.pallet.findMany({
    where: { rackId: rack.id, status: 'activo', ...(ignorePalletIds.length ? { id: { notIn: ignorePalletIds } } : {}) },
    select: { product: { select: { categoryId: true } } },
  });
  return canPlace(productCategoryId, rack, inRack.map((p) => p.product.categoryId), await categoryNames(prisma));
}

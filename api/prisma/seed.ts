import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const palCode = (n: number) => 'PAL-' + String(n).padStart(3, '0');

async function seedUsers() {
  if ((await prisma.user.count()) > 0) return;
  await prisma.user.create({ data: { username: 'admin', passwordHash: await bcrypt.hash('admin123', 10), role: 'admin' } });
  await prisma.user.create({ data: { username: 'operador', passwordHash: await bcrypt.hash('operador123', 10), role: 'operador' } });
  console.log('Usuarios de ejemplo: admin/admin123 (admin) y operador/operador123 (operador).');
}

async function main() {
  await seedUsers();

  if ((await prisma.product.count()) > 0) {
    console.log('Ya hay datos de inventario; no se vuelve a sembrar.');
    return;
  }

  const gal = await prisma.product.create({ data: { code: 'GAL-012', name: 'Galletas de avena 200 g', unitsPerBox: 24, color: '#c89a5a', example: true } });
  const ace = await prisma.product.create({ data: { code: 'ACE-005', name: 'Aceite vegetal 900 ml', unitsPerBox: 12, color: '#d8b24a', example: true } });
  await prisma.product.create({ data: { code: 'DET-030', name: 'Detergente en polvo 1 kg', unitsPerBox: 10, color: '#7fa3c7', example: true } });

  const a = await prisma.rack.create({ data: { name: 'A', levels: 3, positions: 4 } });
  await prisma.rack.create({ data: { name: 'B', levels: 3, positions: 4 } });
  await prisma.rack.create({ data: { name: 'C', levels: 3, positions: 4 } });
  await prisma.rack.create({ data: { name: 'D', levels: 3, positions: 4 } });

  async function pallet(data: {
    productId: number; front: number; depth: number; rows: number; loose: number;
    lote?: string; vence?: string; rackId?: number; level?: number; pos?: number;
  }) {
    const created = await prisma.pallet.create({
      data: {
        productId: data.productId,
        front: data.front, depth: data.depth, rows: data.rows, loose: data.loose,
        lote: data.lote ?? '', vence: data.vence ?? '',
        rackId: data.rackId ?? null, level: data.level ?? null, pos: data.pos ?? null,
      },
    });
    await prisma.pallet.update({ where: { id: created.id }, data: { code: palCode(created.id) } });
    await prisma.movement.create({ data: { palletId: created.id, type: 'alta' } });
    if (data.rackId) await prisma.movement.create({ data: { palletId: created.id, type: 'ubicacion', toText: `A-N${data.level}-P${data.pos}` } });
  }

  await pallet({ productId: gal.id, front: 3, depth: 2, rows: 3, loose: 4, lote: 'L-2611', vence: '2027-05-30', rackId: a.id, level: 1, pos: 1 });
  await pallet({ productId: ace.id, front: 2, depth: 2, rows: 4, loose: 0, rackId: a.id, level: 2, pos: 3 });
  await pallet({ productId: gal.id, front: 3, depth: 2, rows: 2, loose: 0, lote: 'L-2609', vence: '2027-03-15' });

  console.log('Datos de ejemplo cargados.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

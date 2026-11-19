import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

/**
 * Datos base del almacén. Es idempotente: se puede correr sobre una base vacía o
 * sobre una con datos, y nunca borra ni pisa lo que ya existe.
 */
const prisma = new PrismaClient();

// Almacén: 4 racks (A, B+C pegados en el centro, D), cada uno de 6 filas × 4 niveles.
const RACKS = ['A', 'B', 'C', 'D'];
const FILAS = 6;
const NIVELES = 4;

const PRODUCTS = [
  {
    code: 'LAV-001', name: 'Lavandina', unit: 'L', color: '#5fa8d3',
    presentations: [{ name: 'Envase 5 L', contentPerUnit: 5, unitsPerBox: 4, front: 5, depth: 2, levels: 4 }],
  },
  {
    code: 'JAB-001', name: 'Jabón en barra', unit: 'un', color: '#e8d9a8',
    presentations: [{ name: 'Barra 200 g', contentPerUnit: 1, unitsPerBox: 24, front: 4, depth: 4, levels: 5 }],
  },
];

async function seedUsers() {
  if ((await prisma.user.count()) > 0) return;
  await prisma.user.create({ data: { username: 'admin', passwordHash: await bcrypt.hash('admin123', 10), role: 'admin' } });
  await prisma.user.create({ data: { username: 'operador', passwordHash: await bcrypt.hash('operador123', 10), role: 'operador' } });
  console.log('Usuarios de ejemplo: admin/admin123 (admin) y operador/operador123 (operador).');
}

async function seedRacks() {
  for (const name of RACKS) {
    const rack = await prisma.rack.findUnique({ where: { name } });
    if (!rack) {
      await prisma.rack.create({ data: { name, levels: NIVELES, positions: FILAS } });
      console.log(`Rack ${name} creado (${FILAS} filas × ${NIVELES} niveles).`);
    } else if (rack.levels < NIVELES || rack.positions < FILAS) {
      // Solo se agranda: así nunca se pierde una posición ocupada.
      await prisma.rack.update({
        where: { name },
        data: { levels: Math.max(rack.levels, NIVELES), positions: Math.max(rack.positions, FILAS) },
      });
      console.log(`Rack ${name} ampliado a ${Math.max(rack.positions, FILAS)} filas × ${Math.max(rack.levels, NIVELES)} niveles.`);
    }
  }
}

async function seedProducts() {
  for (const p of PRODUCTS) {
    if (await prisma.product.findUnique({ where: { code: p.code } })) continue;
    await prisma.product.create({
      data: {
        code: p.code, name: p.name, unit: p.unit, color: p.color,
        presentations: { create: p.presentations },
      },
    });
    console.log(`Producto ${p.code} (${p.name}) creado.`);
  }
}

async function main() {
  await seedUsers();
  await seedRacks();
  await seedProducts();
  console.log('Datos base listos.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

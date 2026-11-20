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

// Categorías de ejemplo: cada rack puede asignarse a una para que no se mezclen.
const CATEGORIES = [
  { name: 'Detergente en polvo', color: '#38bdf8' },
  { name: 'Detergente en barra', color: '#f59e0b' },
  { name: 'Detergente líquido', color: '#34d399' },
];

const PRODUCTS = [
  {
    code: 'LAV-001', name: 'Lavandina', unit: 'L', color: '#5fa8d3', category: 'Detergente líquido',
    presentations: [{ name: 'Envase 5 L', contentPerUnit: 5, unitsPerBox: 4, front: 5, depth: 2, levels: 4 }],
  },
  {
    code: 'JAB-001', name: 'Jabón en barra', unit: 'un', color: '#e8d9a8', category: 'Detergente en barra',
    presentations: [{ name: 'Barra 200 g', contentPerUnit: 1, unitsPerBox: 24, front: 4, depth: 4, levels: 5 }],
  },
];

/**
 * Usuarios iniciales. En producción las contraseñas salen de ADMIN_PASSWORD y
 * OPERADOR_PASSWORD (obligatorias); en desarrollo se usan las de ejemplo.
 */
async function seedUsers() {
  if ((await prisma.user.count()) > 0) return;
  const prod = process.env.NODE_ENV === 'production';
  const adminPass = process.env.ADMIN_PASSWORD || (prod ? '' : 'admin123');
  const operadorPass = process.env.OPERADOR_PASSWORD || (prod ? '' : 'operador123');
  if (!adminPass || !operadorPass) {
    throw new Error('Faltan ADMIN_PASSWORD y/o OPERADOR_PASSWORD para crear los usuarios iniciales.');
  }
  await prisma.user.create({ data: { username: 'admin', passwordHash: await bcrypt.hash(adminPass, 10), role: 'admin' } });
  await prisma.user.create({ data: { username: 'operador', passwordHash: await bcrypt.hash(operadorPass, 10), role: 'operador' } });
  console.log(prod ? 'Usuarios admin y operador creados.' : 'Usuarios de ejemplo: admin/admin123 (admin) y operador/operador123 (operador).');
}

async function seedCategories() {
  for (const c of CATEGORIES) {
    if (await prisma.category.findUnique({ where: { name: c.name } })) continue;
    await prisma.category.create({ data: c });
    console.log(`Categoría "${c.name}" creada.`);
  }
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
    const category = await prisma.category.findUnique({ where: { name: p.category } });
    await prisma.product.create({
      data: {
        code: p.code, name: p.name, unit: p.unit, color: p.color, categoryId: category?.id ?? null,
        presentations: { create: p.presentations },
      },
    });
    console.log(`Producto ${p.code} (${p.name}) creado.`);
  }
}

async function main() {
  // En producción el seed corre en cada arranque: solo carga datos en una base vacía,
  // para no revivir racks o productos que alguien haya borrado a propósito.
  if (process.env.NODE_ENV === 'production') {
    const empty = (await prisma.rack.count()) === 0 && (await prisma.product.count()) === 0;
    await seedUsers();
    if (empty) {
      await seedCategories();
      await seedRacks();
      await seedProducts();
    }
    console.log('Datos base listos.');
    return;
  }
  await seedUsers();
  await seedCategories();
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

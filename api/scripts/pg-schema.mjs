// Genera prisma/postgres/schema.prisma a partir de prisma/schema.prisma (SQLite, desarrollo),
// cambiando solo el proveedor. Así hay un único modelo de datos y producción usa PostgreSQL.
//   node scripts/pg-schema.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const src = readFileSync('prisma/schema.prisma', 'utf8');
const out = src.replace(/provider\s*=\s*"sqlite"/, 'provider = "postgresql"');
if (out === src) throw new Error('No se encontró provider = "sqlite" en prisma/schema.prisma');

mkdirSync('prisma/postgres', { recursive: true });
writeFileSync(
  'prisma/postgres/schema.prisma',
  '// ARCHIVO GENERADO por scripts/pg-schema.mjs: no editar. Se edita prisma/schema.prisma.\n' + out,
);
console.log('prisma/postgres/schema.prisma actualizado.');

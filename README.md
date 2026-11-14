# Inventario de almacén 3D

Control de inventario de un almacén donde el conteo se hace de forma visual: se arma cada
pallet en 3D (cajas de base × filas de alto + cajas sueltas) y se ubica en una posición de un rack.

Reescritura del prototipo (`prototipo.html`) como proyecto real.

## Stack

- **web/** — Vite + React + TypeScript + React Three Fiber/Drei + Tailwind CSS + shadcn/ui + Zustand + TanStack Query.
- **api/** — NestJS + Prisma + PostgreSQL, con OpenAPI (Swagger).

## Requisitos

- Node.js 20+ (probado con 24) y npm.
- PostgreSQL 17 local **o** Docker (ver más abajo).

## Puesta en marcha

### 1. API y base de datos (carpeta `api/`)

En desarrollo la base es **SQLite** (un archivo local, sin servidor). El mismo
esquema de Prisma sirve para PostgreSQL en producción: se cambia `provider` a
`postgresql` en `prisma/schema.prisma` y se vuelve a migrar.

```bash
cd api
cp .env.example .env
npm install
npx prisma migrate dev   # crea la base SQLite y la siembra con datos de ejemplo
npm run start:dev
```

- API: http://localhost:3000/api
- Health: http://localhost:3000/api/health
- Documentación OpenAPI: http://localhost:3000/docs

### 2. Frontend (carpeta `web/`)

```bash
cd web
npm install
npm run dev
```

- Página: http://localhost:5173

## Etapas del proyecto

0. **Base del proyecto y tooling** (esta etapa).
1. Armador de pallets en React Three Fiber.
2. Productos y almacén.
3. Servidor, base de datos y conexión (modelo Prisma completo).
4. Funciones nuevas: resumen de stock, historial de movimientos, usuarios, exportar/importar.
5. (Opcional) Tiempo real.

## Notas

- Interfaz y mensajes en español; tema claro y oscuro; pensado también para teléfono.
- La validación autoritativa vive en la API; el frontend la repite solo como ayuda de UX.

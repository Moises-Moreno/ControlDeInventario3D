# Publicar en internet (Render + Neon)

La app se publica como **un solo servicio web en Render**: la API de NestJS sirve también la web
compilada, así que hay una sola dirección (por ejemplo `https://inventario3d.onrender.com`).
La base de datos es **PostgreSQL en Neon**. Las dos tienen plan gratuito.

En tu PC se sigue usando SQLite (`api/prisma/schema.prisma`). Para producción, el build genera
`api/prisma/postgres/schema.prisma` con el mismo modelo y usa las migraciones de
`api/prisma/postgres/migrations`.

## 1. Base de datos en Neon

1. Creá una cuenta en <https://neon.tech> (podés entrar con GitHub).
2. **New project**: nombre `inventario3d`, Postgres 17, región **AWS US East 2 (Ohio)**,
   la misma región que usa Render en `render.yaml`.
3. En el panel del proyecto tocá **Connect**:
   - desactivá **Connection pooling** (Prisma necesita la conexión directa para migrar);
   - copiá la cadena de conexión. Tiene esta forma:
     `postgresql://usuario:clave@ep-xxxx.us-east-2.aws.neon.tech/neondb?sslmode=require`
   - si al final dice `&channel_binding=require`, borrá esa parte y dejá `?sslmode=require`.
4. Guardala en un lugar seguro: es la clave de tu base. No la subas a GitHub.

## 2. Subir el código a GitHub

Render publica desde el repositorio. El código tiene que estar en la rama `main` de
`https://github.com/Moises-Moreno/ControlDeInventario3D`:

```powershell
git push origin main
```

## 3. Servicio en Render

1. Creá una cuenta en <https://render.com> con **GitHub**, y dale acceso al repositorio
   `ControlDeInventario3D` cuando lo pida.
2. **New → Blueprint** y elegí el repositorio. Render lee `render.yaml` y te pide tres valores:
   - `DATABASE_URL`: la cadena de Neon del paso 1;
   - `ADMIN_PASSWORD`: la contraseña del usuario `admin` (solo vos);
   - `OPERADOR_PASSWORD`: la contraseña del usuario `operador` (la que compartís con quienes prueban).
   `JWT_SECRET` lo genera Render solo.
3. **Apply**. El primer build tarda unos 5 minutos. Al terminar:
   - se crean las tablas (`prisma migrate deploy`);
   - se cargan los usuarios, los 4 racks (A, B, C, D de 6 filas × 4 niveles) y 2 productos de ejemplo,
     solo si la base está vacía;
   - la app queda en la dirección que muestra Render arriba a la izquierda.

Las contraseñas solo se usan al crear los usuarios la primera vez. Cambiar la variable después no
cambia la contraseña de un usuario que ya existe.

## 4. Pasar tus datos de la PC

1. En tu PC (`http://localhost:5173`), entrá como admin → **Resumen → Exportar**.
2. En la app publicada, entrá como admin → **Resumen → Importar** y elegí ese archivo.

Importar **reemplaza** todos los productos, racks, pallets y recepciones de la app publicada.

## Cosas a tener en cuenta

- **Plan gratuito de Render:** si nadie la usa por ~15 minutos, el servicio se duerme. La primera
  visita después tarda 30–50 segundos en responder; después anda normal.
- **Cada `git push` a `main` vuelve a publicar** la app automáticamente.
- **Si cambiás el modelo de datos** (`api/prisma/schema.prisma`), además de la migración de SQLite
  hay que agregar la de PostgreSQL en `api/prisma/postgres/migrations/` antes de publicar.
  Si no, producción no tendrá las columnas nuevas.
- Los usuarios que prueban deberían entrar como **operador**: no pueden borrar productos ni importar.

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextFunction, Request, Response } from 'express';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

const isProd = process.env.NODE_ENV === 'production';

/** Carpeta con la web compilada (web/dist). En producción la API también sirve la web. */
const WEB_DIST = process.env.WEB_DIST ?? fileURLToPath(new URL('../../web/dist', import.meta.url));

async function bootstrap() {
  if (isProd && !process.env.JWT_SECRET) {
    throw new Error('Falta la variable JWT_SECRET (obligatoria en producción).');
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Las recepciones llevan fotos y firma (data URL): el límite por defecto (100 kb) se queda corto.
  app.useBodyParser('json', { limit: '12mb' });

  // Todas las rutas quedan bajo /api
  app.setGlobalPrefix('api');

  // CORS: en desarrollo aceptamos cualquier localhost (Vite cambia de puerto). En producción
  // la web se sirve desde el mismo dominio y no lo necesita; WEB_ORIGIN suma otros orígenes.
  const extraOrigins = (process.env.WEB_ORIGIN ?? '').split(',').map((o) => o.trim()).filter(Boolean);
  app.enableCors({
    origin: [/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/, ...extraOrigins],
    credentials: true,
  });

  // La web compilada: archivos estáticos y, para cualquier otra ruta que no sea de la API
  // ni de la documentación, index.html (la navegación la resuelve React).
  const index = join(WEB_DIST, 'index.html');
  const servesWeb = existsSync(index);
  if (servesWeb) {
    app.useStaticAssets(WEB_DIST, { index: false, maxAge: '1h' });
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.method !== 'GET' || req.path.startsWith('/api') || req.path.startsWith('/docs')) return next();
      res.sendFile(index);
    });
  }

  // Validación global: descarta campos no declarados y transforma los DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Documentación OpenAPI en /docs
  const config = new DocumentBuilder()
    .setTitle('Inventario de almacén 3D — API')
    .setDescription('API del sistema de inventario (NestJS + Prisma + PostgreSQL)')
    .setVersion('0.1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`API escuchando en http://localhost:${port}/api (docs en /docs)${servesWeb ? " · web en /" : ""}`);
}
await bootstrap();

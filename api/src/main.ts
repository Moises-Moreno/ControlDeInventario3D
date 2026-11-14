import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Todas las rutas quedan bajo /api
  app.setGlobalPrefix('api');

  // CORS para el frontend de Vite (configurable por WEB_ORIGIN)
  const origins = (process.env.WEB_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim());
  app.enableCors({ origin: origins, credentials: true });

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
  console.log(`API escuchando en http://localhost:${port}/api (docs en /docs)`);
}
await bootstrap();

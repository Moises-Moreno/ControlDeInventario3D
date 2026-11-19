import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Las recepciones llevan fotos y firma (data URL): el límite por defecto (100 kb) se queda corto.
  app.useBodyParser('json', { limit: '12mb' });

  // Todas las rutas quedan bajo /api
  app.setGlobalPrefix('api');

  // CORS: en desarrollo aceptamos cualquier localhost (Vite cambia de puerto).
  app.enableCors({
    origin: [/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/],
    credentials: true,
  });

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

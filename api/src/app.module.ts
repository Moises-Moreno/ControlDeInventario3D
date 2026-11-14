import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module.js';
import { HealthModule } from './health/health.module.js';
import { ProductsModule } from './products/products.module.js';
import { RacksModule } from './racks/racks.module.js';
import { PalletsModule } from './pallets/pallets.module.js';
import { MovementsModule } from './movements/movements.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    HealthModule,
    ProductsModule,
    RacksModule,
    PalletsModule,
    MovementsModule,
  ],
})
export class AppModule {}

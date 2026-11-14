import { Module } from '@nestjs/common';
import { MovementsController } from './movements.controller.js';

@Module({
  controllers: [MovementsController],
})
export class MovementsModule {}

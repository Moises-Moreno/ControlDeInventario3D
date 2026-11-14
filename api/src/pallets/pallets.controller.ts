import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PalletsService } from './pallets.service.js';
import { CreatePalletDto, PlaceDto } from './dto.js';

@ApiTags('pallets')
@Controller('pallets')
export class PalletsController {
  constructor(private readonly pallets: PalletsService) {}

  @Get()
  list() {
    return this.pallets.list();
  }

  @Post()
  create(@Body() dto: CreatePalletDto) {
    return this.pallets.create(dto);
  }

  @Patch(':id')
  recount(@Param('id', ParseIntPipe) id: number, @Body() dto: CreatePalletDto) {
    return this.pallets.recount(id, dto);
  }

  @Post(':id/ubicacion')
  place(@Param('id', ParseIntPipe) id: number, @Body() dto: PlaceDto) {
    return this.pallets.place(id, dto);
  }

  @Delete(':id/ubicacion')
  unplace(@Param('id', ParseIntPipe) id: number) {
    return this.pallets.unplace(id);
  }

  @Post(':id/baja')
  baja(@Param('id', ParseIntPipe) id: number) {
    return this.pallets.baja(id);
  }
}

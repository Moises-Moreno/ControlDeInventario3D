import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PalletsService } from './pallets.service.js';
import { CreatePalletDto, PlaceDto } from './dto.js';
import { CurrentUser, type AuthUser } from '../auth/decorators.js';

@ApiTags('pallets')
@Controller('pallets')
export class PalletsController {
  constructor(private readonly pallets: PalletsService) {}

  @Get()
  list() {
    return this.pallets.list();
  }

  @Post()
  create(@Body() dto: CreatePalletDto, @CurrentUser() user: AuthUser) {
    return this.pallets.create(dto, user.username);
  }

  @Patch(':id')
  recount(@Param('id', ParseIntPipe) id: number, @Body() dto: CreatePalletDto, @CurrentUser() user: AuthUser) {
    return this.pallets.recount(id, dto, user.username);
  }

  @Post(':id/ubicacion')
  place(@Param('id', ParseIntPipe) id: number, @Body() dto: PlaceDto, @CurrentUser() user: AuthUser) {
    return this.pallets.place(id, dto, user.username);
  }

  @Delete(':id/ubicacion')
  unplace(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.pallets.unplace(id, user.username);
  }

  @Post(':id/baja')
  baja(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.pallets.baja(id, user.username);
  }
}

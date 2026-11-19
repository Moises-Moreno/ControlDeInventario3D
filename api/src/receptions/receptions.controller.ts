import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ReceptionsService } from './receptions.service.js';
import { CreateReceptionDto } from './dto.js';
import { CurrentUser, Roles, type AuthUser } from '../auth/decorators.js';

@ApiTags('recepciones')
@Controller('receptions')
export class ReceptionsController {
  constructor(private readonly receptions: ReceptionsService) {}

  @Get()
  list() {
    return this.receptions.list();
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.receptions.get(id);
  }

  @Post()
  create(@Body() dto: CreateReceptionDto, @CurrentUser() user: AuthUser) {
    return this.receptions.create(dto, user.username);
  }

  @Roles('admin')
  @Post(':id/anular')
  annul(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.receptions.annul(id, user.username);
  }
}

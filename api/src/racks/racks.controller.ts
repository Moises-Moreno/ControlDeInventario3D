import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RacksService } from './racks.service.js';
import { UpdateRackDto } from './dto.js';
import { Roles } from '../auth/decorators.js';

@ApiTags('racks')
@Controller('racks')
export class RacksController {
  constructor(private readonly racks: RacksService) {}

  @Get()
  list() {
    return this.racks.list();
  }

  @Roles('admin')
  @Post()
  create() {
    return this.racks.create();
  }

  @Roles('admin')
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRackDto) {
    return this.racks.update(id, dto);
  }

  @Roles('admin')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.racks.remove(id);
  }
}

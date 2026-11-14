import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RacksService } from './racks.service.js';
import { UpdateRackDto } from './dto.js';

@ApiTags('racks')
@Controller('racks')
export class RacksController {
  constructor(private readonly racks: RacksService) {}

  @Get()
  list() {
    return this.racks.list();
  }

  @Post()
  create() {
    return this.racks.create();
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRackDto) {
    return this.racks.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.racks.remove(id);
  }
}

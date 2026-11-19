import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ProductsService } from './products.service.js';
import { ProductDto } from './dto.js';
import { Roles } from '../auth/decorators.js';

@ApiTags('productos')
@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  list() {
    return this.products.list();
  }

  @Post()
  create(@Body() data: ProductDto) {
    return this.products.create(data);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() data: ProductDto) {
    return this.products.update(id, data);
  }

  @Roles('admin')
  @Get(':id/uso')
  usage(@Param('id', ParseIntPipe) id: number) {
    return this.products.usage(id);
  }

  /** Solo admin. Con ?cascade=true borra también pallets, movimientos y líneas de recepción. */
  @Roles('admin')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Query('cascade') cascade?: string) {
    return this.products.remove(id, cascade === 'true');
  }
}

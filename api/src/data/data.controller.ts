import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DataService } from './data.service.js';
import { ImportDto } from './dto.js';
import { Roles } from '../auth/decorators.js';

@ApiTags('datos')
@Controller('data')
export class DataController {
  constructor(private readonly data: DataService) {}

  @Get('export')
  export() {
    return this.data.export();
  }

  @Roles('admin')
  @Post('import')
  import(@Body() dto: ImportDto) {
    return this.data.import(dto);
  }
}

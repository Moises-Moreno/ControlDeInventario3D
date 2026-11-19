import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsInt, IsOptional, IsString } from 'class-validator';

export class ImportDto {
  @ApiProperty({ example: 2 })
  @IsInt()
  version!: number;

  @ApiPropertyOptional({ description: 'Marca de tiempo de exportación (se ignora al importar).' })
  @IsOptional()
  @IsString()
  exportedAt?: string;

  @ApiProperty({ type: [Object] })
  @IsArray()
  products!: unknown[];

  @ApiProperty({ type: [Object] })
  @IsArray()
  presentations!: unknown[];

  @ApiProperty({ type: [Object] })
  @IsArray()
  racks!: unknown[];

  @ApiProperty({ type: [Object] })
  @IsArray()
  pallets!: unknown[];

  @ApiPropertyOptional({ type: [Object] })
  @IsOptional()
  @IsArray()
  receptions?: unknown[];
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';
import { MAX_LEVELS, MAX_POS } from '../common/limits.js';

export class UpdateRackDto {
  @ApiPropertyOptional({ example: 'A', description: '1 a 3 letras, único.' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z]{1,3}$/, { message: 'El rack necesita un nombre de 1 a 3 letras.' })
  name?: string;

  @ApiPropertyOptional({ example: 3, minimum: 1, maximum: MAX_LEVELS })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_LEVELS, { message: `Hasta ${MAX_LEVELS} niveles por rack.` })
  levels?: number;

  @ApiPropertyOptional({ example: 4, minimum: 1, maximum: MAX_POS })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_POS, { message: `Hasta ${MAX_POS} posiciones por nivel.` })
  positions?: number;
}

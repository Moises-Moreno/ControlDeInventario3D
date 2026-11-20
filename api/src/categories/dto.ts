import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CategoryDto {
  @ApiProperty({ example: 'Detergente en polvo' })
  @IsString()
  @IsNotEmpty({ message: 'Escribe el nombre de la categoría.' })
  @MaxLength(40, { message: 'El nombre no puede tener más de 40 caracteres.' })
  name!: string;

  @ApiPropertyOptional({ example: '#64748b', description: 'Color en hexadecimal.' })
  @IsOptional()
  @Matches(/^#[0-9a-fA-F]{6}$/, { message: 'El color debe ser un hexadecimal como #64748b.' })
  color?: string;
}

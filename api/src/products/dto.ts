import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

export class ProductDto {
  @ApiProperty({ example: 'GAL-012', description: 'Código único (se guarda en mayúsculas).' })
  @IsString()
  @IsNotEmpty({ message: 'Escribe un código para el producto.' })
  @MaxLength(20, { message: 'El código no puede tener más de 20 caracteres.' })
  code!: string;

  @ApiProperty({ example: 'Galletas de avena 200 g' })
  @IsString()
  @IsNotEmpty({ message: 'Escribe el nombre del producto.' })
  @MaxLength(60, { message: 'El nombre no puede tener más de 60 caracteres.' })
  name!: string;

  @ApiProperty({ example: 24, minimum: 1 })
  @IsInt({ message: 'Las unidades por caja deben ser un número entero.' })
  @Min(1, { message: 'Las unidades por caja deben ser 1 o más.' })
  @Max(9999)
  unitsPerBox!: number;

  @ApiProperty({ example: '#c89a5a', description: 'Color de la caja en hexadecimal.' })
  @Matches(/^#[0-9a-fA-F]{6}$/, { message: 'El color debe ser un hexadecimal como #c89a5a.' })
  color!: string;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

/** Foto como data URL (ya reducida por el frontend). */
export const IMAGE_DATA_URL = /^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/;

export class PresentationDto {
  @ApiPropertyOptional({ description: 'Id existente (si se edita una presentación).' })
  @IsOptional()
  @IsInt()
  id?: number;

  @ApiProperty({ example: 'Envase 5 L' })
  @IsString()
  @IsNotEmpty({ message: 'Escribe el nombre de la presentación.' })
  @MaxLength(40, { message: 'El nombre de la presentación no puede tener más de 40 caracteres.' })
  name!: string;

  @ApiProperty({ example: 5, description: 'Contenido de cada envase en la unidad del producto.' })
  @IsNumber({}, { message: 'El contenido por envase debe ser un número.' })
  @IsPositive({ message: 'El contenido por envase debe ser mayor que 0.' })
  contentPerUnit!: number;

  @ApiProperty({ example: 4, description: 'Envases por caja.' })
  @IsInt({ message: 'Los envases por caja deben ser un número entero.' })
  @Min(1, { message: 'Los envases por caja deben ser 1 o más.' })
  @Max(9999)
  unitsPerBox!: number;

  @ApiProperty({ example: 5, minimum: 1, maximum: 6 })
  @IsInt() @Min(1, { message: 'El frente del pallet va de 1 a 6 cajas.' }) @Max(6, { message: 'El frente del pallet va de 1 a 6 cajas.' })
  front!: number;

  @ApiProperty({ example: 2, minimum: 1, maximum: 6 })
  @IsInt() @Min(1, { message: 'El fondo del pallet va de 1 a 6 cajas.' }) @Max(6, { message: 'El fondo del pallet va de 1 a 6 cajas.' })
  depth!: number;

  @ApiProperty({ example: 4, minimum: 1, maximum: 10, description: 'Niveles de alto de un pallet completo.' })
  @IsInt() @Min(1, { message: 'Un pallet completo tiene de 1 a 10 niveles.' }) @Max(10, { message: 'Un pallet completo tiene de 1 a 10 niveles.' })
  levels!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class ProductDto {
  @ApiProperty({ example: 'LAV-001', description: 'Id / código único (se guarda en mayúsculas).' })
  @IsString()
  @IsNotEmpty({ message: 'Escribe un código para el producto.' })
  @MaxLength(20, { message: 'El código no puede tener más de 20 caracteres.' })
  code!: string;

  @ApiProperty({ example: 'Lavandina' })
  @IsString()
  @IsNotEmpty({ message: 'Escribe el nombre del producto.' })
  @MaxLength(60, { message: 'El nombre no puede tener más de 60 caracteres.' })
  name!: string;

  @ApiProperty({ example: 'L', description: 'Unidad de medida del contenido (L, kg, un...).' })
  @IsString()
  @IsNotEmpty({ message: 'Elige la unidad de medida.' })
  @MaxLength(10)
  unit!: string;

  @ApiProperty({ example: '#c89a5a', description: 'Color de la caja en hexadecimal.' })
  @Matches(/^#[0-9a-fA-F]{6}$/, { message: 'El color debe ser un hexadecimal como #c89a5a.' })
  color!: string;

  @ApiPropertyOptional({ description: 'Foto del producto como data URL. null para quitarla.' })
  @IsOptional()
  @IsString()
  @MaxLength(700_000, { message: 'La foto es demasiado pesada.' })
  @Matches(IMAGE_DATA_URL, { message: 'La foto debe ser una imagen PNG, JPEG o WebP.' })
  photo?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ nullable: true, description: 'Categoría del producto (define en qué racks puede ir). null = sin categoría.' })
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsInt()
  categoryId?: number | null;

  @ApiPropertyOptional({ type: [PresentationDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => PresentationDto)
  presentations?: PresentationDto[];
}

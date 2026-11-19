import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { IMAGE_DATA_URL } from '../products/dto.js';

export class ReceptionLineDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  presentationId!: number;

  @ApiProperty({ example: 5000, description: 'Cantidad recibida en la unidad del producto (p. ej. litros).' })
  @IsNumber({}, { message: 'La cantidad debe ser un número.' })
  @IsPositive({ message: 'La cantidad recibida debe ser mayor que 0.' })
  quantity!: number;

  @ApiPropertyOptional({ example: 'L-2611' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  lote?: string;

  @ApiPropertyOptional({ example: '2027-05-30' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  vence?: string;
}

export class CreateReceptionDto {
  @ApiProperty({ type: [ReceptionLineDto] })
  @IsArray()
  @ArrayMinSize(1, { message: 'Agrega al menos un producto a la recepción.' })
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => ReceptionLineDto)
  lines!: ReceptionLineDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Las observaciones no pueden pasar de 1000 caracteres.' })
  observations?: string;

  @ApiPropertyOptional({ description: 'Firma de quien recepciona (data URL).' })
  @IsOptional()
  @IsString()
  @MaxLength(400_000, { message: 'La firma es demasiado pesada.' })
  @Matches(IMAGE_DATA_URL, { message: 'La firma debe ser una imagen.' })
  signature?: string;

  @ApiPropertyOptional({ type: [String], description: 'Fotos del estado de la mercadería (data URL).' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8, { message: 'Se pueden adjuntar hasta 8 fotos.' })
  @IsString({ each: true })
  @MaxLength(900_000, { each: true, message: 'Una foto es demasiado pesada.' })
  @Matches(IMAGE_DATA_URL, { each: true, message: 'Las fotos deben ser imágenes PNG, JPEG o WebP.' })
  photos?: string[];
}

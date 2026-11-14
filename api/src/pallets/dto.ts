import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreatePalletDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  productId!: number;

  @ApiProperty({ example: 3, minimum: 1, maximum: 6 })
  @IsInt() @Min(1) @Max(6)
  front!: number;

  @ApiProperty({ example: 2, minimum: 1, maximum: 6 })
  @IsInt() @Min(1) @Max(6)
  depth!: number;

  @ApiProperty({ example: 3, minimum: 0, maximum: 10 })
  @IsInt() @Min(0) @Max(10)
  rows!: number;

  @ApiProperty({ example: 4, minimum: 0, maximum: 35 })
  @IsInt() @Min(0) @Max(35)
  loose!: number;

  @ApiPropertyOptional({ example: 'L-2611' })
  @IsOptional() @IsString() @MaxLength(20)
  lote?: string;

  @ApiPropertyOptional({ example: '2027-05-30' })
  @IsOptional() @IsString() @MaxLength(10)
  vence?: string;
}

export class PlaceDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  rackId!: number;

  @ApiProperty({ example: 2, minimum: 1 })
  @IsInt() @Min(1)
  level!: number;

  @ApiProperty({ example: 3, minimum: 1 })
  @IsInt() @Min(1)
  pos!: number;
}

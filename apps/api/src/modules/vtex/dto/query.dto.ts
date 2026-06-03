import { IsString, IsOptional, IsIn, IsNotEmpty } from 'class-validator';

export class QueryOrdersDto {
  @IsString()
  @IsOptional()
  orderId?: string;

  @IsString()
  @IsOptional()
  email?: string;
}

export class QueryProductsDto {
  @IsString()
  @IsNotEmpty()
  q!: string;
}

export class OpenClawToolDto {
  @IsString()
  @IsIn(['get_order', 'search_products'])
  tool!: 'get_order' | 'search_products';

  params!: Record<string, unknown>;
}

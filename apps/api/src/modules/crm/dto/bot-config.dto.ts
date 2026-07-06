import { IsString, IsOptional, IsBoolean, IsArray, IsEnum } from 'class-validator';
import { BotCategory } from '@autoclaw/shared';

export class CreateBotConfigDto {
  @IsEnum(BotCategory)
  category!: BotCategory;

  @IsString()
  @IsOptional()
  prompt?: string;

  @IsArray()
  @IsOptional()
  keywords?: string[];

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}

export class UpdateBotConfigDto {
  @IsString()
  @IsOptional()
  prompt?: string;

  @IsArray()
  @IsOptional()
  keywords?: string[];

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}

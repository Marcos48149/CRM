import { IsString, IsOptional, MinLength, IsUrl } from 'class-validator';

export class CreatePostDto {
  @IsString()
  @IsUrl({ protocols: ['https'] })
  imageUrl!: string;

  @IsString()
  @MinLength(1)
  caption!: string;

  @IsOptional()
  @IsString()
  scheduledAt?: string;
}

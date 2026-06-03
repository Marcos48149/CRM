import { IsString, MinLength } from 'class-validator';

export class ConnectInstagramDto {
  @IsString()
  @MinLength(1)
  accessToken!: string;

  @IsString()
  @MinLength(1)
  instagramAccountId!: string;
}

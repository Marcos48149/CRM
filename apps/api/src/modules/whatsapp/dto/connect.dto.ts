import { IsString, MinLength } from 'class-validator';

export class ConnectWhatsAppDto {
  @IsString()
  @MinLength(1)
  phoneNumberId!: string;

  @IsString()
  @MinLength(1)
  accessToken!: string;

  @IsString()
  @MinLength(1)
  webhookSecret!: string;
}

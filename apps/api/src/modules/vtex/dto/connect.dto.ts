import { IsString, IsNotEmpty } from 'class-validator';

export class ConnectVtexDto {
  @IsString()
  @IsNotEmpty()
  accountName!: string;

  @IsString()
  @IsNotEmpty()
  appKey!: string;

  @IsString()
  @IsNotEmpty()
  appToken!: string;
}

import { IsIn, IsString } from 'class-validator';

export class SubscribeDto {
  @IsString()
  @IsIn(['PRO', 'ENTERPRISE'])
  plan!: 'PRO' | 'ENTERPRISE';
}

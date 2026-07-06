import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ConversationStatus } from '@autoclaw/shared';

export class CreateConversationDto {
  @IsString()
  contactId!: string;

  @IsString()
  @IsOptional()
  channel?: string;

  @IsEnum(ConversationStatus)
  @IsOptional()
  status?: ConversationStatus;
}

export class UpdateConversationDto {
  @IsEnum(ConversationStatus)
  @IsOptional()
  status?: ConversationStatus;

  @IsString()
  @IsOptional()
  assignedTo?: string;
}

export class ConversationQueryDto {
  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  contactId?: string;

  @IsOptional()
  skip?: number;

  @IsOptional()
  take?: number;
}

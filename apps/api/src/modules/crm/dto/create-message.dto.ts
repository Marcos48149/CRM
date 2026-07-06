import { IsString, IsOptional, IsEnum } from 'class-validator';
import { MessageDirection, MessageRole, MessageStatus } from '@autoclaw/shared';

export class CreateMessageDto {
  @IsString()
  conversationId!: string;

  @IsEnum(MessageRole)
  role!: MessageRole;

  @IsString()
  content!: string;

  @IsString()
  @IsOptional()
  messageType?: string;

  @IsEnum(MessageDirection)
  @IsOptional()
  direction?: MessageDirection;

  @IsEnum(MessageStatus)
  @IsOptional()
  status?: MessageStatus;

  @IsString()
  @IsOptional()
  whatsappMsgId?: string;

  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class MessageQueryDto {
  @IsString()
  @IsOptional()
  conversationId?: string;

  @IsOptional()
  skip?: number;

  @IsOptional()
  take?: number;
}

import { IsString, IsOptional } from 'class-validator';

export class CreateTagDto {
  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  color?: string;
}

export class CreateAgentNoteDto {
  @IsString()
  content!: string;

  @IsString()
  conversationId!: string;

  @IsString()
  authorId!: string;
}

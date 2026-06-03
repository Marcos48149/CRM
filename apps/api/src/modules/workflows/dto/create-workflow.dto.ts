import { IsString, IsArray, ValidateNested, MinLength, ArrayMinSize, IsIn, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class WorkflowConditionDto {
  @IsString()
  @MinLength(1)
  field!: string;

  @IsString()
  @IsIn(['contains', 'equals', 'startsWith', 'endsWith'])
  operator!: string;

  @IsString()
  @MinLength(1)
  value!: string;
}

export class WorkflowActionDto {
  @IsString()
  @IsIn(['QUERY_OPENCLAW', 'SEND_REPLY'])
  type!: string;

  @IsOptional()
  @IsString()
  prompt?: string;

  @IsOptional()
  @IsString()
  channel?: string;
}

export class CreateWorkflowDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @MinLength(1)
  trigger!: string;

  @IsArray()
  @ArrayMinSize(0)
  @ValidateNested({ each: true })
  @Type(() => WorkflowConditionDto)
  conditions!: WorkflowConditionDto[];

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => WorkflowActionDto)
  actions!: WorkflowActionDto[];
}

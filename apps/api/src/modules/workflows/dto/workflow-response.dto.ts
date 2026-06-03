import { Condition, Action } from '../workflow-executor.service';

export class WorkflowResponseDto {
  id!: string;
  tenantId!: string;
  name!: string;
  trigger!: string;
  conditions!: Condition[];
  actions!: Action[];
  active!: boolean;
  createdAt!: Date;
}

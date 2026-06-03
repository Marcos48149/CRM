import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { WorkflowResponseDto } from './dto/workflow-response.dto';
import { WorkflowExecutorService, WorkflowResult, Condition, Action } from './workflow-executor.service';
import { UsageService } from '../tenants/usage.service';

interface WorkflowData {
  id: string;
  tenantId: string;
  name: string;
  trigger: string;
  conditions: Condition[];
  actions: Action[];
  active: boolean;
  createdAt: Date;
}

@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name);
  private workflows = new Map<string, WorkflowData>();
  private idCounter = 0;

  constructor(
    private readonly executor: WorkflowExecutorService,
    private readonly usageService: UsageService,
  ) {}

  async findAll(tenantId: string, page = 1, limit = 20): Promise<{ data: WorkflowResponseDto[]; total: number; page: number; limit: number }> {
    const all: WorkflowResponseDto[] = [];
    for (const wf of this.workflows.values()) {
      if (wf.tenantId === tenantId) {
        all.push(this.toDto(wf));
      }
    }

    const total = all.length;
    const start = (page - 1) * limit;
    const data = all.slice(start, start + limit);

    return { data, total, page, limit };
  }

  async create(
    tenantId: string,
    dto: CreateWorkflowDto,
  ): Promise<WorkflowResponseDto> {
    const withinLimit = await this.usageService.isWithinLimit(tenantId, 'activeWorkflows');
    if (!withinLimit) {
      throw new BadRequestException(
        'Has alcanzado el límite de workflows activos de tu plan. Actualizá tu plan en autoclaw.app',
      );
    }

    const workflow: WorkflowData = {
      id: `wf-${++this.idCounter}`,
      tenantId,
      name: dto.name,
      trigger: dto.trigger,
      conditions: dto.conditions as Condition[],
      actions: dto.actions as Action[],
      active: true,
      createdAt: new Date(),
    };

    this.workflows.set(workflow.id, workflow);
    this.logger.log(`Workflow ${workflow.id} created for tenant ${tenantId}`);

    return this.toDto(workflow);
  }

  async update(
    tenantId: string,
    workflowId: string,
    dto: UpdateWorkflowDto,
  ): Promise<WorkflowResponseDto> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new NotFoundException('Workflow no encontrado');
    }
    if (workflow.tenantId !== tenantId) {
      throw new ForbiddenException('No tenés permiso para modificar este workflow');
    }

    const updated: WorkflowData = {
      ...workflow,
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.trigger !== undefined && { trigger: dto.trigger }),
      ...(dto.conditions !== undefined && { conditions: dto.conditions as Condition[] }),
      ...(dto.actions !== undefined && { actions: dto.actions as Action[] }),
    };

    this.workflows.set(workflowId, updated);
    return this.toDto(updated);
  }

  async delete(tenantId: string, workflowId: string): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new NotFoundException('Workflow no encontrado');
    }
    if (workflow.tenantId !== tenantId) {
      throw new ForbiddenException('No tenés permiso para eliminar este workflow');
    }

    this.workflows.delete(workflowId);
    this.logger.log(`Workflow ${workflowId} deleted`);
  }

  async toggle(tenantId: string, workflowId: string): Promise<WorkflowResponseDto> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new NotFoundException('Workflow no encontrado');
    }
    if (workflow.tenantId !== tenantId) {
      throw new ForbiddenException('No tenés permiso para modificar este workflow');
    }

    const activating = !workflow.active;
    if (activating) {
      const withinLimit = await this.usageService.isWithinLimit(tenantId, 'activeWorkflows');
      if (!withinLimit) {
        throw new BadRequestException(
          'Has alcanzado el límite de workflows activos de tu plan. Actualizá tu plan en autoclaw.app',
        );
      }
    }

    workflow.active = activating;
    this.workflows.set(workflowId, workflow);

    return this.toDto(workflow);
  }

  async findActiveByTrigger(
    tenantId: string,
    trigger: string,
  ): Promise<WorkflowData[]> {
    const result: WorkflowData[] = [];
    for (const wf of this.workflows.values()) {
      if (wf.tenantId === tenantId && wf.active && wf.trigger === trigger) {
        result.push(wf);
      }
    }
    return result;
  }

  getActiveWorkflowCount(tenantId: string): number {
    let count = 0;
    for (const wf of this.workflows.values()) {
      if (wf.tenantId === tenantId && wf.active) {
        count++;
      }
    }
    return count;
  }

  async executeMatchingWorkflows(
    tenantId: string,
    trigger: string,
    eventData: Record<string, unknown>,
    sendReply: (channel: string, text: string) => Promise<void>,
  ): Promise<WorkflowResult[]> {
    const workflows = await this.findActiveByTrigger(tenantId, trigger);
    if (workflows.length === 0) return [];

    const results: WorkflowResult[] = [];

    for (const wf of workflows) {
      const result = await this.executor.executeWorkflow(
        wf,
        { type: trigger, data: eventData },
        sendReply,
      );
      results.push(result);
    }

    return results;
  }

  private toDto(workflow: WorkflowData): WorkflowResponseDto {
    return {
      id: workflow.id,
      tenantId: workflow.tenantId,
      name: workflow.name,
      trigger: workflow.trigger,
      conditions: workflow.conditions,
      actions: workflow.actions,
      active: workflow.active,
      createdAt: workflow.createdAt,
    };
  }
}

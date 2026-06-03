import { Injectable, Logger } from '@nestjs/common';

export interface Condition {
  field: string;
  operator: 'contains' | 'equals' | 'startsWith' | 'endsWith';
  value: string;
}

export interface Action {
  type: 'QUERY_OPENCLAW' | 'SEND_REPLY';
  prompt?: string;
  channel?: string;
}

export interface Workflow {
  id: string;
  conditions: Condition[];
  actions: Action[];
}

type EventData = Record<string, unknown>;

interface StepResult {
  actionIndex: number;
  actionType: string;
  success: boolean;
  output?: string;
  error?: string;
}

export interface WorkflowResult {
  matched: boolean;
  steps: StepResult[];
}

@Injectable()
export class WorkflowExecutorService {
  private readonly logger = new Logger(WorkflowExecutorService.name);

  async executeWorkflow(
    workflow: Workflow,
    event: { type: string; data: EventData },
    sendReply: (channel: string, text: string) => Promise<void>,
  ): Promise<WorkflowResult> {
    if (!this.evaluateConditions(workflow.conditions, event.data)) {
      return { matched: false, steps: [] };
    }

    const steps: StepResult[] = [];

    for (let i = 0; i < workflow.actions.length; i++) {
      const action = workflow.actions[i];
      try {
        const result = await this.executeAction(action, event.data, sendReply);
        steps.push({
          actionIndex: i,
          actionType: action.type,
          success: true,
          output: result,
        });
      } catch (error) {
        steps.push({
          actionIndex: i,
          actionType: action.type,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return { matched: true, steps };
  }

  evaluateConditions(
    conditions: Condition[],
    eventData: EventData,
  ): boolean {
    if (conditions.length === 0) return true;

    return conditions.every((condition) => {
      const fieldValue = this.resolveField(condition.field, eventData);
      if (fieldValue === undefined || fieldValue === null) return false;

      const strValue = String(fieldValue).toLowerCase();
      const matchValue = condition.value.toLowerCase();

      switch (condition.operator) {
        case 'contains':
          return strValue.includes(matchValue);
        case 'equals':
          return strValue === matchValue;
        case 'startsWith':
          return strValue.startsWith(matchValue);
        case 'endsWith':
          return strValue.endsWith(matchValue);
        default:
          return false;
      }
    });
  }

  async executeAction(
    action: Action,
    eventData: EventData,
    sendReply: (channel: string, text: string) => Promise<void>,
  ): Promise<string> {
    switch (action.type) {
      case 'QUERY_OPENCLAW': {
        const prompt = this.interpolateVariables(
          action.prompt || 'Procesá el siguiente mensaje',
          eventData,
        );
        return this.queryOpenClaw(prompt);
      }

      case 'SEND_REPLY': {
        const channel = action.channel || 'whatsapp';
        const lastResult = await this.queryOpenClaw(
          'Generá una respuesta amable para el cliente',
        );
        await sendReply(channel, lastResult);
        return `Reply sent via ${channel}`;
      }

      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  private resolveField(field: string, data: EventData): unknown {
    const parts = field.split('.');
    let current: unknown = data;

    for (const part of parts) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return undefined;
      }
      current = (current as Record<string, unknown>)[part];
    }

    return current;
  }

  private interpolateVariables(template: string, data: EventData): string {
    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_match, path) => {
      const value = this.resolveField(path, data);
      return value !== undefined ? String(value) : `{{${path}}}`;
    });
  }

  private async queryOpenClaw(prompt: string): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(
        `http://localhost:${process.env.OPENCLAW_PORT || 3099}/api/chat`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        throw new Error(`OpenClaw returned ${response.status}`);
      }

      const data = (await response.json()) as { reply?: string };
      return data.reply || 'Gracias por tu mensaje';
    } finally {
      clearTimeout(timeout);
    }
  }
}

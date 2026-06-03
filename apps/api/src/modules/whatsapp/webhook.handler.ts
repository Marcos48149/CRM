import { Injectable, Logger } from '@nestjs/common';
import { MetaApiService } from './meta-api.service';
import { WorkflowService } from '../workflows/workflow.service';
import { UsageService } from '../tenants/usage.service';

interface IncomingMessage {
  from: string;
  text: string;
  messageId: string;
}

@Injectable()
export class WebhookHandler {
  private readonly logger = new Logger(WebhookHandler.name);

  constructor(
    private readonly metaApi: MetaApiService,
    private readonly workflowService: WorkflowService,
    private readonly usageService: UsageService,
  ) {}

  async handleIncomingMessage(
    tenantId: string,
    phoneNumberId: string,
    accessToken: string,
    message: IncomingMessage,
  ): Promise<void> {
    const sendReply = async (_channel: string, text: string) => {
      await this.metaApi.sendTextMessage(
        phoneNumberId,
        accessToken,
        message.from,
        text,
      );
    };

    const withinLimit = await this.usageService.isWithinLimit(tenantId, 'messagesPerMonth');
    if (!withinLimit) {
      this.logger.warn(`Message limit reached for tenant ${tenantId}`);
      await sendReply(
        'whatsapp',
        'Has alcanzado tu límite del plan Starter. Actualizá tu plan en autoclaw.app',
      );
      return;
    }

    await this.usageService.trackMessage(tenantId);

    try {
      const results = await this.workflowService.executeMatchingWorkflows(
        tenantId,
        'WHATSAPP_MESSAGE',
        { message: { text: message.text, from: message.from } },
        sendReply,
      );

      const anyExecuted = results.some((r) => r.matched);
      if (!anyExecuted) {
        await this.sendFallback(message, sendReply);
      }
    } catch (error) {
      this.logger.error(
        `Error processing message ${message.messageId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      await this.sendFallback(message, sendReply);
    }
  }

  private async sendFallback(
    message: IncomingMessage,
    sendReply: (channel: string, text: string) => Promise<void>,
  ): Promise<void> {
    this.logger.warn(
      `No workflow matched for message ${message.messageId}, sending fallback`,
    );
    await sendReply('whatsapp', 'Un momento, te respondo enseguida');
  }
}

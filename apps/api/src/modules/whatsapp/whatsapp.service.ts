import * as crypto from 'crypto';
import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MetaApiService } from './meta-api.service';
import { WebhookHandler } from './webhook.handler';
import { encryptCredentials, decryptCredentials } from '../../common/utils/crypto';
import { TENANT_REPOSITORY, TenantRepository } from '../tenants/tenants.service';

interface WhatsAppConnection {
  phoneNumberId: string;
  encryptedCredentials: string;
  phoneNumber: string;
  active: boolean;
  webhookVerifyToken: string;
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private connections = new Map<string, WhatsAppConnection>();

  constructor(
    private readonly metaApi: MetaApiService,
    private readonly webhookHandler: WebhookHandler,
    private readonly configService: ConfigService,
    @Inject(TENANT_REPOSITORY)
    private readonly tenantRepository: TenantRepository,
  ) {}

  async connect(
    tenantId: string,
    phoneNumberId: string,
    accessToken: string,
    webhookSecret: string,
  ): Promise<{ connected: boolean; phoneNumber: string }> {
    const tenant = await this.tenantRepository.findById(tenantId);
    if (!tenant) {
      throw new NotFoundException('Tenant no encontrado');
    }

    let phoneNumber: string;
    try {
      const info = await this.metaApi.getPhoneNumberInfo(
        phoneNumberId,
        accessToken,
      );
      phoneNumber = info.displayPhoneNumber;
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Credenciales de Meta inválidas',
      );
    }

    const encryptedCredentials = encryptCredentials({
      accessToken,
      webhookSecret,
    });

    this.connections.set(tenantId, {
      phoneNumberId,
      encryptedCredentials,
      phoneNumber,
      active: true,
      webhookVerifyToken: webhookSecret,
    });

    this.logger.log(`WhatsApp connected for tenant ${tenantId}: ${phoneNumber}`);

    return { connected: true, phoneNumber };
  }

  async disconnect(tenantId: string): Promise<void> {
    const connection = this.connections.get(tenantId);
    if (!connection) {
      throw new NotFoundException('No hay integración de WhatsApp conectada');
    }

    this.connections.set(tenantId, { ...connection, active: false });
    this.logger.log(`WhatsApp disconnected for tenant ${tenantId}`);
  }

  async getStatus(
    tenantId: string,
  ): Promise<{ connected: boolean; phoneNumber?: string }> {
    const connection = this.connections.get(tenantId);

    if (!connection || !connection.active) {
      return { connected: false };
    }

    return { connected: true, phoneNumber: connection.phoneNumber };
  }

  async sendTestMessage(
    tenantId: string,
    to: string,
    message: string,
  ): Promise<void> {
    const connection = this.connections.get(tenantId);
    if (!connection || !connection.active) {
      throw new NotFoundException(
        'No hay integración de WhatsApp activa. Conectá WhatsApp primero.',
      );
    }

    const credentials = decryptCredentials(
      connection.encryptedCredentials,
    ) as { accessToken: string };

    await this.metaApi.sendTextMessage(
      connection.phoneNumberId,
      credentials.accessToken,
      to,
      message,
    );
  }

  async verifyWebhook(query: {
    'hub.mode'?: string;
    'hub.challenge'?: string;
    'hub.verify_token'?: string;
  }): Promise<number | string> {
    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];

    if (!mode || !token) {
      throw new BadRequestException('Parámetros de verificación faltantes');
    }

    const tenantId = this.findTenantByVerifyToken(token);
    if (!tenantId) {
      throw new BadRequestException('Token de verificación inválido');
    }

    if (mode === 'subscribe' && challenge) {
      return parseInt(challenge, 10) || challenge;
    }

    throw new BadRequestException('Modo de verificación inválido');
  }

  validateWebhookSignature(
    signatureHeader: string | undefined,
    rawBody: string,
  ): void {
    const appSecret = this.configService.get<string>('META_APP_SECRET');
    if (!appSecret) {
      this.logger.warn('META_APP_SECRET not configured, skipping HMAC validation');
      return;
    }

    if (!signatureHeader) {
      throw new BadRequestException('Falta firma HMAC del webhook');
    }

    const expectedSignature = crypto
      .createHmac('sha256', appSecret)
      .update(rawBody)
      .digest('hex');

    const receivedSignature = signatureHeader.replace('sha256=', '').trim();

    if (expectedSignature !== receivedSignature) {
      throw new BadRequestException('Firma HMAC del webhook inválida');
    }
  }

  async handleWebhookEvent(body: Record<string, unknown>): Promise<void> {
    const payload = body as {
      object?: string;
      entry?: Array<{
        id: string;
        changes?: Array<{
          field: string;
          value: {
            messaging_product?: string;
            metadata?: { phone_number_id: string };
            messages?: Array<{
              from: string;
              id: string;
              text?: { body: string };
            }>;
          };
        }>;
      }>;
    };

    if (payload.object !== 'whatsapp_business_account' || !payload.entry) {
      return;
    }

    for (const entry of payload.entry) {
      for (const change of entry.changes || []) {
        if (
          change.field !== 'messages' ||
          !change.value.messages ||
          change.value.messages.length === 0
        ) {
          continue;
        }

        const phoneNumberId = change.value.metadata?.phone_number_id;
        if (!phoneNumberId) continue;

        const tenantId = this.findTenantByPhoneNumberId(phoneNumberId);
        if (!tenantId) {
          this.logger.warn(
            `No tenant found for phoneNumberId ${phoneNumberId}`,
          );
          continue;
        }

        const connection = this.connections.get(tenantId);
        if (!connection || !connection.active) continue;

        const credentials = decryptCredentials(
          connection.encryptedCredentials,
        ) as { accessToken: string };

        for (const msg of change.value.messages) {
          await this.webhookHandler.handleIncomingMessage(
            tenantId,
            phoneNumberId,
            credentials.accessToken,
            {
              from: msg.from,
              text: msg.text?.body || '',
              messageId: msg.id,
            },
          );
        }
      }
    }
  }

  private findTenantByVerifyToken(
    token: string,
  ): string | undefined {
    for (const [tenantId, conn] of this.connections) {
      if (conn.webhookVerifyToken === token) {
        return tenantId;
      }
    }
    return undefined;
  }

  private findTenantByPhoneNumberId(
    phoneNumberId: string,
  ): string | undefined {
    for (const [tenantId, conn] of this.connections) {
      if (conn.phoneNumberId === phoneNumberId) {
        return tenantId;
      }
    }
    return undefined;
  }
}

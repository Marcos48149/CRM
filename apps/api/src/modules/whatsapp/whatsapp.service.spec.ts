import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WhatsAppService } from './whatsapp.service';
import { MetaApiService } from './meta-api.service';
import { WebhookHandler } from './webhook.handler';
import { TENANT_REPOSITORY, TenantRepository } from '../tenants/tenants.service';

const mockMetaApi = {
  getPhoneNumberInfo: jest.fn(),
  sendTextMessage: jest.fn(),
};

const mockWebhookHandler = {
  handleIncomingMessage: jest.fn(),
};

const mockRepository: TenantRepository = {
  findById: jest.fn(),
  update: jest.fn(),
  findIntegrations: jest.fn(),
  countMessagesSince: jest.fn(),
  countActiveWorkflows: jest.fn(),
};

const TENANT_ID = 'default-tenant';

beforeAll(() => {
  process.env.ENCRYPTION_KEY = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
});

describe('WhatsAppService', () => {
  let service: WhatsAppService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsAppService,
        { provide: MetaApiService, useValue: mockMetaApi },
        { provide: WebhookHandler, useValue: mockWebhookHandler },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'META_APP_SECRET') return 'test-app-secret';
              return undefined;
            }),
          },
        },
        { provide: TENANT_REPOSITORY, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<WhatsAppService>(WhatsAppService);
  });

  describe('connect', () => {
    it('guarda integración y llama Meta API para verificar', async () => {
      mockRepository.findById = jest.fn().mockResolvedValue({
        id: TENANT_ID,
        name: 'Mi Negocio',
        slug: 'mi-negocio',
        plan: 'STARTER',
        status: 'ACTIVE',
        createdAt: new Date(),
      });

      mockMetaApi.getPhoneNumberInfo.mockResolvedValue({
        displayPhoneNumber: '+541112345678',
      });

      const result = await service.connect(
        TENANT_ID,
        'phone-id-123',
        'valid-access-token',
        'webhook-secret-456',
      );

      expect(mockMetaApi.getPhoneNumberInfo).toHaveBeenCalledWith(
        'phone-id-123',
        'valid-access-token',
      );
      expect(result).toEqual({
        connected: true,
        phoneNumber: '+541112345678',
      });
    });

    it('lanza BadRequestException si credenciales inválidas', async () => {
      mockRepository.findById = jest.fn().mockResolvedValue({
        id: TENANT_ID,
        name: 'Mi Negocio',
        slug: 'mi-negocio',
        plan: 'STARTER',
        status: 'ACTIVE',
        createdAt: new Date(),
      });

      mockMetaApi.getPhoneNumberInfo.mockRejectedValue(
        new Error('Credenciales de Meta inválidas'),
      );

      await expect(
        service.connect(
          TENANT_ID,
          'phone-id-invalid',
          'bad-token',
          'secret',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('webhook handler', () => {
    it('procesa mensaje y envía respuesta', async () => {
      mockRepository.findById = jest.fn().mockResolvedValue({
        id: TENANT_ID,
        name: 'Mi Negocio',
        slug: 'mi-negocio',
        plan: 'STARTER',
        status: 'ACTIVE',
        createdAt: new Date(),
      });

      mockMetaApi.getPhoneNumberInfo.mockResolvedValue({
        displayPhoneNumber: '+541112345678',
      });

      await service.connect(
        TENANT_ID,
        'phone-id-123',
        'valid-access-token',
        'webhook-secret-456',
      );

      mockWebhookHandler.handleIncomingMessage.mockResolvedValue(undefined);

      await service.handleWebhookEvent({
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'entry-1',
            changes: [
              {
                field: 'messages',
                value: {
                  messaging_product: 'whatsapp',
                  metadata: { phone_number_id: 'phone-id-123', display_phone_number: '+541112345678' },
                  messages: [
                    {
                      from: '5491100000000',
                      id: 'msg-1',
                      timestamp: '1712345678',
                      type: 'text',
                      text: { body: 'Hola, ¿cómo están?' },
                    },
                  ],
                },
              },
            ],
          },
        ],
      });

      expect(mockWebhookHandler.handleIncomingMessage).toHaveBeenCalledWith(
        TENANT_ID,
        'phone-id-123',
        'valid-access-token',
        { from: '5491100000000', text: 'Hola, ¿cómo están?', messageId: 'msg-1' },
      );
    });
  });

  describe('validateWebhookSignature', () => {
    it('retorna 400 si firma HMAC inválida', () => {
      expect(() =>
        service.validateWebhookSignature(
          'sha256:invalid-signature',
          JSON.stringify({ test: 'data' }),
        ),
      ).toThrow(BadRequestException);
    });

    it('acepta firma HMAC válida', () => {
      const body = JSON.stringify({ test: 'data' });
      const expectedSig = require('crypto')
        .createHmac('sha256', 'test-app-secret')
        .update(body)
        .digest('hex');

      expect(() =>
        service.validateWebhookSignature(
          `sha256=${expectedSig}`,
          body,
        ),
      ).not.toThrow();
    });
  });
});

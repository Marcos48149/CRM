import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BillingService } from './billing.service';
import { TENANT_REPOSITORY } from '../tenants/tenants.service';
import { UsageService } from '../tenants/usage.service';

function mockTenant(overrides: Record<string, unknown> = {}) {
  return {
    id: 'tenant-1',
    name: 'Mi Negocio',
    slug: 'mi-negocio',
    plan: 'STARTER',
    status: 'ACTIVE',
    createdAt: new Date(),
    ...overrides,
  };
}

const mpMock = {
  create: jest.fn(),
  get: jest.fn(),
};

jest.mock('mercadopago', () => ({
  MercadoPagoConfig: jest.fn(),
  PreApproval: jest.fn(() => mpMock),
  WebhookSignatureValidator: {
    validate: jest.fn(),
  },
}));

describe('BillingService', () => {
  let service: BillingService;
  let mockTenantRepository: Record<string, jest.Mock>;
  let mockUsageService: Record<string, jest.Mock>;
  let mockConfigService: { get: jest.Mock };

  beforeEach(async () => {
    mpMock.create.mockReset();
    mpMock.get.mockReset();

    mockTenantRepository = {
      findById: jest.fn(),
      update: jest.fn(),
      findIntegrations: jest.fn(),
      countMessagesSince: jest.fn(),
      countActiveWorkflows: jest.fn(),
    };

    mockUsageService = {
      getMonthlyUsage: jest.fn(),
      trackMessage: jest.fn(),
      isWithinLimit: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        const config: Record<string, unknown> = {
          MP_ACCESS_TOKEN: 'test-mp-token',
          MP_WEBHOOK_SECRET: 'test-webhook-secret',
          PLAN_PRO_PRICE_ARS: 15000,
          PLAN_ENTERPRISE_PRICE_ARS: 45000,
          BILLING_SUCCESS_URL: 'http://localhost:3001/settings',
        };
        return config[key];
      }),
    };

    const { WebhookSignatureValidator } = require('mercadopago');
    WebhookSignatureValidator.validate.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: TENANT_REPOSITORY, useValue: mockTenantRepository },
        { provide: UsageService, useValue: mockUsageService },
      ],
    }).compile();

    service = module.get<BillingService>(BillingService);
  });

  describe('subscribe', () => {
    it('crea preapproval con los parámetros correctos y retorna checkout URL', async () => {
      mockTenantRepository.findById.mockResolvedValue(mockTenant());
      mpMock.create.mockResolvedValue({
        id: 'preapproval-123',
        init_point: 'https://www.mercadopago.com.ar/checkout?pref_id=123',
      });

      const result = await service.subscribe('tenant-1', 'PRO');

      expect(result.checkoutUrl).toBe(
        'https://www.mercadopago.com.ar/checkout?pref_id=123',
      );
      expect(mpMock.create).toHaveBeenCalledWith({
        body: expect.objectContaining({
          reason: 'Plan PRO - AutoClaw',
          auto_recurring: expect.objectContaining({
            frequency: 1,
            frequency_type: 'months',
            transaction_amount: 15000,
            currency_id: 'ARS',
          }),
          status: 'pending',
        }),
      });
    });

    it('lanza BadRequestException si el plan no está configurado', async () => {
      mockTenantRepository.findById.mockResolvedValue(mockTenant());
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'PLAN_PRO_PRICE_ARS') return undefined;
        if (key === 'MP_ACCESS_TOKEN') return 'test-token';
        return 'http://localhost:3001/settings';
      });

      await expect(
        service.subscribe('tenant-1', 'PRO'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('webhook', () => {
    it('actualiza plan en pago exitoso (authorized)', async () => {
      mockTenantRepository.findById.mockResolvedValue(mockTenant());
      mpMock.create.mockResolvedValue({
        id: 'preapproval-456',
        init_point: 'https://mp.com/checkout',
      });

      await service.subscribe('tenant-1', 'PRO');

      mpMock.create.mockReset();
      mpMock.get.mockReset();
      mockTenantRepository.update.mockReset();
      const { WebhookSignatureValidator } = require('mercadopago');
      WebhookSignatureValidator.validate.mockReset();

      mockTenantRepository.findById.mockResolvedValue(mockTenant());
      mpMock.get.mockResolvedValue({ status: 'authorized' });

      await service.handleWebhook(
        'ts=1234567890,v1=test-hash',
        'test-request-id',
        {
          action: 'updated',
          type: 'preapproval',
          data: { id: 'preapproval-456' },
        },
      );

      expect(mockTenantRepository.update).toHaveBeenCalledWith('tenant-1', {
        plan: 'PRO',
      });
    });

    it('retorna 400 si firma inválida', async () => {
      const { WebhookSignatureValidator } = require('mercadopago');
      WebhookSignatureValidator.validate.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      await expect(
        service.handleWebhook('invalid-signature', 'req-id', {
          action: 'updated',
          type: 'preapproval',
          data: { id: 'preapproval-123' },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('vuelve a STARTER cuando la suscripción se cancela', async () => {
      mockTenantRepository.findById.mockResolvedValue(mockTenant({ plan: 'PRO' }));
      mpMock.create.mockResolvedValue({
        id: 'preapproval-789',
        init_point: 'https://mp.com/checkout',
      });

      await service.subscribe('tenant-1', 'PRO');

      mpMock.create.mockReset();
      mpMock.get.mockReset();
      mockTenantRepository.update.mockReset();
      const { WebhookSignatureValidator } = require('mercadopago');
      WebhookSignatureValidator.validate.mockReset();

      mockTenantRepository.findById.mockResolvedValue(mockTenant({ plan: 'PRO' }));
      mpMock.get.mockResolvedValue({ status: 'cancelled' });

      await service.handleWebhook(
        'ts=1234567890,v1=test-hash',
        'test-request-id',
        {
          action: 'updated',
          type: 'preapproval',
          data: { id: 'preapproval-789' },
        },
      );

      expect(mockTenantRepository.update).toHaveBeenCalledWith('tenant-1', {
        plan: 'STARTER',
      });
    });
  });

  describe('getCurrent', () => {
    it('retorna plan actual y uso del mes', async () => {
      mockTenantRepository.findById.mockResolvedValue(mockTenant());
      mockUsageService.getMonthlyUsage.mockResolvedValue({ messagesUsed: 120 });

      const result = await service.getCurrent('tenant-1');

      expect(result.plan).toBe('STARTER');
      expect(result.messagesUsed).toBe(120);
      expect(result.messagesLimit).toBe(500);
      expect(result.usagePercentage).toBe(24);
    });

    it('retorna 0% de uso cuando no hay mensajes', async () => {
      mockTenantRepository.findById.mockResolvedValue(mockTenant({ plan: 'PRO' }));
      mockUsageService.getMonthlyUsage.mockResolvedValue({ messagesUsed: 0 });

      const result = await service.getCurrent('tenant-1');

      expect(result.usagePercentage).toBe(0);
    });
  });
});

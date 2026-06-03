import { Test, TestingModule } from '@nestjs/testing';
import { UsageService, PLAN_LIMITS } from './usage.service';
import { TENANT_REPOSITORY, TenantRepository } from './tenants.service';

const mockRepository: TenantRepository = {
  findById: jest.fn(),
  update: jest.fn(),
  findIntegrations: jest.fn(),
  countMessagesSince: jest.fn(),
  countActiveWorkflows: jest.fn(),
};

describe('UsageService', () => {
  let service: UsageService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsageService,
        { provide: TENANT_REPOSITORY, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<UsageService>(UsageService);
  });

  describe('trackMessage', () => {
    it('incrementa el contador mensual', async () => {
      await service.trackMessage('tenant-1');
      const usage = await service.getMonthlyUsage('tenant-1');
      expect(usage.messagesUsed).toBe(1);

      await service.trackMessage('tenant-1');
      const usage2 = await service.getMonthlyUsage('tenant-1');
      expect(usage2.messagesUsed).toBe(2);
    });

    it('mantiene contadores separados por tenant', async () => {
      await service.trackMessage('tenant-1');
      await service.trackMessage('tenant-1');
      await service.trackMessage('tenant-2');

      const usage1 = await service.getMonthlyUsage('tenant-1');
      const usage2 = await service.getMonthlyUsage('tenant-2');
      expect(usage1.messagesUsed).toBe(2);
      expect(usage2.messagesUsed).toBe(1);
    });
  });

  describe('isWithinLimit', () => {
    it('retorna true cuando no se alcanzó el límite de mensajes', async () => {
      mockRepository.findById = jest.fn().mockResolvedValue({
        id: 'tenant-1',
        name: 'Mi Negocio',
        slug: 'mi-negocio',
        plan: 'STARTER',
        status: 'ACTIVE',
        createdAt: new Date(),
      });

      const result = await service.isWithinLimit('tenant-1', 'messagesPerMonth');
      expect(result).toBe(true);
    });

    it('retorna false cuando se superó el límite de mensajes', async () => {
      mockRepository.findById = jest.fn().mockResolvedValue({
        id: 'tenant-1',
        name: 'Mi Negocio',
        slug: 'mi-negocio',
        plan: 'STARTER',
        status: 'ACTIVE',
        createdAt: new Date(),
      });

      for (let i = 0; i < 500; i++) {
        await service.trackMessage('tenant-1');
      }

      const result = await service.isWithinLimit('tenant-1', 'messagesPerMonth');
      expect(result).toBe(false);
    });

    it('retorna true para planes ilimitados', async () => {
      mockRepository.findById = jest.fn().mockResolvedValue({
        id: 'tenant-1',
        name: 'Mi Negocio',
        slug: 'mi-negocio',
        plan: 'ENTERPRISE',
        status: 'ACTIVE',
        createdAt: new Date(),
      });

      for (let i = 0; i < 10000; i++) {
        await service.trackMessage('tenant-1');
      }

      const result = await service.isWithinLimit('tenant-1', 'messagesPerMonth');
      expect(result).toBe(true);
    });

    it('retorna true cuando no se alcanzó el límite de workflows activos', async () => {
      mockRepository.findById = jest.fn().mockResolvedValue({
        id: 'tenant-1',
        name: 'Mi Negocio',
        slug: 'mi-negocio',
        plan: 'STARTER',
        status: 'ACTIVE',
        createdAt: new Date(),
      });
      mockRepository.countActiveWorkflows = jest.fn().mockResolvedValue(2);

      const result = await service.isWithinLimit('tenant-1', 'activeWorkflows');
      expect(result).toBe(true);
    });

    it('retorna false cuando se superó el límite de workflows activos', async () => {
      mockRepository.findById = jest.fn().mockResolvedValue({
        id: 'tenant-1',
        name: 'Mi Negocio',
        slug: 'mi-negocio',
        plan: 'STARTER',
        status: 'ACTIVE',
        createdAt: new Date(),
      });
      mockRepository.countActiveWorkflows = jest.fn().mockResolvedValue(3);

      const result = await service.isWithinLimit('tenant-1', 'activeWorkflows');
      expect(result).toBe(false);
    });

    it('retorna false si el tenant no existe', async () => {
      mockRepository.findById = jest.fn().mockResolvedValue(null);

      const result = await service.isWithinLimit('nonexistent', 'messagesPerMonth');
      expect(result).toBe(false);
    });
  });

  describe('PLAN_LIMITS', () => {
    it('STARTER tiene límite de 500 mensajes', () => {
      expect(PLAN_LIMITS.STARTER.messagesPerMonth).toBe(500);
    });

    it('STARTER tiene límite de 3 workflows activos', () => {
      expect(PLAN_LIMITS.STARTER.activeWorkflows).toBe(3);
    });

    it('PRO tiene límite de 5000 mensajes', () => {
      expect(PLAN_LIMITS.PRO.messagesPerMonth).toBe(5000);
    });

    it('PRO tiene límite de 20 workflows activos', () => {
      expect(PLAN_LIMITS.PRO.activeWorkflows).toBe(20);
    });

    it('ENTERPRISE es ilimitado', () => {
      expect(PLAN_LIMITS.ENTERPRISE.messagesPerMonth).toBe(-1);
      expect(PLAN_LIMITS.ENTERPRISE.activeWorkflows).toBe(-1);
    });
  });
});

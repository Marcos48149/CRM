import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TenantsService, TenantRepository, TENANT_REPOSITORY } from './tenants.service';

const mockRepository: TenantRepository = {
  findById: jest.fn(),
  update: jest.fn(),
  findIntegrations: jest.fn(),
  countMessagesSince: jest.fn(),
  countActiveWorkflows: jest.fn(),
};

describe('TenantsService', () => {
  let service: TenantsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantsService,
        { provide: TENANT_REPOSITORY, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<TenantsService>(TenantsService);
  });

  describe('getTenant', () => {
    it('retorna el tenant correcto para el tenantId dado', async () => {
      const tenantId = 'tenant-1';
      const mockTenant = {
        id: tenantId,
        name: 'Mi Negocio',
        slug: 'mi-negocio',
        plan: 'STARTER',
        status: 'ACTIVE',
        containerName: 'openclaw-mi-negocio',
        createdAt: new Date('2024-01-01'),
      };
      const mockIntegrations = [
        { type: 'WHATSAPP', active: true },
        { type: 'INSTAGRAM', active: false },
      ];

      mockRepository.findById = jest.fn().mockResolvedValue(mockTenant);
      mockRepository.findIntegrations = jest.fn().mockResolvedValue(mockIntegrations);

      const result = await service.getTenant(tenantId);

      expect(result.id).toBe(tenantId);
      expect(result.name).toBe('Mi Negocio');
      expect(result.slug).toBe('mi-negocio');
      expect(result.integrations).toHaveLength(2);
      expect(result.integrations![0]).toEqual({ type: 'WHATSAPP', active: true });
    });

    it('lanza NotFoundException si el tenant no existe', async () => {
      mockRepository.findById = jest.fn().mockResolvedValue(null);

      await expect(service.getTenant('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateTenant', () => {
    it('actualiza el nombre correctamente', async () => {
      const tenantId = 'tenant-1';
      const existingTenant = {
        id: tenantId,
        name: 'Nombre Viejo',
        slug: 'nombre-viejo',
        plan: 'STARTER',
        status: 'ACTIVE',
        createdAt: new Date('2024-01-01'),
      };
      const updatedTenant = {
        ...existingTenant,
        name: 'Nombre Nuevo',
      };

      mockRepository.findById = jest.fn().mockResolvedValue(existingTenant);
      mockRepository.update = jest.fn().mockResolvedValue(updatedTenant);
      mockRepository.findIntegrations = jest.fn().mockResolvedValue([]);

      const result = await service.updateTenant(tenantId, { name: 'Nombre Nuevo' });

      expect(mockRepository.update).toHaveBeenCalledWith(tenantId, {
        name: 'Nombre Nuevo',
      });
      expect(result.name).toBe('Nombre Nuevo');
    });
  });

  describe('updateOnboarding', () => {
    it('actualiza onboardingStep y mantiene status onboarding si step < 4', async () => {
      const tenantId = 'tenant-1';
      const mockTenant = {
        id: tenantId,
        name: 'Test',
        slug: 'test',
        plan: 'STARTER',
        status: 'onboarding',
        onboardingStep: 1,
        createdAt: new Date(),
      };
      const updatedTenant = {
        ...mockTenant,
        onboardingStep: 2,
      };

      mockRepository.findById = jest.fn()
        .mockResolvedValueOnce(mockTenant)
        .mockResolvedValueOnce(updatedTenant);
      mockRepository.update = jest.fn().mockResolvedValue(updatedTenant);
      mockRepository.findIntegrations = jest.fn().mockResolvedValue([]);

      const result = await service.updateOnboarding(tenantId, 2);

      expect(mockRepository.update).toHaveBeenCalledWith(tenantId, {
        onboardingStep: 2,
      });
      expect(result.onboardingStep).toBe(2);
      expect(result.status).toBe('onboarding');
    });

    it('cambia status a ACTIVE cuando step >= 4', async () => {
      const tenantId = 'tenant-1';
      const mockTenant = {
        id: tenantId,
        name: 'Test',
        slug: 'test',
        plan: 'STARTER',
        status: 'onboarding',
        onboardingStep: 3,
        createdAt: new Date(),
      };
      const updatedTenant = {
        ...mockTenant,
        status: 'ACTIVE',
        onboardingStep: 4,
      };

      mockRepository.findById = jest.fn()
        .mockResolvedValueOnce(mockTenant)
        .mockResolvedValueOnce(updatedTenant);
      mockRepository.update = jest.fn().mockResolvedValue(updatedTenant);
      mockRepository.findIntegrations = jest.fn().mockResolvedValue([]);

      const result = await service.updateOnboarding(tenantId, 4);

      expect(mockRepository.update).toHaveBeenCalledWith(tenantId, {
        status: 'ACTIVE',
        onboardingStep: 4,
      });
      expect(result.status).toBe('ACTIVE');
      expect(result.onboardingStep).toBe(4);
    });
  });

  describe('getStats', () => {
    it('retorna estadísticas con valores correctos', async () => {
      const tenantId = 'tenant-1';

      mockRepository.countMessagesSince = jest.fn().mockResolvedValue(150);
      mockRepository.countActiveWorkflows = jest.fn().mockResolvedValue(5);
      mockRepository.findIntegrations = jest
        .fn()
        .mockResolvedValue([
          { type: 'WHATSAPP', active: true },
          { type: 'VTEX', active: true },
          { type: 'INSTAGRAM', active: false },
        ]);

      const result = await service.getStats(tenantId);

      expect(result.totalMessages).toBe(150);
      expect(result.activeWorkflows).toBe(5);
      expect(result.integrations).toEqual(['WHATSAPP', 'VTEX']);
    });
  });
});

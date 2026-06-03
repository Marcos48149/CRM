import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { WorkflowExecutorService } from './workflow-executor.service';
import { UsageService } from '../tenants/usage.service';

const mockExecutor = {
  executeWorkflow: jest.fn(),
};

const mockUsageService = {
  isWithinLimit: jest.fn(),
  trackMessage: jest.fn(),
  getMonthlyUsage: jest.fn(),
};

describe('WorkflowService', () => {
  let service: WorkflowService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowService,
        { provide: WorkflowExecutorService, useValue: mockExecutor },
        { provide: UsageService, useValue: mockUsageService },
      ],
    }).compile();

    service = module.get<WorkflowService>(WorkflowService);
  });

  describe('create', () => {
    it('crea workflow cuando está dentro del límite', async () => {
      mockUsageService.isWithinLimit.mockResolvedValue(true);

      const result = await service.create('tenant-1', {
        name: 'Test Workflow',
        trigger: 'WHATSAPP_MESSAGE',
        conditions: [{ field: 'message.text', operator: 'contains', value: 'pedido' }],
        actions: [{ type: 'QUERY_OPENCLAW', prompt: 'Procesá el mensaje' }],
      });

      expect(result.name).toBe('Test Workflow');
      expect(result.active).toBe(true);
    });

    it('lanza BadRequestException si se excede el límite de workflows activos', async () => {
      mockUsageService.isWithinLimit.mockResolvedValue(false);

      await expect(
        service.create('tenant-1', {
          name: 'Extra Workflow',
          trigger: 'WHATSAPP_MESSAGE',
          conditions: [],
          actions: [{ type: 'QUERY_OPENCLAW' }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('lanza error con mensaje descriptivo al exceder límite', async () => {
      mockUsageService.isWithinLimit.mockResolvedValue(false);

      await expect(
        service.create('tenant-1', {
          name: 'Extra Workflow',
          trigger: 'WHATSAPP_MESSAGE',
          conditions: [],
          actions: [{ type: 'QUERY_OPENCLAW' }],
        }),
      ).rejects.toThrow(
        'Has alcanzado el límite de workflows activos de tu plan',
      );
    });
  });

  describe('toggle', () => {
    it('permite activar workflow si está dentro del límite', async () => {
      mockUsageService.isWithinLimit.mockResolvedValue(true);

      const created = await service.create('tenant-1', {
        name: 'Test',
        trigger: 'WHATSAPP_MESSAGE',
        conditions: [],
        actions: [{ type: 'QUERY_OPENCLAW' }],
      });
      await service.toggle('tenant-1', created.id);

      const toggledBack = await service.toggle('tenant-1', created.id);
      expect(toggledBack.active).toBe(true);
    });

    it('lanza BadRequestException al activar si excede el límite', async () => {
      mockUsageService.isWithinLimit
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      const created = await service.create('tenant-1', {
        name: 'Test',
        trigger: 'WHATSAPP_MESSAGE',
        conditions: [],
        actions: [{ type: 'QUERY_OPENCLAW' }],
      });
      await service.toggle('tenant-1', created.id);

      await expect(
        service.toggle('tenant-1', created.id),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('retorna solo workflows del tenant', async () => {
      mockUsageService.isWithinLimit.mockResolvedValue(true);

      await service.create('tenant-1', {
        name: 'W1', trigger: 'WHATSAPP_MESSAGE', conditions: [], actions: [{ type: 'QUERY_OPENCLAW' }],
      });
      await service.create('tenant-1', {
        name: 'W2', trigger: 'WHATSAPP_MESSAGE', conditions: [], actions: [{ type: 'QUERY_OPENCLAW' }],
      });
      await service.create('tenant-2', {
        name: 'W3', trigger: 'WHATSAPP_MESSAGE', conditions: [], actions: [{ type: 'QUERY_OPENCLAW' }],
      });

      const results = await service.findAll('tenant-1');
      expect(results.data).toHaveLength(2);
    });
  });

  describe('delete', () => {
    it('elimina workflow existente', async () => {
      mockUsageService.isWithinLimit.mockResolvedValue(true);
      const created = await service.create('tenant-1', {
        name: 'To Delete', trigger: 'WHATSAPP_MESSAGE', conditions: [], actions: [{ type: 'QUERY_OPENCLAW' }],
      });

      await service.delete('tenant-1', created.id);
      const results = await service.findAll('tenant-1');
      expect(results.data).toHaveLength(0);
    });

    it('lanza NotFoundException si el workflow no existe', async () => {
      await expect(
        service.delete('tenant-1', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('lanza ForbiddenException si no pertenece al tenant', async () => {
      mockUsageService.isWithinLimit.mockResolvedValue(true);
      const created = await service.create('tenant-1', {
        name: 'Test', trigger: 'WHATSAPP_MESSAGE', conditions: [], actions: [{ type: 'QUERY_OPENCLAW' }],
      });

      await expect(
        service.delete('tenant-2', created.id),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getActiveWorkflowCount', () => {
    it('retorna cantidad correcta de workflows activos', async () => {
      mockUsageService.isWithinLimit.mockResolvedValue(true);

      await service.create('tenant-1', {
        name: 'W1', trigger: 'WHATSAPP_MESSAGE', conditions: [], actions: [{ type: 'QUERY_OPENCLAW' }],
      });
      await service.create('tenant-1', {
        name: 'W2', trigger: 'WHATSAPP_MESSAGE', conditions: [], actions: [{ type: 'QUERY_OPENCLAW' }],
      });

      const count = service.getActiveWorkflowCount('tenant-1');
      expect(count).toBe(2);
    });
  });
});

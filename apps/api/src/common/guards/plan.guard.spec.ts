import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PlanGuard } from './plan.guard';
import { TENANT_REPOSITORY, TenantRepository } from '../../modules/tenants/tenants.service';
import { PLAN_KEY } from '../decorators/require-plan.decorator';

describe('PlanGuard', () => {
  let guard: PlanGuard;
  let mockReflector: jest.Mocked<Reflector>;
  let mockRepository: jest.Mocked<TenantRepository>;

  beforeEach(() => {
    mockReflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;

    mockRepository = {
      findById: jest.fn(),
      update: jest.fn(),
      findIntegrations: jest.fn(),
      countMessagesSince: jest.fn(),
      countActiveWorkflows: jest.fn(),
    };

    guard = new PlanGuard(mockReflector, mockRepository);
  });

  const mockContext = (user?: { tenantId: string; role: string }) =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as unknown as jest.Mocked<any>;

  it('retorna 403 para plan insuficiente (STARTER requiere PRO)', async () => {
    mockReflector.getAllAndOverride.mockReturnValue('PRO');
    mockRepository.findById.mockResolvedValue({
      id: 'tenant-1',
      name: 'Test',
      slug: 'test',
      plan: 'STARTER',
      status: 'ACTIVE',
      createdAt: new Date(),
    });

    const context = mockContext({ tenantId: 'tenant-1', role: 'OWNER' });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('permite acceso para plan suficiente (PRO requiere PRO)', async () => {
    mockReflector.getAllAndOverride.mockReturnValue('PRO');
    mockRepository.findById.mockResolvedValue({
      id: 'tenant-1',
      name: 'Test',
      slug: 'test',
      plan: 'PRO',
      status: 'ACTIVE',
      createdAt: new Date(),
    });

    const context = mockContext({ tenantId: 'tenant-1', role: 'OWNER' });

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('permite acceso para plan superior (ENTERPRISE requiere PRO)', async () => {
    mockReflector.getAllAndOverride.mockReturnValue('PRO');
    mockRepository.findById.mockResolvedValue({
      id: 'tenant-1',
      name: 'Test',
      slug: 'test',
      plan: 'ENTERPRISE',
      status: 'ACTIVE',
      createdAt: new Date(),
    });

    const context = mockContext({ tenantId: 'tenant-1', role: 'OWNER' });

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('permite acceso si no hay plan requerido', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(undefined);

    const context = mockContext({ tenantId: 'tenant-1', role: 'VIEWER' });

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('lanza ForbiddenException si el usuario no está autenticado', async () => {
    mockReflector.getAllAndOverride.mockReturnValue('PRO');

    const context = mockContext(undefined);

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('lanza ForbiddenException si no encuentra el tenant', async () => {
    mockReflector.getAllAndOverride.mockReturnValue('PRO');
    mockRepository.findById.mockResolvedValue(null);

    const context = mockContext({ tenantId: 'nonexistent', role: 'OWNER' });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });
});

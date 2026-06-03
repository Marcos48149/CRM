import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ProvisionerService } from './provisioner.service';
import { TENANT_REPOSITORY, TenantRepository } from '../tenants/tenants.service';
import Docker from 'dockerode';

jest.mock('dockerode');

const mockContainer = {
  start: jest.fn(),
  stop: jest.fn(),
  remove: jest.fn(),
  inspect: jest.fn(),
};

const mockDockerInstance = {
  createContainer: jest.fn().mockResolvedValue(mockContainer),
  getContainer: jest.fn().mockReturnValue(mockContainer),
};

(Docker as unknown as jest.Mock).mockImplementation(() => mockDockerInstance);

jest.mock('fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  copyFile: jest.fn().mockResolvedValue(undefined),
  access: jest.fn().mockResolvedValue(undefined),
  rm: jest.fn().mockResolvedValue(undefined),
}));

const mockRepository: TenantRepository = {
  findById: jest.fn(),
  update: jest.fn(),
  findIntegrations: jest.fn(),
  countMessagesSince: jest.fn(),
  countActiveWorkflows: jest.fn(),
};

describe('ProvisionerService', () => {
  let service: ProvisionerService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const fakeDir = __dirname;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProvisionerService,
        {
          provide: TENANT_REPOSITORY,
          useValue: mockRepository,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue: string) => defaultValue),
          },
        },
      ],
    }).compile();

    service = module.get<ProvisionerService>(ProvisionerService);
    (service as unknown as { templatesDir: string }).templatesDir =
      fakeDir + '/openclaw-template';
  });

  describe('createContainer', () => {
    it('crea el directorio y el contenedor correctamente', async () => {
      const tenantId = 'tenant-1';
      const tenantSlug = 'mi-negocio';

      mockRepository.findById = jest.fn().mockResolvedValue({
        id: tenantId,
        name: 'Mi Negocio',
        slug: tenantSlug,
        plan: 'STARTER',
        status: 'ACTIVE',
        createdAt: new Date(),
      });
      mockRepository.update = jest.fn().mockResolvedValue({});

      await service.createContainer(tenantId, tenantSlug);

      expect(mockDockerInstance.createContainer).toHaveBeenCalledWith({
        name: `openclaw-${tenantSlug}`,
        Image: 'openclaw/openclaw:latest',
        Env: [`TENANT_ID=${tenantId}`, `TENANT_SLUG=${tenantSlug}`],
        HostConfig: {
          Binds: [expect.stringContaining(`${tenantSlug}:/workspace`)],
        },
      });

      expect(mockContainer.start).toHaveBeenCalled();
      expect(mockRepository.update).toHaveBeenCalledWith(tenantId, {
        containerName: `openclaw-${tenantSlug}`,
      });
    });

    it('hace rollback del containerName si Docker falla', async () => {
      const tenantId = 'tenant-1';
      const tenantSlug = 'mi-negocio';

      mockDockerInstance.createContainer.mockRejectedValueOnce(
        new Error('Docker error'),
      );
      mockRepository.update = jest.fn().mockResolvedValue({});

      await expect(
        service.createContainer(tenantId, tenantSlug),
      ).rejects.toThrow('Docker error');

      expect(mockRepository.update).toHaveBeenCalledWith(tenantId, {
        containerName: undefined,
      });
    });
  });

  describe('getContainerStatus', () => {
    it("retorna 'running' cuando el contenedor está activo", async () => {
      const tenantId = 'tenant-1';

      mockRepository.findById = jest.fn().mockResolvedValue({
        id: tenantId,
        containerName: 'openclaw-mi-negocio',
      });

      mockContainer.inspect.mockResolvedValue({
        State: { Running: true },
      });

      const status = await service.getContainerStatus(tenantId);

      expect(status).toBe('running');
    });

    it("retorna 'not_found' cuando no existe", async () => {
      const tenantId = 'tenant-1';

      mockRepository.findById = jest.fn().mockResolvedValue(null);

      const status = await service.getContainerStatus(tenantId);

      expect(status).toBe('not_found');
    });
  });
});

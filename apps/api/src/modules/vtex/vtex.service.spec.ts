import { Test, TestingModule } from '@nestjs/testing';
import { VtexService } from './vtex.service';
import { VtexApiService } from './vtex-api.service';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { VtexProduct } from '@autoclaw/shared';
import { TENANT_REPOSITORY } from '../tenants/tenants.service';

describe('VtexService', () => {
  let service: VtexService;
  let vtexApi: jest.Mocked<VtexApiService>;

  const mockTenantRepository = {
    findById: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    process.env.ENCRYPTION_KEY = '32-char-string-for-test-purposes';

    vtexApi = {
      verifyCredentials: jest.fn(),
      getOrder: jest.fn(),
      searchOrders: jest.fn(),
      getProduct: jest.fn(),
      searchProducts: jest.fn(),
      getInventory: jest.fn(),
    } as unknown as jest.Mocked<VtexApiService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VtexService,
        { provide: VtexApiService, useValue: vtexApi },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: TENANT_REPOSITORY, useValue: mockTenantRepository },
      ],
    }).compile();

    service = module.get<VtexService>(VtexService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('connect', () => {
    it('verifica credenciales y guarda integración', async () => {
      mockTenantRepository.findById.mockResolvedValue({ id: 'tenant-1' });
      vtexApi.verifyCredentials.mockResolvedValue({ vendor: 'Test Store' });

      const result = await service.connect(
        'tenant-1',
        'teststore',
        'app-key-123',
        'app-token-456',
      );

      expect(result).toEqual({
        connected: true,
        accountName: 'teststore',
      });
      expect(vtexApi.verifyCredentials).toHaveBeenCalledWith(
        'teststore',
        'app-key-123',
        'app-token-456',
      );
    });

    it('lanza BadRequestException si credenciales inválidas', async () => {
      mockTenantRepository.findById.mockResolvedValue({ id: 'tenant-1' });
      vtexApi.verifyCredentials.mockRejectedValue(new Error('Invalid credentials'));

      await expect(
        service.connect('tenant-1', 'teststore', 'bad-key', 'bad-token'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getOrder', () => {
    it('retorna pedido formateado correctamente', async () => {
      mockTenantRepository.findById.mockResolvedValue({ id: 'tenant-1' });
      vtexApi.verifyCredentials.mockResolvedValue({ vendor: 'Test' });

      await service.connect('tenant-1', 'teststore', 'key', 'token');

      const mockOrder = {
        orderId: '123456',
        status: 'ready-for-handling',
        totalValue: 15000,
        items: [
          { id: '1', name: 'Producto 1', quantity: 2, price: 7500 },
        ],
        creationDate: '2025-01-15T10:00:00Z',
        clientProfileData: {
          email: 'cliente@test.com',
          firstName: 'Juan',
          lastName: 'Pérez',
          phone: '5491112345678',
        },
      };

      vtexApi.getOrder.mockResolvedValue(mockOrder);

      const result = await service.getOrder('tenant-1', '123456');

      expect(result).toEqual(mockOrder);
      expect(vtexApi.getOrder).toHaveBeenCalledWith(
        'teststore',
        'key',
        'token',
        '123456',
      );
    });
  });

  describe('searchProducts', () => {
    it('retorna lista de productos', async () => {
      mockTenantRepository.findById.mockResolvedValue({ id: 'tenant-1' });
      vtexApi.verifyCredentials.mockResolvedValue({ vendor: 'Test' });

      await service.connect('tenant-1', 'teststore', 'key', 'token');

      const mockProducts = [
        {
          id: '1',
          name: 'Zapatilla Running',
          description: 'Zapatilla para correr',
          price: 45000,
          images: [{ imageUrl: 'https://img.url', imageLabel: 'main' }],
        },
      ];

      vtexApi.searchProducts.mockResolvedValue(mockProducts);

      const result = await service.searchProducts('tenant-1', 'zapatilla');

      expect(result).toEqual(mockProducts);
      expect(vtexApi.searchProducts).toHaveBeenCalledWith(
        'teststore',
        'key',
        'token',
        'zapatilla',
      );
    });
  });

  describe('executeTool', () => {
    it('ejecuta get_order tool correctamente', async () => {
      mockTenantRepository.findById.mockResolvedValue({ id: 'tenant-1' });
      vtexApi.verifyCredentials.mockResolvedValue({ vendor: 'Test' });

      await service.connect('tenant-1', 'teststore', 'key', 'token');

      const mockOrder = {
        orderId: '123',
        status: 'invoiced',
        totalValue: 5000,
        items: [],
        creationDate: '2025-01-01T00:00:00Z',
        clientProfileData: {
          email: 'test@test.com',
          firstName: 'Test',
          lastName: 'User',
          phone: '1234567890',
        },
      };

      vtexApi.getOrder.mockResolvedValue(mockOrder);

      const result = await service.executeTool('tenant-1', 'get_order', {
        orderId: '123',
      });

      expect(result).toEqual({ result: mockOrder });
      expect(vtexApi.getOrder).toHaveBeenCalledWith(
        'teststore',
        'key',
        'token',
        '123',
      );
    });

    it('ejecuta search_products tool correctamente', async () => {
      mockTenantRepository.findById.mockResolvedValue({ id: 'tenant-1' });
      vtexApi.verifyCredentials.mockResolvedValue({ vendor: 'Test' });

      await service.connect('tenant-1', 'teststore', 'key', 'token');

      const mockProducts: VtexProduct[] = [
        {
          id: '1',
          name: 'Zapatilla',
          description: '',
          price: 45000,
          images: [],
        },
      ];

      vtexApi.searchProducts.mockResolvedValue(mockProducts);

      const result = await service.executeTool('tenant-1', 'search_products', {
        query: 'zapatilla',
      });

      expect(result).toEqual({
        result: [{ id: '1', name: 'Zapatilla', price: 45000 }],
      });
    });
  });
});

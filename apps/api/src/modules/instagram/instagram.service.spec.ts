import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InstagramService } from './instagram.service';
import { MetaGraphService } from './meta-graph.service';
import { SchedulerService } from './scheduler.service';
import { TENANT_REPOSITORY, TenantRepository } from '../tenants/tenants.service';
import { WorkflowService } from '../workflows/workflow.service';

const mockMetaGraph = {
  getAccountInfo: jest.fn(),
  publishPost: jest.fn(),
};

const mockScheduler = {
  setOnPublish: jest.fn(),
  schedulePost: jest.fn(),
  cancelJob: jest.fn(),
};

const mockWorkflowService = {
  executeMatchingWorkflows: jest.fn(),
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

describe('InstagramService', () => {
  let service: InstagramService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InstagramService,
        { provide: MetaGraphService, useValue: mockMetaGraph },
        { provide: SchedulerService, useValue: mockScheduler },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'META_WHATSAPP_API_VERSION') return 'v18.0';
              return undefined;
            }),
          },
        },
        { provide: TENANT_REPOSITORY, useValue: mockRepository },
        { provide: WorkflowService, useValue: mockWorkflowService },
      ],
    }).compile();

    service = module.get<InstagramService>(InstagramService);
  });

  describe('connect', () => {
    it('llama Meta Graph API con parámetros correctos y guarda integración', async () => {
      mockRepository.findById = jest.fn().mockResolvedValue({
        id: TENANT_ID,
        name: 'Mi Negocio',
      });

      mockMetaGraph.getAccountInfo.mockResolvedValue({
        name: 'Mi Negocio IG',
        username: 'minegocio',
      });

      const result = await service.connect(
        TENANT_ID,
        'valid-access-token',
        'account-id-123',
      );

      expect(mockMetaGraph.getAccountInfo).toHaveBeenCalledWith(
        'valid-access-token',
        'account-id-123',
      );
      expect(result).toEqual({
        connected: true,
        accountName: 'Mi Negocio IG',
        username: 'minegocio',
      });
    });

    it('lanza BadRequestException si credenciales inválidas', async () => {
      mockRepository.findById = jest.fn().mockResolvedValue({
        id: TENANT_ID,
        name: 'Mi Negocio',
      });

      mockMetaGraph.getAccountInfo.mockRejectedValue(
        new Error('Invalid credentials'),
      );

      await expect(
        service.connect(TENANT_ID, 'bad-token', 'bad-account'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('createPost', () => {
    it('publica inmediatamente si no hay scheduledAt', async () => {
      mockRepository.findById = jest.fn().mockResolvedValue({
        id: TENANT_ID, name: 'Mi Negocio',
      });
      mockMetaGraph.getAccountInfo.mockResolvedValue({
        name: 'Mi Negocio IG', username: 'minegocio',
      });

      await service.connect(TENANT_ID, 'valid-token', 'account-1');

      mockMetaGraph.publishPost.mockResolvedValue({ id: 'media-123' });

      const result = await service.createPost(
        TENANT_ID,
        'https://example.com/img.jpg',
        'Mi caption',
      );

      expect(mockMetaGraph.publishPost).toHaveBeenCalledWith(
        'valid-token',
        'account-1',
        'https://example.com/img.jpg',
        'Mi caption',
      );
      expect(result.status).toBe('published');
      expect(result.postId).toBeTruthy();
    });

    it('agenda con delay si scheduledAt es futuro', async () => {
      mockRepository.findById = jest.fn().mockResolvedValue({
        id: TENANT_ID, name: 'Mi Negocio',
      });
      mockMetaGraph.getAccountInfo.mockResolvedValue({
        name: 'Mi Negocio IG', username: 'minegocio',
      });

      await service.connect(TENANT_ID, 'valid-token', 'account-1');

      mockScheduler.schedulePost.mockResolvedValue('bull-job-1');

      const futureDate = new Date(Date.now() + 120_000).toISOString();

      const result = await service.createPost(
        TENANT_ID,
        'https://example.com/img.jpg',
        'Mi caption programada',
        futureDate,
      );

      expect(mockScheduler.schedulePost).toHaveBeenCalled();
      expect(result.status).toBe('scheduled');
    });
  });

  describe('webhook', () => {
    it('procesa comentario y ejecuta workflow correspondiente', async () => {
      mockRepository.findById = jest.fn().mockResolvedValue({
        id: TENANT_ID, name: 'Mi Negocio',
      });
      mockMetaGraph.getAccountInfo.mockResolvedValue({
        name: 'Mi Negocio IG', username: 'minegocio',
      });

      await service.connect(TENANT_ID, 'valid-token', 'ig-account-1');

      mockWorkflowService.executeMatchingWorkflows.mockResolvedValue([]);

      await service.handleWebhookEvent({
        object: 'instagram',
        entry: [
          {
            id: 'ig-account-1',
            changes: [
              {
                field: 'comments',
                value: {
                  text: 'Qué lindo producto!',
                  from: { id: 'user-1', username: 'cliente123' },
                  comment_id: 'comment-1',
                  media_id: 'media-1',
                  id: 'comment-1',
                },
              },
            ],
          },
        ],
      });

      expect(mockWorkflowService.executeMatchingWorkflows).toHaveBeenCalledWith(
        TENANT_ID,
        'INSTAGRAM_COMMENT',
        expect.objectContaining({
          comment: expect.objectContaining({
            text: 'Qué lindo producto!',
            from: 'cliente123',
          }),
        }),
        expect.any(Function),
      );
    });
  });

  describe('error handling', () => {
    it('lanza error si Meta API falla y no guarda como publicado', async () => {
      mockRepository.findById = jest.fn().mockResolvedValue({
        id: TENANT_ID, name: 'Mi Negocio',
      });
      mockMetaGraph.getAccountInfo.mockResolvedValue({
        name: 'Mi Negocio IG', username: 'minegocio',
      });

      await service.connect(TENANT_ID, 'valid-token', 'account-1');

      mockMetaGraph.publishPost.mockRejectedValue(
        new Error('Meta API error'),
      );

      await expect(
        service.createPost(
          TENANT_ID,
          'https://example.com/img.jpg',
          'falla',
        ),
      ).rejects.toThrow('Meta API error');

      const posts = await service.listPosts(TENANT_ID);
      expect(posts.total).toBe(1);
      expect(posts.data[0].status).toBe('failed');
    });
  });
});

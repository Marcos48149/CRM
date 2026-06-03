import { Test, TestingModule } from '@nestjs/testing';
import { WebhookHandler } from './webhook.handler';
import { MetaApiService } from './meta-api.service';
import { WorkflowService } from '../workflows/workflow.service';
import { UsageService } from '../tenants/usage.service';

const mockMetaApi = {
  sendTextMessage: jest.fn(),
};

const mockWorkflowService = {
  executeMatchingWorkflows: jest.fn(),
};

const mockUsageService = {
  isWithinLimit: jest.fn(),
  trackMessage: jest.fn(),
};

describe('WebhookHandler', () => {
  let handler: WebhookHandler;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookHandler,
        { provide: MetaApiService, useValue: mockMetaApi },
        { provide: WorkflowService, useValue: mockWorkflowService },
        { provide: UsageService, useValue: mockUsageService },
      ],
    }).compile();

    handler = module.get<WebhookHandler>(WebhookHandler);
  });

  it('procesa mensaje normalmente cuando está dentro del límite', async () => {
    mockUsageService.isWithinLimit.mockResolvedValue(true);
    mockWorkflowService.executeMatchingWorkflows.mockResolvedValue([
      { matched: true, steps: [] },
    ]);

    await handler.handleIncomingMessage(
      'tenant-1',
      'phone-id',
      'token',
      { from: '5491100000000', text: 'Hola', messageId: 'msg-1' },
    );

    expect(mockUsageService.trackMessage).toHaveBeenCalledWith('tenant-1');
    expect(mockWorkflowService.executeMatchingWorkflows).toHaveBeenCalled();
  });

  it('responde con mensaje de límite cuando se supera el límite mensual', async () => {
    mockUsageService.isWithinLimit.mockResolvedValue(false);

    await handler.handleIncomingMessage(
      'tenant-1',
      'phone-id',
      'token',
      { from: '5491100000000', text: 'Hola', messageId: 'msg-1' },
    );

    expect(mockMetaApi.sendTextMessage).toHaveBeenCalledWith(
      'phone-id',
      'token',
      '5491100000000',
      'Has alcanzado tu límite del plan Starter. Actualizá tu plan en autoclaw.app',
    );
    expect(mockUsageService.trackMessage).not.toHaveBeenCalled();
    expect(mockWorkflowService.executeMatchingWorkflows).not.toHaveBeenCalled();
  });

  it('envía fallback si no hay workflows que matcheen', async () => {
    mockUsageService.isWithinLimit.mockResolvedValue(true);
    mockWorkflowService.executeMatchingWorkflows.mockResolvedValue([
      { matched: false, steps: [] },
    ]);

    await handler.handleIncomingMessage(
      'tenant-1',
      'phone-id',
      'token',
      { from: '5491100000000', text: 'Hola', messageId: 'msg-1' },
    );

    expect(mockMetaApi.sendTextMessage).toHaveBeenCalledWith(
      'phone-id',
      'token',
      '5491100000000',
      'Un momento, te respondo enseguida',
    );
  });

});

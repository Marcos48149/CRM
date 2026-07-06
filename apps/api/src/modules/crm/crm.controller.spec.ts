import { Test, TestingModule } from '@nestjs/testing';
import { CrmController } from './crm.controller';
import { CrmService } from './crm.service';
import { CrmGateway } from './gateway/crm.gateway';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

describe('CrmController', () => {
  let controller: CrmController;

  const mockCrmService = {
    createContact: jest.fn(),
    findContactById: jest.fn(),
    findContactByPhone: jest.fn(),
    searchContacts: jest.fn(),
    updateContact: jest.fn(),
    createConversation: jest.fn(),
    findActiveConversationByContact: jest.fn(),
    queryConversations: jest.fn(),
    updateConversationStatus: jest.fn(),
    assignConversation: jest.fn(),
    createMessage: jest.fn(),
    getMessagesByConversation: jest.fn(),
    createTag: jest.fn(),
    findAllTags: jest.fn(),
    createAgentNote: jest.fn(),
    getAgentNotesByConversation: jest.fn(),
    upsertBotConfig: jest.fn(),
    findBotConfigByCategory: jest.fn(),
    findAllBotConfigs: jest.fn(),
    classifyByKeywords: jest.fn(),
  };

  const mockCrmGateway = {
    emitConversationUpdated: jest.fn(),
    emitMessageNew: jest.fn(),
    emitHandoffRequested: jest.fn(),
    emitHandoffTaken: jest.fn(),
  };

  const mockUser = {
    sub: 'user-1',
    email: 'user@example.com',
    role: 'OWNER',
    tenantId: 'tenant-1',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CrmController],
      providers: [
        { provide: CrmService, useValue: mockCrmService },
        { provide: CrmGateway, useValue: mockCrmGateway },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CrmController>(CrmController);
  });

  describe('Contacts', () => {
    const contactData = { id: 'c1', name: 'John', phone: '+5491123456789', tenantId: 'tenant-1' };

    it('GET /contacts returns paginated contacts', async () => {
      mockCrmService.searchContacts.mockResolvedValue({ data: [contactData], total: 1 });

      const result = await controller.searchContacts({ search: 'John' }, mockUser);

      expect(mockCrmService.searchContacts).toHaveBeenCalledWith(
        { search: 'John', skip: undefined, take: undefined },
        'tenant-1',
      );
      expect(result.data).toHaveLength(1);
    });

    it('POST /contacts creates a contact', async () => {
      mockCrmService.createContact.mockResolvedValue(contactData);

      const result = await controller.createContact(
        { name: 'John', phone: '+5491123456789' },
        mockUser,
      );

      expect(mockCrmService.createContact).toHaveBeenCalledWith(
        { name: 'John', phone: '+5491123456789' },
        'tenant-1',
      );
      expect(result.id).toBe('c1');
    });

    it('PATCH /contacts/:id updates a contact', async () => {
      mockCrmService.updateContact.mockResolvedValue({ ...contactData, name: 'Jane' });

      const result = await controller.updateContact('c1', { name: 'Jane' }, mockUser);

      expect(mockCrmService.updateContact).toHaveBeenCalledWith(
        'c1', { name: 'Jane' }, 'tenant-1',
      );
      expect(result.name).toBe('Jane');
    });
  });

  describe('Conversations', () => {
    it('GET /conversations returns paginated conversations', async () => {
      mockCrmService.queryConversations.mockResolvedValue({ data: [{ id: 'conv-1' }], total: 1 });

      const result = await controller.queryConversations({ status: 'bot_active' }, mockUser);

      expect(mockCrmService.queryConversations).toHaveBeenCalledWith(
        { status: 'bot_active', skip: undefined, take: undefined },
        'tenant-1',
      );
      expect(result.data).toHaveLength(1);
    });

    it('POST /conversations creates a conversation', async () => {
      mockCrmService.createConversation.mockResolvedValue({ id: 'conv-1', status: 'bot_active' });

      const result = await controller.createConversation(
        { contactId: 'c1', channel: 'whatsapp' },
        mockUser,
      );

      expect(mockCrmService.createConversation).toHaveBeenCalledWith(
        { contactId: 'c1', channel: 'whatsapp' },
        'tenant-1',
      );
      expect(result.status).toBe('bot_active');
    });

    it('POST /conversations/:id/assign assigns an agent', async () => {
      mockCrmService.assignConversation.mockResolvedValue({
        id: 'conv-1', assignedTo: 'agent-1', status: 'human_takeover',
      });

      const result = await controller.assignConversation('conv-1', 'agent-1', mockUser);

      expect(mockCrmService.assignConversation).toHaveBeenCalledWith(
        'conv-1', 'agent-1', 'tenant-1',
      );
      expect(mockCrmGateway.emitHandoffTaken).toHaveBeenCalled();
      expect(result.assignedTo).toBe('agent-1');
    });
  });

  describe('Messages', () => {
    it('POST /messages creates a message', async () => {
      mockCrmService.createMessage.mockResolvedValue({ id: 'm1', content: 'Hello' });

      const result = await controller.createMessage(
        { conversationId: 'conv-1', role: 'customer' as any, content: 'Hello' },
        mockUser,
      );

      expect(mockCrmService.createMessage).toHaveBeenCalledWith(
        { conversationId: 'conv-1', role: 'customer', content: 'Hello' },
        'tenant-1',
      );
      expect(mockCrmGateway.emitMessageNew).toHaveBeenCalled();
      expect(result.content).toBe('Hello');
    });
  });

  describe('Bot Configs', () => {
    it('GET /bot-configs returns all configs', async () => {
      mockCrmService.findAllBotConfigs.mockResolvedValue([{ id: 'bc-1', category: 'order-status' }]);

      const result = await controller.findAllBotConfigs(mockUser);

      expect(mockCrmService.findAllBotConfigs).toHaveBeenCalledWith('tenant-1');
      expect(result).toHaveLength(1);
    });

    it('PUT /bot-configs/:category upserts a config', async () => {
      const configData = { id: 'bc-1', category: 'order-status', prompt: 'Help' };
      mockCrmService.upsertBotConfig.mockResolvedValue(configData);

      const result = await controller.upsertBotConfig(
        'order-status' as any,
        { prompt: 'Help', keywords: ['order'], enabled: true },
        mockUser,
      );

      expect(mockCrmService.upsertBotConfig).toHaveBeenCalledWith(
        { category: 'order-status', prompt: 'Help', keywords: ['order'], enabled: true },
        'tenant-1',
      );
      expect(result.category).toBe('order-status');
    });
  });

  describe('Tags', () => {
    it('GET /tags returns all tags', async () => {
      mockCrmService.findAllTags.mockResolvedValue([{ id: 't1', name: 'vip' }]);

      const result = await controller.findAllTags(mockUser);

      expect(mockCrmService.findAllTags).toHaveBeenCalledWith('tenant-1');
      expect(result).toHaveLength(1);
    });

    it('POST /tags creates a tag', async () => {
      mockCrmService.createTag.mockResolvedValue({ id: 't1', name: 'vip' });

      const result = await controller.createTag({ name: 'vip' }, mockUser);

      expect(mockCrmService.createTag).toHaveBeenCalledWith({ name: 'vip' }, 'tenant-1');
      expect(result.name).toBe('vip');
    });
  });

  describe('Agent Notes', () => {
    it('GET /conversations/:id/notes returns notes', async () => {
      mockCrmService.getAgentNotesByConversation.mockResolvedValue([{ id: 'n1', content: 'Note' }]);

      const result = await controller.getAgentNotes('conv-1', mockUser);

      expect(mockCrmService.getAgentNotesByConversation).toHaveBeenCalledWith('conv-1', 'tenant-1');
      expect(result).toHaveLength(1);
    });

    it('POST /conversations/:id/notes creates a note', async () => {
      mockCrmService.createAgentNote.mockResolvedValue({ id: 'n1', content: 'Note' });

      const result = await controller.createAgentNote(
        'conv-1',
        { content: 'Note', conversationId: 'conv-1', authorId: 'user-1' } as any,
        mockUser,
      );

      expect(mockCrmService.createAgentNote).toHaveBeenCalledWith(
        { content: 'Note', conversationId: 'conv-1', authorId: 'user-1' },
        'tenant-1',
      );
      expect(result.content).toBe('Note');
    });
  });
});

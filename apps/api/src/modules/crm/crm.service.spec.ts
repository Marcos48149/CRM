import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CrmService } from './crm.service';
import { PrismaService } from './prisma.service';
import { ConversationStatus, BotCategory } from '@autoclaw/shared';

describe('CrmService', () => {
  let service: CrmService;

  const mockPrisma = {
    contact: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    conversation: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    message: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    tag: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    agentNote: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    botConfig: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn().mockImplementation((fn: (p: any) => any) => fn(mockPrisma)),
  } as any;

  const tenantId = 'tenant-1';
  const contactId = 'contact-1';
  const conversationId = 'conv-1';
  const messageId = 'msg-1';

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CrmService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CrmService>(CrmService);
  });

  // ── ContactService ─────────────────────────────────────────────────

  describe('ContactService', () => {
    const baseContact = {
      id: contactId,
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+5491123456789',
      tags: ['vip'],
      vtexCustomerId: null,
      totalOrders: 0,
      totalSpent: 0,
      lastPurchaseAt: null,
      metadata: {},
      firstSeenAt: new Date('2026-07-06'),
      blocked: false,
      tenantId,
      createdAt: new Date('2026-07-06'),
      updatedAt: new Date('2026-07-06'),
    };

    describe('createContact', () => {
      it('creates a new contact with valid data', async () => {
        mockPrisma.contact.create.mockResolvedValue(baseContact);

        const result = await service.createContact({
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+5491123456789',
          tags: ['vip'],
        }, tenantId);

        expect(mockPrisma.contact.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            name: 'John Doe',
            email: 'john@example.com',
            phone: '+5491123456789',
            tags: ['vip'],
            tenantId,
          }),
        });
        expect(result.id).toBe(contactId);
        expect(result.name).toBe('John Doe');
        expect(result.email).toBe('john@example.com');
      });
    });

    describe('findContactByPhone', () => {
      it('returns contact when phone matches', async () => {
        mockPrisma.contact.findFirst.mockResolvedValue(baseContact);

        const result = await service.findContactByPhone('+5491123456789', tenantId);

        expect(mockPrisma.contact.findFirst).toHaveBeenCalledWith({
          where: { phone: '+5491123456789', tenantId },
        });
        expect(result).not.toBeNull();
        expect((result as any).id).toBe(contactId);
      });

      it('returns null when no contact matches phone', async () => {
        mockPrisma.contact.findFirst.mockResolvedValue(null);

        const result = await service.findContactByPhone('+5491100000000', tenantId);

        expect(result).toBeNull();
      });
    });

    describe('searchContacts', () => {
      const contacts = [
        { ...baseContact, id: 'c1', name: 'Alice', phone: '+549111' },
        { ...baseContact, id: 'c2', name: 'Bob', phone: '+549112' },
      ];

      it('returns paginated contacts matching search term', async () => {
        mockPrisma.contact.findMany.mockResolvedValue(contacts);
        mockPrisma.contact.count.mockResolvedValue(2);

        const result = await service.searchContacts({ search: 'Ali', skip: 0, take: 10 }, tenantId);

        expect(mockPrisma.contact.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              tenantId,
              OR: expect.arrayContaining([
                expect.objectContaining({ name: expect.objectContaining({ contains: 'Ali' }) }),
              ]),
            }),
            skip: 0,
            take: 10,
          }),
        );
        expect(result.data).toHaveLength(2);
        expect(result.total).toBe(2);
      });

      it('returns empty list when no contacts match', async () => {
        mockPrisma.contact.findMany.mockResolvedValue([]);
        mockPrisma.contact.count.mockResolvedValue(0);

        const result = await service.searchContacts({ search: 'Nonexistent', skip: 0, take: 10 }, tenantId);

        expect(result.data).toHaveLength(0);
        expect(result.total).toBe(0);
      });
    });

    describe('upsertContactByPhone', () => {
      it('creates contact when no existing contact found', async () => {
        mockPrisma.contact.findFirst.mockResolvedValue(null);
        mockPrisma.contact.create.mockResolvedValue(baseContact);

        const result = await service.upsertContactByPhone({ phone: '+5491123456789', name: 'John' }, tenantId);

        expect(mockPrisma.contact.create).toHaveBeenCalled();
        expect(result).not.toBeNull();
        expect((result as any).id).toBe(contactId);
      });

      it('returns existing contact when phone already exists', async () => {
        mockPrisma.contact.findFirst.mockResolvedValue(baseContact);

        const result = await service.upsertContactByPhone({ phone: '+5491123456789', name: 'John' }, tenantId);

        expect(mockPrisma.contact.create).not.toHaveBeenCalled();
        expect((result as any).id).toBe(contactId);
      });

      it('returns null and does not create when phone is blocked', async () => {
        mockPrisma.contact.findFirst.mockResolvedValue({ ...baseContact, blocked: true });

        const result = await service.upsertContactByPhone({ phone: '+5491123456789' }, tenantId);

        expect(result).toBeNull();
      });
    });

    describe('updateContact', () => {
      it('updates contact name and returns updated contact', async () => {
        mockPrisma.contact.findUnique.mockResolvedValue(baseContact);
        mockPrisma.contact.update.mockResolvedValue({ ...baseContact, name: 'Jane Doe' });

        const result = await service.updateContact(contactId, { name: 'Jane Doe' }, tenantId);

        expect(mockPrisma.contact.update).toHaveBeenCalledWith({
          where: { id: contactId },
          data: { name: 'Jane Doe' },
        });
        expect(result.name).toBe('Jane Doe');
      });

      it('throws NotFoundException when contact does not exist', async () => {
        mockPrisma.contact.findUnique.mockResolvedValue(null);

        await expect(
          service.updateContact('nonexistent', { name: 'Jane' }, tenantId),
        ).rejects.toThrow(NotFoundException);
      });
    });
  });

  // ── ConversationService ────────────────────────────────────────────

  describe('ConversationService', () => {
    const baseConversation = {
      id: conversationId,
      status: 'bot_active' as const,
      channel: 'whatsapp',
      assignedTo: null as string | null,
      assignedAt: null as Date | null,
      escalatedAt: null as Date | null,
      escalatedBy: null as string | null,
      lastActivity: new Date('2026-07-06'),
      contactId,
      tenantId,
      createdAt: new Date('2026-07-06'),
      updatedAt: new Date('2026-07-06'),
    };

    describe('createConversation', () => {
      it('creates a new conversation with bot_active status', async () => {
        mockPrisma.conversation.create.mockResolvedValue(baseConversation);

        const result = await service.createConversation({ contactId, channel: 'whatsapp' }, tenantId);

        expect(mockPrisma.conversation.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            contactId,
            channel: 'whatsapp',
            tenantId,
            status: 'bot_active',
          }),
        });
        expect(result.status).toBe('bot_active');
      });
    });

    describe('findActiveConversationByContact', () => {
      it('returns open conversation when one exists and is recent', async () => {
        mockPrisma.conversation.findFirst.mockResolvedValue(baseConversation);

        const result = await service.findActiveConversationByContact(contactId, tenantId);

        expect(mockPrisma.conversation.findFirst).toHaveBeenCalledWith({
          where: {
            contactId,
            tenantId,
            status: { not: 'closed' },
            lastActivity: { gte: expect.any(Date) },
          },
          orderBy: { lastActivity: 'desc' },
        });
        expect(result).not.toBeNull();
        expect((result as any).id).toBe(conversationId);
      });

      it('returns null when only closed conversations exist', async () => {
        mockPrisma.conversation.findFirst.mockResolvedValue(null);

        const result = await service.findActiveConversationByContact(contactId, tenantId);

        expect(result).toBeNull();
      });
    });

    describe('updateConversationStatus', () => {
      it('transitions status from bot_active to human_takeover', async () => {
        mockPrisma.conversation.findUnique.mockResolvedValue(baseConversation);
        mockPrisma.conversation.update.mockResolvedValue({
          ...baseConversation,
          status: 'human_takeover',
          escalatedAt: new Date(),
          escalatedBy: 'agent-1',
        });

        const result = await service.updateConversationStatus(
          conversationId,
          ConversationStatus.HUMAN_TAKEOVER,
          tenantId,
          { escalatedBy: 'agent-1' },
        );

        expect(mockPrisma.conversation.update).toHaveBeenCalledWith({
          where: { id: conversationId },
          data: expect.objectContaining({
            status: 'human_takeover',
          }),
        });
        expect(result.status).toBe('human_takeover');
      });

      it('throws NotFoundException when conversation does not exist', async () => {
        mockPrisma.conversation.findUnique.mockResolvedValue(null);

        await expect(
          service.updateConversationStatus('nonexistent', ConversationStatus.CLOSED, tenantId),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('assignConversation', () => {
      it('assigns an agent to an active conversation', async () => {
        mockPrisma.conversation.findUnique.mockResolvedValue(baseConversation);
        mockPrisma.conversation.update.mockResolvedValue({
          ...baseConversation,
          assignedTo: 'agent-42',
          assignedAt: new Date(),
          status: 'human_takeover',
        });

        const result = await service.assignConversation(conversationId, 'agent-42', tenantId);

        expect(mockPrisma.conversation.update).toHaveBeenCalledWith({
          where: { id: conversationId },
          data: expect.objectContaining({
            assignedTo: 'agent-42',
            status: 'human_takeover',
          }),
        });
        expect(result.assignedTo).toBe('agent-42');
        expect(result.status).toBe('human_takeover');
      });

      it('throws NotFoundException when assigning to closed conversation', async () => {
        mockPrisma.conversation.findUnique.mockResolvedValue({
          ...baseConversation,
          status: 'closed',
        });

        await expect(
          service.assignConversation(conversationId, 'agent-42', tenantId),
        ).rejects.toThrow(NotFoundException);
      });
    });
  });

  // ── MessageService ─────────────────────────────────────────────────

  describe('MessageService', () => {
    const baseMessage = {
      id: messageId,
      role: 'customer' as const,
      content: 'Hola, quiero saber el estado de mi pedido',
      messageType: 'text' as const,
      status: 'received' as const,
      direction: 'INBOUND' as const,
      whatsappMsgId: 'wamid.123',
      metadata: {},
      conversationId,
      tenantId,
      createdAt: new Date('2026-07-06'),
    };

    describe('createMessage', () => {
      it('persists a message and updates conversation lastActivity', async () => {
        mockPrisma.message.create.mockResolvedValue(baseMessage);
        mockPrisma.conversation.update.mockResolvedValue({});

        const result = await service.createMessage({
          conversationId,
          role: 'customer' as any,
          content: 'Hola, quiero saber el estado de mi pedido',
          direction: 'INBOUND' as any,
          status: 'received' as any,
          whatsappMsgId: 'wamid.123',
        }, tenantId);

        expect(mockPrisma.message.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            conversationId,
            content: 'Hola, quiero saber el estado de mi pedido',
            whatsappMsgId: 'wamid.123',
            tenantId,
          }),
        });
        expect(result.id).toBe(messageId);
        expect(result.content).toBe('Hola, quiero saber el estado de mi pedido');
      });
    });

    describe('findMessageByWhatsAppId', () => {
      it('finds a message by WhatsApp message ID', async () => {
        mockPrisma.message.findFirst.mockResolvedValue(baseMessage);

        const result = await service.findMessageByWhatsAppId('wamid.123', tenantId);

        expect(mockPrisma.message.findFirst).toHaveBeenCalledWith({
          where: { whatsappMsgId: 'wamid.123', tenantId },
        });
        expect(result).not.toBeNull();
        expect((result as any).whatsappMsgId).toBe('wamid.123');
      });

      it('returns null when message ID is not found', async () => {
        mockPrisma.message.findFirst.mockResolvedValue(null);

        const result = await service.findMessageByWhatsAppId('nonexistent', tenantId);

        expect(result).toBeNull();
      });
    });

    describe('getMessagesByConversation', () => {
      it('returns messages for a conversation ordered by creation date', async () => {
        const messages = [
          { ...baseMessage, id: 'm1', content: 'First message' },
          { ...baseMessage, id: 'm2', content: 'Second message' },
        ];
        mockPrisma.message.findMany.mockResolvedValue(messages);

        const result = await service.getMessagesByConversation(conversationId, tenantId);

        expect(mockPrisma.message.findMany).toHaveBeenCalledWith({
          where: { conversationId, tenantId },
          orderBy: { createdAt: 'asc' },
        });
        expect(result).toHaveLength(2);
      });
    });
  });

  // ── TagService ─────────────────────────────────────────────────────

  describe('TagService', () => {
    const baseTag = {
      id: 'tag-1',
      name: 'vip',
      color: '#6366f1',
      tenantId,
      createdAt: new Date('2026-07-06'),
    };

    describe('createTag', () => {
      it('creates a tag with trimmed lowercase name', async () => {
        mockPrisma.tag.create.mockResolvedValue(baseTag);

        const result = await service.createTag({ name: '  VIP  ', color: '#ff0000' }, tenantId);

        expect(mockPrisma.tag.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            name: 'vip',
            color: '#ff0000',
            tenantId,
          }),
        });
        expect(result.name).toBe('vip');
      });

      it('throws ConflictException when tag name already exists for tenant', async () => {
        mockPrisma.tag.create.mockRejectedValue({ code: 'P2002' });

        await expect(
          service.createTag({ name: 'vip' }, tenantId),
        ).rejects.toThrow(ConflictException);
      });
    });

    describe('findAllTags', () => {
      it('returns all tags for tenant', async () => {
        const tags = [
          { ...baseTag, name: 'vip' },
          { ...baseTag, id: 't2', name: 'new' },
        ];
        mockPrisma.tag.findMany.mockResolvedValue(tags);

        const result = await service.findAllTags(tenantId);

        expect(mockPrisma.tag.findMany).toHaveBeenCalledWith({
          where: { tenantId },
          orderBy: { name: 'asc' },
        });
        expect(result).toHaveLength(2);
      });
    });
  });

  // ── AgentNoteService ───────────────────────────────────────────────

  describe('AgentNoteService', () => {
    const baseNote = {
      id: 'note-1',
      content: 'Cliente difícil, escalar a supervisor',
      authorId: 'agent-1',
      conversationId,
      tenantId,
      createdAt: new Date('2026-07-06'),
    };

    describe('createAgentNote', () => {
      it('creates an agent note on a conversation', async () => {
        mockPrisma.agentNote.create.mockResolvedValue(baseNote);

        const result = await service.createAgentNote({
          content: 'Cliente difícil, escalar a supervisor',
          conversationId,
          authorId: 'agent-1',
        }, tenantId);

        expect(mockPrisma.agentNote.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            content: 'Cliente difícil, escalar a supervisor',
            conversationId,
            authorId: 'agent-1',
            tenantId,
          }),
        });
        expect(result.content).toBe('Cliente difícil, escalar a supervisor');
      });
    });

    describe('getAgentNotesByConversation', () => {
      it('returns all notes for a conversation', async () => {
        const notes = [baseNote, { ...baseNote, id: 'n2', content: 'Resuelto' }];
        mockPrisma.agentNote.findMany.mockResolvedValue(notes);

        const result = await service.getAgentNotesByConversation(conversationId, tenantId);

        expect(mockPrisma.agentNote.findMany).toHaveBeenCalledWith({
          where: { conversationId, tenantId },
          orderBy: { createdAt: 'desc' },
        });
        expect(result).toHaveLength(2);
      });
    });
  });

  // ── BotConfigService ───────────────────────────────────────────────

  describe('BotConfigService', () => {
    const baseConfig = {
      id: 'bc-1',
      category: BotCategory.ORDER_STATUS,
      prompt: 'Ayuda al cliente con su pedido',
      keywords: ['pedido', 'orden', 'compra'],
      enabled: true,
      tenantId,
      createdAt: new Date('2026-07-06'),
      updatedAt: new Date('2026-07-06'),
    };

    describe('upsertBotConfig', () => {
      it('creates or updates a bot config by category', async () => {
        mockPrisma.botConfig.upsert.mockResolvedValue(baseConfig);

        const result = await service.upsertBotConfig({
          category: BotCategory.ORDER_STATUS,
          prompt: 'Ayuda al cliente con su pedido',
          keywords: ['pedido', 'orden', 'compra'],
          enabled: true,
        }, tenantId);

        expect(mockPrisma.botConfig.upsert).toHaveBeenCalledWith({
          where: {
            category_tenantId: {
              category: BotCategory.ORDER_STATUS,
              tenantId,
            },
          },
          update: expect.objectContaining({
            prompt: 'Ayuda al cliente con su pedido',
          }),
          create: expect.objectContaining({
            category: BotCategory.ORDER_STATUS,
            prompt: 'Ayuda al cliente con su pedido',
            tenantId,
          }),
        });
        expect(result.category).toBe(BotCategory.ORDER_STATUS);
      });
    });

    describe('findBotConfigByCategory', () => {
      it('finds config by category for tenant', async () => {
        mockPrisma.botConfig.findUnique.mockResolvedValue(baseConfig);

        const result = await service.findBotConfigByCategory(BotCategory.ORDER_STATUS, tenantId);

        expect(mockPrisma.botConfig.findUnique).toHaveBeenCalledWith({
          where: {
            category_tenantId: {
              category: BotCategory.ORDER_STATUS,
              tenantId,
            },
          },
        });
        expect(result).not.toBeNull();
        expect((result as any).category).toBe(BotCategory.ORDER_STATUS);
      });

      it('returns null when no config exists for category', async () => {
        mockPrisma.botConfig.findUnique.mockResolvedValue(null);

        const result = await service.findBotConfigByCategory(BotCategory.STOCK, tenantId);

        expect(result).toBeNull();
      });
    });

    describe('findAllBotConfigs', () => {
      it('returns all bot configs for tenant', async () => {
        const configs = [
          baseConfig,
          { ...baseConfig, id: 'bc-2', category: BotCategory.RETURNS },
        ];
        mockPrisma.botConfig.findMany.mockResolvedValue(configs);

        const result = await service.findAllBotConfigs(tenantId);

        expect(mockPrisma.botConfig.findMany).toHaveBeenCalledWith({
          where: { tenantId },
          orderBy: { category: 'asc' },
        });
        expect(result).toHaveLength(2);
      });
    });

    describe('classifyByKeywords', () => {
      it('returns matching category when text contains keywords', async () => {
        const configs = [
          { ...baseConfig, category: BotCategory.ORDER_STATUS, keywords: ['pedido', 'orden'] },
          { ...baseConfig, id: 'bc-2', category: BotCategory.RETURNS, keywords: ['devolver', 'cambio'] },
        ];
        mockPrisma.botConfig.findMany.mockResolvedValue(configs);

        const result = await service.classifyByKeywords('Quiero saber el estado de mi pedido', tenantId);

        expect(result).toBe(BotCategory.ORDER_STATUS);
      });

      it('returns general when no keywords match', async () => {
        mockPrisma.botConfig.findMany.mockResolvedValue([]);

        const result = await service.classifyByKeywords('Hola, cómo estás?', tenantId);

        expect(result).toBe(BotCategory.GENERAL);
      });
    });
  });
});

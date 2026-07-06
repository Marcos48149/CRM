import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { ConversationStatus, BotCategory } from '@autoclaw/shared';

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class CrmService {
  private readonly logger = new Logger(CrmService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── ContactService ─────────────────────────────────────────────────

  async createContact(
    dto: { name?: string; email?: string; phone?: string; tags?: string[]; blocked?: boolean },
    tenantId: string,
  ) {
    return this.prisma.contact.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        tags: (dto.tags ?? []) as any,
        blocked: dto.blocked ?? false,
        tenantId,
      },
    });
  }

  async findContactByPhone(phone: string, tenantId: string) {
    return this.prisma.contact.findFirst({
      where: { phone, tenantId },
    });
  }

  async findContactById(id: string) {
    return this.prisma.contact.findUnique({ where: { id } });
  }

  async searchContacts(
    query: { search?: string; phone?: string; email?: string; tag?: string; skip?: number; take?: number },
    tenantId: string,
  ) {
    const { search, phone, email, tag, skip = 0, take = 20 } = query;

    const where: any = { tenantId };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' as const } },
        { phone: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
      ];
    }
    if (phone) where.phone = { contains: phone };
    if (email) where.email = email;
    if (tag) where.tags = { has: tag };

    const [data, total] = await Promise.all([
      this.prisma.contact.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.contact.count({ where }),
    ]);

    return { data, total, skip, take };
  }

  async upsertContactByPhone(
    dto: { phone: string; name?: string; email?: string },
    tenantId: string,
  ) {
    const existing = await this.prisma.contact.findFirst({
      where: { phone: dto.phone, tenantId },
    });

    if (existing) {
      if (existing.blocked) return null;
      return existing;
    }

    return this.prisma.contact.create({
      data: {
        phone: dto.phone,
        name: dto.name,
        email: dto.email,
        tenantId,
      },
    });
  }

  async updateContact(id: string, dto: { name?: string; email?: string; phone?: string; tags?: string[]; blocked?: boolean }, tenantId: string) {
    const existing = await this.prisma.contact.findUnique({ where: { id } });
    if (!existing || existing.tenantId !== tenantId) {
      throw new NotFoundException('Contact not found');
    }

    return this.prisma.contact.update({
      where: { id },
      data: dto,
    });
  }

  // ── ConversationService ────────────────────────────────────────────

  async createConversation(
    dto: { contactId: string; channel?: string; status?: ConversationStatus },
    tenantId: string,
  ) {
    return this.prisma.conversation.create({
      data: {
        contactId: dto.contactId,
        channel: dto.channel ?? 'whatsapp',
        status: dto.status ?? ConversationStatus.BOT_ACTIVE,
        tenantId,
      },
    });
  }

  async findConversationById(id: string) {
    return this.prisma.conversation.findUnique({
      where: { id },
      include: { messages: true, contact: true },
    });
  }

  async findActiveConversationByContact(contactId: string, tenantId: string) {
    const cutoff = new Date(Date.now() - TWENTY_FOUR_HOURS_MS);

    return this.prisma.conversation.findFirst({
      where: {
        contactId,
        tenantId,
        status: { not: ConversationStatus.CLOSED },
        lastActivity: { gte: cutoff },
      },
      orderBy: { lastActivity: 'desc' },
    });
  }

  async findConversationsByContact(contactId: string, tenantId: string) {
    return this.prisma.conversation.findMany({
      where: { contactId, tenantId },
      orderBy: { lastActivity: 'desc' },
      include: { messages: { take: 1, orderBy: { createdAt: 'desc' } } },
    });
  }

  async queryConversations(
    query: { status?: string; contactId?: string; skip?: number; take?: number },
    tenantId: string,
  ) {
    const { status, contactId, skip = 0, take = 20 } = query;

    const where: any = { tenantId };
    if (status) where.status = status;
    if (contactId) where.contactId = contactId;

    const [data, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where,
        skip,
        take,
        orderBy: { lastActivity: 'desc' },
        include: { contact: true, messages: { take: 1, orderBy: { createdAt: 'desc' } } },
      }),
      this.prisma.conversation.count({ where }),
    ]);

    return { data, total, skip, take };
  }

  async updateConversationStatus(
    id: string,
    status: ConversationStatus,
    tenantId: string,
    extra?: { escalatedBy?: string },
  ) {
    const existing = await this.prisma.conversation.findUnique({ where: { id } });
    if (!existing || existing.tenantId !== tenantId) {
      throw new NotFoundException('Conversation not found');
    }

    const updateData: any = { status };

    if (status === ConversationStatus.HUMAN_TAKEOVER) {
      updateData.escalatedAt = new Date();
      if (extra?.escalatedBy) updateData.escalatedBy = extra.escalatedBy;
    }

    return this.prisma.conversation.update({
      where: { id },
      data: updateData,
    });
  }

  async assignConversation(id: string, agentId: string, tenantId: string) {
    const existing = await this.prisma.conversation.findUnique({ where: { id } });
    if (!existing || existing.tenantId !== tenantId) {
      throw new NotFoundException('Conversation not found');
    }
    if (existing.status === ConversationStatus.CLOSED) {
      throw new NotFoundException('Cannot assign a closed conversation');
    }

    return this.prisma.conversation.update({
      where: { id },
      data: {
        assignedTo: agentId,
        assignedAt: new Date(),
        status: ConversationStatus.HUMAN_TAKEOVER,
      },
    });
  }

  // ── MessageService ─────────────────────────────────────────────────

  async createMessage(
    dto: {
      conversationId: string;
      role: string;
      content: string;
      messageType?: string;
      direction?: string;
      status?: string;
      whatsappMsgId?: string;
      metadata?: any;
    },
    tenantId: string,
  ) {
    const message = await this.prisma.message.create({
      data: {
        conversationId: dto.conversationId,
        role: dto.role,
        content: dto.content,
        messageType: dto.messageType ?? 'text',
        direction: dto.direction ?? 'INBOUND',
        status: dto.status ?? 'received',
        whatsappMsgId: dto.whatsappMsgId,
        metadata: (dto.metadata ?? {}) as any,
        tenantId,
      },
    });

    await this.prisma.conversation.update({
      where: { id: dto.conversationId },
      data: { lastActivity: new Date() },
    });

    return message;
  }

  async findMessageByWhatsAppId(whatsappMsgId: string, tenantId: string) {
    return this.prisma.message.findFirst({
      where: { whatsappMsgId, tenantId },
    });
  }

  async getMessagesByConversation(conversationId: string, tenantId: string) {
    return this.prisma.message.findMany({
      where: { conversationId, tenantId },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ── TagService ─────────────────────────────────────────────────────

  async createTag(dto: { name: string; color?: string }, tenantId: string) {
    const normalizedName = dto.name.trim().toLowerCase();

    try {
      return await this.prisma.tag.create({
        data: {
          name: normalizedName,
          color: dto.color ?? '#6366f1',
          tenantId,
        },
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictException(`Tag "${normalizedName}" already exists`);
      }
      throw error;
    }
  }

  async findAllTags(tenantId: string) {
    return this.prisma.tag.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });
  }

  // ── AgentNoteService ───────────────────────────────────────────────

  async createAgentNote(
    dto: { content: string; conversationId: string; authorId: string },
    tenantId: string,
  ) {
    return this.prisma.agentNote.create({
      data: {
        content: dto.content,
        conversationId: dto.conversationId,
        authorId: dto.authorId,
        tenantId,
      },
    });
  }

  async getAgentNotesByConversation(conversationId: string, tenantId: string) {
    return this.prisma.agentNote.findMany({
      where: { conversationId, tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── BotConfigService ───────────────────────────────────────────────

  async upsertBotConfig(
    dto: { category: BotCategory; prompt?: string; keywords?: string[]; enabled?: boolean },
    tenantId: string,
  ) {
    return this.prisma.botConfig.upsert({
      where: {
        category_tenantId: {
          category: dto.category,
          tenantId,
        },
      },
      update: {
        ...(dto.prompt !== undefined && { prompt: dto.prompt }),
        ...(dto.keywords !== undefined && { keywords: dto.keywords }),
        ...(dto.enabled !== undefined && { enabled: dto.enabled }),
      },
      create: {
        category: dto.category,
        prompt: dto.prompt ?? '',
        keywords: dto.keywords ?? [],
        enabled: dto.enabled ?? true,
        tenantId,
      },
    });
  }

  async findBotConfigByCategory(category: BotCategory, tenantId: string) {
    return this.prisma.botConfig.findUnique({
      where: {
        category_tenantId: {
          category,
          tenantId,
        },
      },
    });
  }

  async findAllBotConfigs(tenantId: string) {
    return this.prisma.botConfig.findMany({
      where: { tenantId },
      orderBy: { category: 'asc' },
    });
  }

  async classifyByKeywords(text: string, tenantId: string): Promise<BotCategory> {
    const configs = await this.prisma.botConfig.findMany({
      where: { tenantId, enabled: true },
    });

    const lowerText = text.toLowerCase();

    for (const config of configs) {
      const keywords = (config.keywords as string[]) ?? [];
      for (const keyword of keywords) {
        if (lowerText.includes(keyword.toLowerCase())) {
          return config.category as BotCategory;
        }
      }
    }

    return BotCategory.GENERAL;
  }
}

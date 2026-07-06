import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CrmService } from './crm.service';
import { CrmGateway } from './gateway/crm.gateway';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { CreateContactDto, UpdateContactDto, ContactQueryDto } from './dto/create-contact.dto';
import { CreateConversationDto, UpdateConversationDto, ConversationQueryDto } from './dto/create-conversation.dto';
import { CreateMessageDto, MessageQueryDto } from './dto/create-message.dto';
import { CreateBotConfigDto, UpdateBotConfigDto } from './dto/bot-config.dto';
import { CreateTagDto, CreateAgentNoteDto } from './dto/create-tag.dto';
import { BotCategory } from '@autoclaw/shared';

@Controller('crm')
@UseGuards(JwtAuthGuard)
export class CrmController {
  constructor(
    private readonly crmService: CrmService,
    private readonly crmGateway: CrmGateway,
  ) {}

  // ── Contacts ──────────────────────────────────────────────────────

  @Get('contacts')
  searchContacts(
    @Query() query: ContactQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.crmService.searchContacts(query, user.tenantId);
  }

  @Post('contacts')
  createContact(
    @Body() dto: CreateContactDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.crmService.createContact(dto, user.tenantId);
  }

  @Get('contacts/:id')
  getContact(
    @Param('id') id: string,
  ) {
    return this.crmService.findContactById(id);
  }

  @Patch('contacts/:id')
  updateContact(
    @Param('id') id: string,
    @Body() dto: UpdateContactDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.crmService.updateContact(id, dto, user.tenantId);
  }

  // ── Conversations ─────────────────────────────────────────────────

  @Get('conversations')
  queryConversations(
    @Query() query: ConversationQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.crmService.queryConversations(query, user.tenantId);
  }

  @Post('conversations')
  createConversation(
    @Body() dto: CreateConversationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.crmService.createConversation(dto, user.tenantId);
  }

  @Get('conversations/:id')
  getConversation(
    @Param('id') id: string,
  ) {
    return this.crmService.findConversationById(id);
  }

  @Patch('conversations/:id/status')
  updateConversationStatus(
    @Param('id') id: string,
    @Body() dto: UpdateConversationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.crmService.updateConversationStatus(
      id,
      dto.status as any,
      user.tenantId,
    );
  }

  @Post('conversations/:id/assign')
  async assignConversation(
    @Param('id') id: string,
    @Body('agentId') agentId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const result = await this.crmService.assignConversation(id, agentId, user.tenantId);
    this.crmGateway.emitHandoffTaken(user.tenantId, {
      conversationId: id,
      agentId,
    });
    return result;
  }

  // ── Messages ──────────────────────────────────────────────────────

  @Get('messages')
  getMessages(
    @Query() query: MessageQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.crmService.getMessagesByConversation(query.conversationId!, user.tenantId);
  }

  @Post('messages')
  async createMessage(
    @Body() dto: CreateMessageDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const result = await this.crmService.createMessage(dto, user.tenantId);
    this.crmGateway.emitMessageNew(user.tenantId, result);
    return result;
  }

  // ── Bot Configs ───────────────────────────────────────────────────

  @Get('bot-configs')
  findAllBotConfigs(@CurrentUser() user: JwtPayload) {
    return this.crmService.findAllBotConfigs(user.tenantId);
  }

  @Put('bot-configs/:category')
  upsertBotConfig(
    @Param('category') category: BotCategory,
    @Body() dto: UpdateBotConfigDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.crmService.upsertBotConfig(
      { category, ...dto },
      user.tenantId,
    );
  }

  // ── Tags ──────────────────────────────────────────────────────────

  @Get('tags')
  findAllTags(@CurrentUser() user: JwtPayload) {
    return this.crmService.findAllTags(user.tenantId);
  }

  @Post('tags')
  createTag(
    @Body() dto: CreateTagDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.crmService.createTag(dto, user.tenantId);
  }

  // ── Agent Notes ───────────────────────────────────────────────────

  @Get('conversations/:id/notes')
  getAgentNotes(
    @Param('id') conversationId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.crmService.getAgentNotesByConversation(conversationId, user.tenantId);
  }

  @Post('conversations/:id/notes')
  createAgentNote(
    @Param('id') conversationId: string,
    @Body() dto: CreateAgentNoteDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.crmService.createAgentNote(
      { ...dto, conversationId },
      user.tenantId,
    );
  }
}

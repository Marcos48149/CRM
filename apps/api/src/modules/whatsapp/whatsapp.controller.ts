import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Query,
  Headers,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { WhatsAppService } from './whatsapp.service';
import { ConnectWhatsAppDto } from './dto/connect.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { RequireRole } from '../../common/decorators/require-role.decorator';

@Controller('whatsapp')
export class WhatsAppController {
  constructor(private readonly whatsappService: WhatsAppService) {}

  @Post('connect')
  @UseGuards(JwtAuthGuard)
  @RequireRole('OWNER')
  async connect(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ConnectWhatsAppDto,
  ) {
    return this.whatsappService.connect(
      user.tenantId,
      dto.phoneNumberId,
      dto.accessToken,
      dto.webhookSecret,
    );
  }

  @Delete('disconnect')
  @UseGuards(JwtAuthGuard)
  @RequireRole('OWNER')
  async disconnect(@CurrentUser() user: JwtPayload) {
    await this.whatsappService.disconnect(user.tenantId);
    return { disconnected: true };
  }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  async getStatus(@CurrentUser() user: JwtPayload) {
    return this.whatsappService.getStatus(user.tenantId);
  }

  @Post('send')
  @UseGuards(JwtAuthGuard)
  @RequireRole('OWNER')
  async sendMessage(
    @CurrentUser() user: JwtPayload,
    @Body() dto: SendMessageDto,
  ) {
    await this.whatsappService.sendTestMessage(
      user.tenantId,
      dto.to,
      dto.message,
    );
    return { sent: true };
  }

  @Get('webhook')
  async verifyWebhook(
    @Query() query: Record<string, string>,
  ) {
    const challenge = await this.whatsappService.verifyWebhook(query);
    return challenge;
  }

  @Post('webhook')
  async handleWebhook(
    @Headers('x-hub-signature-256') signature: string | undefined,
    @Req() req: Request,
  ) {
    this.whatsappService.validateWebhookSignature(
      signature,
      typeof req.body === 'string' ? req.body : JSON.stringify(req.body),
    );
    await this.whatsappService.handleWebhookEvent(
      typeof req.body === 'object' ? req.body : JSON.parse(req.body),
    );
    return { success: true };
  }
}

import {
  Controller,
  Get,
  Post,
  Body,
  Headers,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { BillingService } from './billing.service';
import { SubscribeDto } from './dto/subscribe.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { RequireRole } from '../../common/decorators/require-role.decorator';

@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post('subscribe')
  @UseGuards(JwtAuthGuard)
  @RequireRole('OWNER')
  async subscribe(
    @CurrentUser() user: JwtPayload,
    @Body() dto: SubscribeDto,
  ) {
    return this.billingService.subscribe(user.tenantId, dto.plan);
  }

  @Post('webhook')
  async handleWebhook(
    @Headers('x-signature') xSignature: string | undefined,
    @Headers('x-request-id') xRequestId: string | undefined,
    @Req() req: Request,
  ) {
    await this.billingService.handleWebhook(
      xSignature,
      xRequestId,
      typeof req.body === 'object' ? req.body : JSON.parse(req.body),
    );
    return { received: true };
  }

  @Get('current')
  @UseGuards(JwtAuthGuard)
  async getCurrent(@CurrentUser() user: JwtPayload) {
    return this.billingService.getCurrent(user.tenantId);
  }
}

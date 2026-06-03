import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Headers,
  Req,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { InstagramService } from './instagram.service';
import { ConnectInstagramDto } from './dto/connect.dto';
import { CreatePostDto } from './dto/create-post.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { RequireRole } from '../../common/decorators/require-role.decorator';

@Controller('instagram')
export class InstagramController {
  constructor(private readonly instagramService: InstagramService) {}

  @Post('connect')
  async connect(
    @Body() dto: ConnectInstagramDto,
  ) {
    return this.instagramService.connect(
      'default-tenant',
      dto.accessToken,
      dto.instagramAccountId,
    );
  }

  @Get('status')
  async getStatus() {
    return this.instagramService.getStatus('default-tenant');
  }

  @Post('posts')
  @UseGuards(JwtAuthGuard)
  @RequireRole('OWNER')
  async createPost(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreatePostDto,
  ) {
    return this.instagramService.createPost(
      user.tenantId,
      dto.imageUrl,
      dto.caption,
      dto.scheduledAt,
    );
  }

  @Get('posts')
  @UseGuards(JwtAuthGuard)
  async listPosts(
    @CurrentUser() user: JwtPayload,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = Math.max(1, parseInt(page || '1', 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit || '20', 10) || 20));
    return this.instagramService.listPosts(user.tenantId, pageNum, limitNum);
  }

  @Delete('posts/:id')
  @UseGuards(JwtAuthGuard)
  @RequireRole('OWNER')
  async deletePost(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    await this.instagramService.deletePost(user.tenantId, id);
    return { deleted: true };
  }

  @Post('webhook')
  async handleWebhook(
    @Headers('x-hub-signature-256') signature: string | undefined,
    @Req() req: Request,
  ) {
    this.instagramService.validateWebhookSignature(
      signature,
      typeof req.body === 'string' ? req.body : JSON.stringify(req.body),
    );
    await this.instagramService.handleWebhookEvent(
      typeof req.body === 'object' ? req.body : JSON.parse(req.body),
    );
    return { success: true };
  }
}

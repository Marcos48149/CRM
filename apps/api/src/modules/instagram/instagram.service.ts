import * as crypto from 'crypto';
import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MetaGraphService } from './meta-graph.service';
import { SchedulerService } from './scheduler.service';
import { encryptCredentials, decryptCredentials } from '../../common/utils/crypto';
import { TENANT_REPOSITORY, TenantRepository } from '../tenants/tenants.service';
import { WorkflowService } from '../workflows/workflow.service';

interface InstagramConnection {
  instagramAccountId: string;
  encryptedCredentials: string;
  accountName: string;
  username: string;
  active: boolean;
}

export interface InstagramPost {
  id: string;
  tenantId: string;
  imageUrl: string;
  caption: string;
  status: 'published' | 'scheduled' | 'failed';
  scheduledAt?: Date;
  createdAt: Date;
  error?: string;
  jobId?: string;
}

@Injectable()
export class InstagramService {
  private readonly logger = new Logger(InstagramService.name);
  private connections = new Map<string, InstagramConnection>();
  private posts = new Map<string, InstagramPost>();
  private postIdCounter = 0;

  constructor(
    private readonly metaGraph: MetaGraphService,
    private readonly scheduler: SchedulerService,
    private readonly configService: ConfigService,
    @Inject(TENANT_REPOSITORY)
    private readonly tenantRepository: TenantRepository,
    private readonly workflowService: WorkflowService,
  ) {
    this.scheduler.setOnPublish((tenantId, postId, success, error) => {
      const post = this.posts.get(postId);
      if (post) {
        post.status = success ? 'published' : 'failed';
        if (error) post.error = error;
        this.posts.set(postId, post);
      }
    });
  }

  async connect(
    tenantId: string,
    accessToken: string,
    instagramAccountId: string,
  ): Promise<{ connected: boolean; accountName: string; username: string }> {
    const tenant = await this.tenantRepository.findById(tenantId);
    if (!tenant) {
      throw new NotFoundException('Tenant no encontrado');
    }

    let accountInfo: { name: string; username: string };
    try {
      accountInfo = await this.metaGraph.getAccountInfo(
        accessToken,
        instagramAccountId,
      );
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Credenciales de Instagram inválidas',
      );
    }

    const encryptedCredentials = encryptCredentials({ accessToken });

    this.connections.set(tenantId, {
      instagramAccountId,
      encryptedCredentials,
      accountName: accountInfo.name,
      username: accountInfo.username,
      active: true,
    });

    this.logger.log(
      `Instagram connected for tenant ${tenantId}: ${accountInfo.username}`,
    );

    return {
      connected: true,
      accountName: accountInfo.name,
      username: accountInfo.username,
    };
  }

  async getStatus(
    tenantId: string,
  ): Promise<{
    connected: boolean;
    accountName?: string;
    username?: string;
  }> {
    const connection = this.connections.get(tenantId);
    if (!connection || !connection.active) {
      return { connected: false };
    }
    return {
      connected: true,
      accountName: connection.accountName,
      username: connection.username,
    };
  }

  async createPost(
    tenantId: string,
    imageUrl: string,
    caption: string,
    scheduledAt?: string,
  ): Promise<{ postId: string; status: 'published' | 'scheduled' }> {
    const connection = this.connections.get(tenantId);
    if (!connection || !connection.active) {
      throw new BadRequestException(
        'No hay cuenta de Instagram conectada. Conectá Instagram primero.',
      );
    }

    const postId = `ig-post-${++this.postIdCounter}`;
    const now = new Date();
    const scheduleDate = scheduledAt ? new Date(scheduledAt) : undefined;

    if (scheduleDate && scheduleDate > now) {
      const credentials = decryptCredentials(
        connection.encryptedCredentials,
      ) as { accessToken: string };

      const delayMs = scheduleDate.getTime() - now.getTime();

      const jobId = await this.scheduler.schedulePost(
        {
          tenantId,
          postId,
          accessToken: credentials.accessToken,
          accountId: connection.instagramAccountId,
          imageUrl,
          caption,
        },
        delayMs,
      );

      this.posts.set(postId, {
        id: postId,
        tenantId,
        imageUrl,
        caption,
        status: 'scheduled',
        scheduledAt: scheduleDate,
        createdAt: now,
        jobId,
      });

      this.logger.log(`Post ${postId} scheduled for ${scheduleDate.toISOString()}`);
      return { postId, status: 'scheduled' };
    }

    const credentials = decryptCredentials(
      connection.encryptedCredentials,
    ) as { accessToken: string };

    try {
      const result = await this.metaGraph.publishPost(
        credentials.accessToken,
        connection.instagramAccountId,
        imageUrl,
        caption,
      );

      this.posts.set(postId, {
        id: postId,
        tenantId,
        imageUrl,
        caption,
        status: 'published',
        createdAt: now,
      });

      this.logger.log(`Post ${postId} published (media ${result.id})`);
      return { postId, status: 'published' };
    } catch (error) {
      this.posts.set(postId, {
        id: postId,
        tenantId,
        imageUrl,
        caption,
        status: 'failed',
        createdAt: now,
        error: error instanceof Error ? error.message : 'Error al publicar',
      });
      throw error;
    }
  }

  async listPosts(tenantId: string, page = 1, limit = 20): Promise<{ data: InstagramPost[]; total: number; page: number; limit: number }> {
    const all: InstagramPost[] = [];
    for (const post of this.posts.values()) {
      if (post.tenantId === tenantId) {
        all.push(post);
      }
    }
    all.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = all.length;
    const start = (page - 1) * limit;
    const data = all.slice(start, start + limit);

    return { data, total, page, limit };
  }

  async deletePost(tenantId: string, postId: string): Promise<void> {
    const post = this.posts.get(postId);
    if (!post) {
      throw new NotFoundException('Post no encontrado');
    }
    if (post.tenantId !== tenantId) {
      throw new NotFoundException('Post no encontrado');
    }

    if (post.status === 'scheduled' && post.jobId) {
      await this.scheduler.cancelJob(post.jobId);
    }

    this.posts.delete(postId);
    this.logger.log(`Post ${postId} deleted`);
  }

  validateWebhookSignature(
    signatureHeader: string | undefined,
    rawBody: string,
  ): void {
    const appSecret = this.configService.get<string>('META_APP_SECRET');
    if (!appSecret) {
      this.logger.warn('META_APP_SECRET not configured, skipping HMAC validation');
      return;
    }

    if (!signatureHeader) {
      throw new BadRequestException('Falta firma HMAC del webhook de Instagram');
    }

    const expectedSignature = crypto
      .createHmac('sha256', appSecret)
      .update(rawBody)
      .digest('hex');

    const receivedSignature = signatureHeader.replace('sha256=', '').trim();

    if (expectedSignature !== receivedSignature) {
      throw new BadRequestException('Firma HMAC del webhook de Instagram inválida');
    }
  }

  async handleWebhookEvent(body: Record<string, unknown>): Promise<void> {
    const payload = body as {
      object?: string;
      entry?: Array<{
        id: string;
        changes?: Array<{
          field: string;
          value: {
            text?: string;
            from?: { id: string; username: string };
            comment_id?: string;
            media_id?: string;
            id?: string;
          };
        }>;
      }>;
    };

    if (payload.object !== 'instagram' || !payload.entry) {
      return;
    }

    for (const entry of payload.entry) {
      for (const change of entry.changes || []) {
        const instagramAccountId = entry.id;

        const tenantId = this.findTenantByAccountId(instagramAccountId);
        if (!tenantId) {
          this.logger.warn(
            `No tenant found for Instagram account ${instagramAccountId}`,
          );
          continue;
        }

        const eventData: Record<string, unknown> = {
          comment: {
            text: change.value.text || '',
            from: change.value.from?.username || '',
            commentId: change.value.comment_id,
          },
        };

        const trigger =
          change.field === 'comments'
            ? 'INSTAGRAM_COMMENT'
            : 'INSTAGRAM_MESSAGE';

        await this.workflowService.executeMatchingWorkflows(
          tenantId,
          trigger,
          eventData,
          async (_channel: string, _text: string) => {
            this.logger.log(
              `Reply action for ${trigger} in tenant ${tenantId}: ${_text}`,
            );
          },
        );
      }
    }
  }

  private findTenantByAccountId(accountId: string): string | undefined {
    for (const [tenantId, conn] of this.connections) {
      if (conn.instagramAccountId === accountId) {
        return tenantId;
      }
    }
    return undefined;
  }
}

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker, Job } from 'bullmq';

interface PostJobData {
  tenantId: string;
  postId: string;
  accessToken: string;
  accountId: string;
  imageUrl: string;
  caption: string;
}

@Injectable()
export class SchedulerService implements OnModuleDestroy {
  private readonly logger = new Logger(SchedulerService.name);
  private readonly queue: Queue<PostJobData>;
  private readonly worker: Worker<PostJobData>;
  private onPublish?: (tenantId: string, postId: string, success: boolean, error?: string) => void;

  constructor(private readonly configService: ConfigService) {
    const redisUrl = this.configService.get<string>(
      'REDIS_URL',
      'redis://localhost:6379',
    );
    const connection = { url: redisUrl };

    this.queue = new Queue<PostJobData>('instagram-posts', { connection });

    this.worker = new Worker<PostJobData>(
      'instagram-posts',
      async (job: Job<PostJobData>) => {
        this.logger.log(
          `Publishing post ${job.data.postId} for tenant ${job.data.tenantId}`,
        );
        try {
          const { default: axios } = await import('axios');
          const apiVersion = this.configService.get<string>(
            'META_WHATSAPP_API_VERSION',
            'v18.0',
          );

          const createRes = await axios.post(
            `https://graph.facebook.com/${apiVersion}/${job.data.accountId}/media`,
            {
              image_url: job.data.imageUrl,
              caption: job.data.caption,
            },
            {
              headers: {
                Authorization: `Bearer ${job.data.accessToken}`,
                'Content-Type': 'application/json',
              },
              timeout: 10_000,
            },
          );

          const creationId = createRes.data.id as string;

          await axios.post(
            `https://graph.facebook.com/${apiVersion}/${job.data.accountId}/media_publish`,
            { creation_id: creationId },
            {
              headers: {
                Authorization: `Bearer ${job.data.accessToken}`,
                'Content-Type': 'application/json',
              },
              timeout: 10_000,
            },
          );

          this.onPublish?.(job.data.tenantId, job.data.postId, true);
        } catch (error) {
          this.logger.error(
            `Failed to publish post ${job.data.postId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
          this.onPublish?.(
            job.data.tenantId,
            job.data.postId,
            false,
            error instanceof Error ? error.message : 'Unknown error',
          );
        }
      },
      { connection },
    );
  }

  setOnPublish(
    handler: (tenantId: string, postId: string, success: boolean, error?: string) => void,
  ): void {
    this.onPublish = handler;
  }

  async schedulePost(
    data: PostJobData,
    delayMs: number,
  ): Promise<string> {
    const job = await this.queue.add('publish-post', data, {
      delay: delayMs,
    });
    this.logger.log(
      `Scheduled post ${data.postId} with delay ${delayMs}ms, job ${job.id}`,
    );
    return job.id ?? 'unknown';
  }

  async cancelJob(jobId: string): Promise<void> {
    const job = await this.queue.getJob(jobId);
    if (job) {
      await job.remove();
      this.logger.log(`Cancelled job ${jobId}`);
    }
  }

  async onModuleDestroy() {
    await this.worker.close();
    await this.queue.close();
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

const MAX_RETRIES = 3;

@Injectable()
export class MetaGraphService {
  private readonly logger = new Logger(MetaGraphService.name);
  private readonly http: AxiosInstance;

  constructor(private readonly configService: ConfigService) {
    const apiVersion = this.configService.get<string>(
      'META_WHATSAPP_API_VERSION',
      'v18.0',
    );
    const baseURL = `https://graph.facebook.com/${apiVersion}`;

    this.http = axios.create({
      baseURL,
      timeout: 10_000,
    });
  }

  async getAccountInfo(
    accessToken: string,
    accountId: string,
  ): Promise<{ name: string; username: string }> {
    return this.withRetry(async () => {
      const res = await this.http.get<{ name: string; username: string }>(
        `/${accountId}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          params: { fields: 'name,username' },
        },
      );
      return res.data;
    });
  }

  async publishPost(
    accessToken: string,
    accountId: string,
    imageUrl: string,
    caption: string,
  ): Promise<{ id: string }> {
    return this.withRetry(async () => {
      const createRes = await this.http.post<{ id: string }>(
        `/${accountId}/media`,
        {
          image_url: imageUrl,
          caption,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const creationId = createRes.data.id;

      const publishRes = await this.http.post<{ id: string }>(
        `/${accountId}/media_publish`,
        { creation_id: creationId },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return { id: publishRes.data.id };
    });
  }

  private async withRetry<T>(
    fn: () => Promise<T>,
    attempt = 1,
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= MAX_RETRIES) {
        this.logger.error(
          `Meta API request failed after ${MAX_RETRIES} attempts`,
        );
        throw error;
      }

      const delay = Math.pow(2, attempt) * 1000;
      this.logger.warn(
        `Meta API request failed (attempt ${attempt}/${MAX_RETRIES}), retrying in ${delay}ms`,
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
      return this.withRetry(fn, attempt + 1);
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class MetaApiService {
  private readonly logger = new Logger(MetaApiService.name);
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

  async sendTextMessage(
    phoneNumberId: string,
    accessToken: string,
    to: string,
    text: string,
  ): Promise<void> {
    try {
      await this.http.post(
        `/${phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: text },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response?.data) {
        const metaError = error.response.data as { error?: { message?: string } };
        throw new Error(
          `Meta API error: ${metaError.error?.message || error.message}`,
        );
      }
      throw error;
    }
  }

  async getPhoneNumberInfo(
    phoneNumberId: string,
    accessToken: string,
  ): Promise<{ displayPhoneNumber: string }> {
    try {
      const res = await this.http.get<{ display_phone_number: string }>(
        `/${phoneNumberId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          params: { fields: 'display_phone_number' },
        },
      );

      return {
        displayPhoneNumber: res.data.display_phone_number,
      };
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response?.status === 400) {
        throw new Error('Credenciales de Meta inválidas');
      }
      if (axios.isAxiosError(error) && error.response?.data) {
        const metaError = error.response.data as { error?: { message?: string } };
        throw new Error(
          `Meta API error: ${metaError.error?.message || error.message}`,
        );
      }
      throw error;
    }
  }
}

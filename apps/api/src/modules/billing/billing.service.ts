import { Injectable, Logger, BadRequestException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TenantPlan } from '@autoclaw/shared';
import { TENANT_REPOSITORY, TenantRepository } from '../tenants/tenants.service';
import { UsageService } from '../tenants/usage.service';
import { PLAN_LIMITS } from '../tenants/usage.service';

interface SubscriptionData {
  preapprovalId: string;
  tenantId: string;
  plan: string;
  status: 'pending' | 'active' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
  renewalDate?: Date;
}

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private subscriptions = new Map<string, SubscriptionData>();

  constructor(
    private readonly configService: ConfigService,
    @Inject(TENANT_REPOSITORY)
    private readonly tenantRepository: TenantRepository,
    private readonly usageService: UsageService,
  ) {}

  async subscribe(
    tenantId: string,
    plan: 'PRO' | 'ENTERPRISE',
  ): Promise<{ checkoutUrl: string }> {
    const tenant = await this.tenantRepository.findById(tenantId);
    if (!tenant) {
      throw new BadRequestException('Tenant no encontrado');
    }

    const priceKey = plan === 'PRO' ? 'PLAN_PRO_PRICE_ARS' : 'PLAN_ENTERPRISE_PRICE_ARS';
    const price = this.configService.get<number>(priceKey);
    if (!price) {
      this.logger.error(`Price not configured for plan ${plan}`);
      throw new BadRequestException('Error de configuración de precios');
    }

    const successUrl = this.configService.get<string>('BILLING_SUCCESS_URL') || 'http://localhost:3001/settings';
    const baseUrl = this.configService.get<string>('MP_API_BASE') || 'https://api.mercadopago.com';
    const accessToken = this.configService.get<string>('MP_ACCESS_TOKEN');

    if (!accessToken) {
      throw new BadRequestException('MercadoPago no está configurado');
    }

    try {
      const { MercadoPagoConfig, PreApproval } = await import('mercadopago');
      const client = new MercadoPagoConfig({ accessToken });
      const preApproval = new PreApproval(client);

      const result = await preApproval.create({
        body: {
          reason: `Plan ${plan} - AutoClaw`,
          auto_recurring: {
            frequency: 1,
            frequency_type: 'months',
            transaction_amount: Number(price),
            currency_id: 'ARS',
          },
          back_url: successUrl,
          status: 'pending',
        },
      });

      this.subscriptions.set(tenantId, {
        preapprovalId: result.id!,
        tenantId,
        plan,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      this.logger.log(`Preapproval ${result.id} created for tenant ${tenantId} plan ${plan}`);

      return { checkoutUrl: result.init_point! };
    } catch (error) {
      this.logger.error(
        `Error creating MercadoPago preapproval: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new BadRequestException(
        'Error al crear la suscripción en MercadoPago. Intentalo de nuevo.',
      );
    }
  }

  async handleWebhook(
    xSignature: string | undefined,
    xRequestId: string | undefined,
    body: Record<string, unknown>,
  ): Promise<void> {
    const webhookSecret = this.configService.get<string>('MP_WEBHOOK_SECRET');
    if (!webhookSecret) {
      this.logger.warn('MP_WEBHOOK_SECRET not configured, skipping webhook validation');
    } else if (!xSignature) {
      throw new BadRequestException('Falta firma del webhook de MercadoPago');
    } else {
      try {
        const { WebhookSignatureValidator } = await import('mercadopago');

        const dataId = (body.data as Record<string, unknown>)?.id as string || body.id as string;

        WebhookSignatureValidator.validate({
          xSignature,
          xRequestId: xRequestId || '',
          dataId,
          secret: webhookSecret,
        });
      } catch {
        throw new BadRequestException('Firma del webhook de MercadoPago inválida');
      }
    }

    const action = body.action as string;
    const data = body.data as Record<string, unknown> | undefined;
    const preapprovalId = data?.id as string;

    if (!preapprovalId) {
      this.logger.warn('Webhook recibido sin preapprovalId');
      return;
    }

    const subscription = this.findByPreapprovalId(preapprovalId);
    if (!subscription) {
      this.logger.warn(`No se encontró suscripción para preapproval ${preapprovalId}`);
      return;
    }

    if (action === 'created' || action === 'updated') {
      try {
        const { MercadoPagoConfig, PreApproval } = await import('mercadopago');
        const accessToken = this.configService.get<string>('MP_ACCESS_TOKEN');
        if (!accessToken) return;

        const client = new MercadoPagoConfig({ accessToken });
        const preApproval = new PreApproval(client);
        const status = await preApproval.get({ id: preapprovalId });

        if (status.status === 'authorized') {
          await this.tenantRepository.update(subscription.tenantId, { plan: subscription.plan });
          subscription.status = 'active';
          subscription.updatedAt = new Date();

          const nextMonth = new Date();
          nextMonth.setMonth(nextMonth.getMonth() + 1);
          subscription.renewalDate = nextMonth;

          this.logger.log(
            `Plan actualizado a ${subscription.plan} para tenant ${subscription.tenantId}`,
          );
        } else if (status.status === 'cancelled') {
          await this.tenantRepository.update(subscription.tenantId, { plan: TenantPlan.STARTER });
          subscription.status = 'cancelled';
          subscription.updatedAt = new Date();

          this.logger.log(
            `Suscripción cancelada para tenant ${subscription.tenantId}, vuelta a STARTER`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Error procesando webhook de MercadoPago: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }
  }

  async getCurrent(
    tenantId: string,
  ): Promise<{
    plan: string;
    renewalDate: string | null;
    messagesUsed: number;
    messagesLimit: number;
    usagePercentage: number;
  }> {
    const tenant = await this.tenantRepository.findById(tenantId);
    if (!tenant) {
      throw new BadRequestException('Tenant no encontrado');
    }

    const usage = await this.usageService.getMonthlyUsage(tenantId);
    const planLimits = PLAN_LIMITS[tenant.plan];
    const messagesLimit = planLimits?.messagesPerMonth ?? 0;

    const subscription = this.subscriptions.get(tenantId);

    return {
      plan: tenant.plan,
      renewalDate: subscription?.renewalDate?.toISOString() || null,
      messagesUsed: usage.messagesUsed,
      messagesLimit,
      usagePercentage: messagesLimit > 0 ? Math.min(100, Math.round((usage.messagesUsed / messagesLimit) * 100)) : 0,
    };
  }

  private findByPreapprovalId(preapprovalId: string): SubscriptionData | undefined {
    for (const sub of this.subscriptions.values()) {
      if (sub.preapprovalId === preapprovalId) return sub;
    }
    return undefined;
  }
}

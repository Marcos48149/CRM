import { Injectable, Inject } from '@nestjs/common';
import { TenantPlan } from '@autoclaw/shared';
import { TENANT_REPOSITORY, TenantRepository } from './tenants.service';

export const PLAN_LIMITS: Record<string, { messagesPerMonth: number; activeWorkflows: number; integrations: string[] }> = {
  [TenantPlan.STARTER]: {
    messagesPerMonth: 500,
    activeWorkflows: 3,
    integrations: ['WHATSAPP'],
  },
  [TenantPlan.PRO]: {
    messagesPerMonth: 5000,
    activeWorkflows: 20,
    integrations: ['WHATSAPP', 'INSTAGRAM', 'VTEX'],
  },
  [TenantPlan.ENTERPRISE]: {
    messagesPerMonth: -1,
    activeWorkflows: -1,
    integrations: ['WHATSAPP', 'INSTAGRAM', 'VTEX'],
  },
};

@Injectable()
export class UsageService {
  private usageStore = new Map<string, number>();

  constructor(
    @Inject(TENANT_REPOSITORY)
    private readonly tenantRepository: TenantRepository,
  ) {}

  private getMonthKey(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  async trackMessage(tenantId: string): Promise<void> {
    const key = `${tenantId}:${this.getMonthKey()}`;
    this.usageStore.set(key, (this.usageStore.get(key) || 0) + 1);
  }

  async getMonthlyUsage(tenantId: string): Promise<{ messagesUsed: number }> {
    const key = `${tenantId}:${this.getMonthKey()}`;
    return { messagesUsed: this.usageStore.get(key) || 0 };
  }

  async isWithinLimit(tenantId: string, limitType: 'messagesPerMonth' | 'activeWorkflows'): Promise<boolean> {
    const tenant = await this.tenantRepository.findById(tenantId);
    if (!tenant) return false;

    const planLimits = PLAN_LIMITS[tenant.plan];
    if (!planLimits) return false;

    const limit = planLimits[limitType];
    if (limit === -1) return true;

    let currentUsage = 0;
    if (limitType === 'messagesPerMonth') {
      const usage = await this.getMonthlyUsage(tenantId);
      currentUsage = usage.messagesUsed;
    } else if (limitType === 'activeWorkflows') {
      currentUsage = await this.tenantRepository.countActiveWorkflows(tenantId);
    }

    return currentUsage < limit;
  }
}

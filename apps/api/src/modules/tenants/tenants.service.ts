import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { TenantResponseDto, TenantStatsDto } from './dto/tenant-response.dto';

export interface TenantData {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  containerName?: string;
  onboardingStep?: number;
  createdAt: Date;
}

export interface IntegrationData {
  type: string;
  active: boolean;
}

export interface TenantRepository {
  findById(id: string): Promise<TenantData | null>;
  update(id: string, data: Partial<TenantData>): Promise<TenantData>;
  findIntegrations(tenantId: string): Promise<IntegrationData[]>;
  countMessagesSince(tenantId: string, since: Date): Promise<number>;
  countActiveWorkflows(tenantId: string): Promise<number>;
}

export const TENANT_REPOSITORY = 'TenantRepository';

@Injectable()
export class TenantsService {
  constructor(
    @Inject(TENANT_REPOSITORY) private readonly repository: TenantRepository,
  ) {}

  async getTenant(tenantId: string): Promise<TenantResponseDto> {
    const tenant = await this.repository.findById(tenantId);
    if (!tenant) {
      throw new NotFoundException('Tenant no encontrado');
    }

    const integrations = await this.repository.findIntegrations(tenantId);

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      plan: tenant.plan,
      status: tenant.status,
      containerName: tenant.containerName,
      onboardingStep: tenant.onboardingStep,
      integrations: integrations.map((i) => ({
        type: i.type,
        active: i.active,
      })),
      createdAt: tenant.createdAt,
    };
  }

  async updateOnboarding(
    tenantId: string,
    step: number,
  ): Promise<TenantResponseDto> {
    const tenant = await this.repository.findById(tenantId);
    if (!tenant) {
      throw new NotFoundException('Tenant no encontrado');
    }

    if (step >= 4) {
      await this.repository.update(tenantId, { status: 'ACTIVE', onboardingStep: 4 });
    } else {
      await this.repository.update(tenantId, { onboardingStep: step });
    }

    return this.getTenant(tenantId);
  }

  async updateTenant(
    tenantId: string,
    data: UpdateTenantDto,
  ): Promise<TenantResponseDto> {
    const tenant = await this.repository.findById(tenantId);
    if (!tenant) {
      throw new NotFoundException('Tenant no encontrado');
    }

    const updated = await this.repository.update(tenantId, {
      ...(data.name && { name: data.name }),
    });

    const integrations = await this.repository.findIntegrations(tenantId);

    return {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      plan: updated.plan,
      status: updated.status,
      containerName: updated.containerName,
      integrations: integrations.map((i) => ({
        type: i.type,
        active: i.active,
      })),
      createdAt: updated.createdAt,
    };
  }

  async getStats(tenantId: string): Promise<TenantStatsDto> {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const [totalMessages, activeWorkflows, integrations] = await Promise.all([
      this.repository.countMessagesSince(tenantId, oneMonthAgo),
      this.repository.countActiveWorkflows(tenantId),
      this.repository.findIntegrations(tenantId),
    ]);

    return {
      totalMessages,
      activeWorkflows,
      integrations: integrations
        .filter((i) => i.active)
        .map((i) => i.type),
      containerStatus: 'not_found',
    };
  }
}

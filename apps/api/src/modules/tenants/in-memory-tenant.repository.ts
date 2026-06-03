import { Injectable } from '@nestjs/common';
import { TenantRepository, TenantData, IntegrationData } from './tenants.service';

@Injectable()
export class InMemoryTenantRepository implements TenantRepository {
  private tenants: TenantData[] = [
    {
      id: 'default-tenant',
      name: 'Mi Negocio',
      slug: 'mi-negocio',
      plan: 'STARTER',
      status: 'onboarding',
      onboardingStep: 1,
      createdAt: new Date(),
    },
  ];

  private integrations: IntegrationData[] = [];

  async findById(id: string): Promise<TenantData | null> {
    return this.tenants.find((t) => t.id === id) ?? null;
  }

  async update(id: string, data: Partial<TenantData>): Promise<TenantData> {
    const index = this.tenants.findIndex((t) => t.id === id);
    if (index === -1) {
      throw new Error('Tenant no encontrado');
    }
    this.tenants[index] = { ...this.tenants[index], ...data };
    return this.tenants[index];
  }

  async findIntegrations(_tenantId: string): Promise<IntegrationData[]> {
    return this.integrations;
  }

  async countMessagesSince(_tenantId: string, _since: Date): Promise<number> {
    return 0;
  }

  async countActiveWorkflows(_tenantId: string): Promise<number> {
    return 0;
  }
}

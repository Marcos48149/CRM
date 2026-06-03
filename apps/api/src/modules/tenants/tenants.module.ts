import { Module } from '@nestjs/common';
import { TenantsController } from './tenants.controller';
import { TenantsService, TENANT_REPOSITORY } from './tenants.service';
import { InMemoryTenantRepository } from './in-memory-tenant.repository';
import { UsageService } from './usage.service';

@Module({
  controllers: [TenantsController],
  providers: [
    TenantsService,
    UsageService,
    {
      provide: TENANT_REPOSITORY,
      useClass: InMemoryTenantRepository,
    },
  ],
  exports: [TenantsService, UsageService, TENANT_REPOSITORY],
})
export class TenantsModule {}

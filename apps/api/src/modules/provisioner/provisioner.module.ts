import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ProvisionerService } from './provisioner.service';
import { TenantsModule } from '../tenants/tenants.module';

@Module({
  imports: [ConfigModule, TenantsModule],
  providers: [ProvisionerService],
  exports: [ProvisionerService],
})
export class ProvisionerModule {}

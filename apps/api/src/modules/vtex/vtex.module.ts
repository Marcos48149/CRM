import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { VtexController } from './vtex.controller';
import { VtexService } from './vtex.service';
import { VtexApiService } from './vtex-api.service';
import { TenantsModule } from '../tenants/tenants.module';

@Module({
  imports: [ConfigModule, TenantsModule],
  controllers: [VtexController],
  providers: [VtexService, VtexApiService],
  exports: [VtexService],
})
export class VtexModule {}

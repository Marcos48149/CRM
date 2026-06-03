import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppService } from './whatsapp.service';
import { MetaApiService } from './meta-api.service';
import { WebhookHandler } from './webhook.handler';
import { TenantsModule } from '../tenants/tenants.module';
import { WorkflowsModule } from '../workflows/workflow.module';

@Module({
  imports: [ConfigModule, TenantsModule, WorkflowsModule],
  controllers: [WhatsAppController],
  providers: [WhatsAppService, MetaApiService, WebhookHandler],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}

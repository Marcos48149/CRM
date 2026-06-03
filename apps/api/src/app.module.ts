import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TenantsModule } from './modules/tenants/tenants.module';
import { ProvisionerModule } from './modules/provisioner/provisioner.module';
import { WhatsAppModule } from './modules/whatsapp/whatsapp.module';
import { WorkflowsModule } from './modules/workflows/workflow.module';
import { InstagramModule } from './modules/instagram/instagram.module';
import { VtexModule } from './modules/vtex/vtex.module';
import { BillingModule } from './modules/billing/billing.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    AuthModule,
    TenantsModule,
    ProvisionerModule,
    WhatsAppModule,
    WorkflowsModule,
    InstagramModule,
    VtexModule,
    BillingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

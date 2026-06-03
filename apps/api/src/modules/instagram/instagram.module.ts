import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { InstagramController } from './instagram.controller';
import { InstagramService } from './instagram.service';
import { MetaGraphService } from './meta-graph.service';
import { SchedulerService } from './scheduler.service';
import { TenantsModule } from '../tenants/tenants.module';
import { WorkflowsModule } from '../workflows/workflow.module';

@Module({
  imports: [ConfigModule, TenantsModule, WorkflowsModule],
  controllers: [InstagramController],
  providers: [InstagramService, MetaGraphService, SchedulerService],
  exports: [InstagramService],
})
export class InstagramModule {}

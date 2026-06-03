import { Module } from '@nestjs/common';
import { WorkflowController } from './workflow.controller';
import { WorkflowService } from './workflow.service';
import { WorkflowExecutorService } from './workflow-executor.service';
import { TenantsModule } from '../tenants/tenants.module';

@Module({
  imports: [TenantsModule],
  controllers: [WorkflowController],
  providers: [WorkflowService, WorkflowExecutorService],
  exports: [WorkflowService, WorkflowExecutorService],
})
export class WorkflowsModule {}

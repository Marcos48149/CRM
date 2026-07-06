import { Module } from '@nestjs/common';
import { CrmController } from './crm.controller';
import { CrmService } from './crm.service';
import { CrmGateway } from './gateway/crm.gateway';
import { VtexEnrichmentProcessor } from './processors/vtex-enrichment.processor';
import { PrismaService } from './prisma.service';

@Module({
  controllers: [CrmController],
  providers: [
    CrmService,
    CrmGateway,
    PrismaService,
    VtexEnrichmentProcessor,
  ],
  exports: [CrmService, CrmGateway, PrismaService],
})
export class CrmModule {}

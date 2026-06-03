import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { RequireRole } from '../../common/decorators/require-role.decorator';

@Controller('workflows')
@UseGuards(JwtAuthGuard)
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  @Get()
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = Math.max(1, parseInt(page || '1', 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit || '20', 10) || 20));
    return this.workflowService.findAll(user.tenantId, pageNum, limitNum);
  }

  @Post()
  @RequireRole('OWNER')
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateWorkflowDto,
  ) {
    return this.workflowService.create(user.tenantId, dto);
  }

  @Patch(':id')
  @RequireRole('OWNER')
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateWorkflowDto,
  ) {
    return this.workflowService.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @RequireRole('OWNER')
  async delete(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    await this.workflowService.delete(user.tenantId, id);
    return { deleted: true };
  }

  @Patch(':id/toggle')
  @RequireRole('OWNER')
  async toggle(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.workflowService.toggle(user.tenantId, id);
  }
}

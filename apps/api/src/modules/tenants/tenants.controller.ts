import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
} from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { TenantResponseDto, TenantStatsDto } from './dto/tenant-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller('tenants')
@UseGuards(JwtAuthGuard)
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get('me')
  getMe(@CurrentUser() user: JwtPayload): Promise<TenantResponseDto> {
    return this.tenantsService.getTenant(user.tenantId);
  }

  @Patch('me')
  updateMe(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateTenantDto,
  ): Promise<TenantResponseDto> {
    return this.tenantsService.updateTenant(user.tenantId, dto);
  }

  @Patch('me/onboarding')
  updateOnboarding(
    @CurrentUser() user: JwtPayload,
    @Body('step') step: number,
  ): Promise<TenantResponseDto> {
    return this.tenantsService.updateOnboarding(user.tenantId, step);
  }

  @Get('me/stats')
  getStats(@CurrentUser() user: JwtPayload): Promise<TenantStatsDto> {
    return this.tenantsService.getStats(user.tenantId);
  }
}

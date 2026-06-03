import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { VtexService } from './vtex.service';
import { ConnectVtexDto } from './dto/connect.dto';
import { QueryOrdersDto, QueryProductsDto, OpenClawToolDto } from './dto/query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { RequireRole } from '../../common/decorators/require-role.decorator';

@Controller('vtex')
export class VtexController {
  constructor(private readonly vtexService: VtexService) {}

  @Post('connect')
  async connect(
    @Body() dto: ConnectVtexDto,
  ) {
    return this.vtexService.connect(
      'default-tenant',
      dto.accountName,
      dto.appKey,
      dto.appToken,
    );
  }

  @Get('status')
  async getStatus() {
    return this.vtexService.getStatus('default-tenant');
  }

  @Get('orders')
  @UseGuards(JwtAuthGuard)
  async getOrders(
    @CurrentUser() user: JwtPayload,
    @Query() query: QueryOrdersDto,
  ) {
    if (query.orderId) {
      return this.vtexService.getOrder(user.tenantId, query.orderId);
    }
    if (query.email) {
      return this.vtexService.searchOrdersByEmail(user.tenantId, query.email);
    }
    return { error: 'Debe proporcionar orderId o email' };
  }

  @Get('products')
  @UseGuards(JwtAuthGuard)
  async getProducts(
    @CurrentUser() user: JwtPayload,
    @Query() query: QueryProductsDto,
  ) {
    return this.vtexService.searchProducts(user.tenantId, query.q);
  }

  @Post('openclaw-tool')
  @UseGuards(JwtAuthGuard)
  async openClawTool(
    @CurrentUser() user: JwtPayload,
    @Body() dto: OpenClawToolDto,
  ) {
    return this.vtexService.executeTool(user.tenantId, dto.tool, dto.params);
  }
}

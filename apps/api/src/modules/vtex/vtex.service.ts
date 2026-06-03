import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VtexApiService } from './vtex-api.service';
import { encryptCredentials, decryptCredentials } from '../../common/utils/crypto';
import { TENANT_REPOSITORY, TenantRepository } from '../tenants/tenants.service';
import { VtexOrder, VtexProduct } from '@autoclaw/shared';

interface VtexConnection {
  accountName: string;
  encryptedCredentials: string;
  active: boolean;
}

@Injectable()
export class VtexService {
  private readonly logger = new Logger(VtexService.name);
  private connections = new Map<string, VtexConnection>();

  constructor(
    private readonly vtexApi: VtexApiService,
    private readonly configService: ConfigService,
    @Inject(TENANT_REPOSITORY)
    private readonly tenantRepository: TenantRepository,
  ) {}

  async connect(
    tenantId: string,
    accountName: string,
    appKey: string,
    appToken: string,
  ): Promise<{ connected: boolean; accountName: string }> {
    const tenant = await this.tenantRepository.findById(tenantId);
    if (!tenant) {
      throw new NotFoundException('Tenant no encontrado');
    }

    try {
      await this.vtexApi.verifyCredentials(accountName, appKey, appToken);
    } catch {
      throw new BadRequestException(
        'Credenciales de VTEX inválidas. Verificá el Account Name, App Key y App Token.',
      );
    }

    const encryptedCredentials = encryptCredentials({ appKey, appToken });

    this.connections.set(tenantId, {
      accountName,
      encryptedCredentials,
      active: true,
    });

    this.logger.log(`VTEX connected for tenant ${tenantId}: ${accountName}`);

    return { connected: true, accountName };
  }

  async getStatus(
    tenantId: string,
  ): Promise<{ connected: boolean; accountName?: string }> {
    const connection = this.connections.get(tenantId);
    if (!connection || !connection.active) {
      return { connected: false };
    }
    return { connected: true, accountName: connection.accountName };
  }

  private getConnection(tenantId: string): VtexConnection {
    const conn = this.connections.get(tenantId);
    if (!conn || !conn.active) {
      throw new BadRequestException(
        'No hay cuenta de VTEX conectada. Conectá VTEX primero.',
      );
    }
    return conn;
  }

  private getCredentials(
    conn: VtexConnection,
  ): { appKey: string; appToken: string } {
    return decryptCredentials(conn.encryptedCredentials) as {
      appKey: string;
      appToken: string;
    };
  }

  async getOrder(
    tenantId: string,
    orderId: string,
  ): Promise<VtexOrder> {
    const conn = this.getConnection(tenantId);
    const creds = this.getCredentials(conn);
    return this.vtexApi.getOrder(conn.accountName, creds.appKey, creds.appToken, orderId);
  }

  async searchOrdersByEmail(
    tenantId: string,
    email: string,
  ): Promise<VtexOrder[]> {
    const conn = this.getConnection(tenantId);
    const creds = this.getCredentials(conn);
    return this.vtexApi.searchOrders(conn.accountName, creds.appKey, creds.appToken, email);
  }

  async getProduct(
    tenantId: string,
    productId: string,
  ): Promise<VtexProduct> {
    const conn = this.getConnection(tenantId);
    const creds = this.getCredentials(conn);
    return this.vtexApi.getProduct(conn.accountName, creds.appKey, creds.appToken, productId);
  }

  async searchProducts(
    tenantId: string,
    query: string,
  ): Promise<VtexProduct[]> {
    const conn = this.getConnection(tenantId);
    const creds = this.getCredentials(conn);
    return this.vtexApi.searchProducts(conn.accountName, creds.appKey, creds.appToken, query);
  }

  async executeTool(
    tenantId: string,
    tool: 'get_order' | 'search_products',
    params: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const conn = this.getConnection(tenantId);
    const creds = this.getCredentials(conn);

    switch (tool) {
      case 'get_order': {
        const orderId = params.orderId as string;
        if (!orderId) {
          return { error: 'orderId es requerido' };
        }
        const order = await this.vtexApi.getOrder(
          conn.accountName,
          creds.appKey,
          creds.appToken,
          orderId,
        );
        return { result: order };
      }

      case 'search_products': {
        const query = params.query as string;
        if (!query) {
          return { error: 'query es requerido' };
        }
        const products = await this.vtexApi.searchProducts(
          conn.accountName,
          creds.appKey,
          creds.appToken,
          query,
        );
        return {
          result: products.map((p) => ({
            id: p.id,
            name: p.name,
            price: p.price,
          })),
        };
      }

      default:
        return { error: `Herramienta no soportada: ${tool}` };
    }
  }
}

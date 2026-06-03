import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { VtexOrder, VtexProduct, VtexInventory } from '@autoclaw/shared';

@Injectable()
export class VtexApiService {
  private readonly logger = new Logger(VtexApiService.name);
  private readonly timeout = 10000;

  private createClient(
    accountName: string,
    appKey: string,
    appToken: string,
  ): AxiosInstance {
    return axios.create({
      baseURL: `https://${accountName}.vtexcommercestable.com.br`,
      timeout: this.timeout,
      headers: {
        'X-VTEX-API-AppKey': appKey,
        'X-VTEX-API-AppToken': appToken,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
  }

  async verifyCredentials(
    accountName: string,
    appKey: string,
    appToken: string,
  ): Promise<{ vendor: string }> {
    const client = this.createClient(accountName, appKey, appToken);
    const response = await client.get('/api/licensing/account');
    return response.data as { vendor: string };
  }

  async getOrder(
    accountName: string,
    appKey: string,
    appToken: string,
    orderId: string,
  ): Promise<VtexOrder> {
    const client = this.createClient(accountName, appKey, appToken);
    const response = await client.get(
      `/api/oms/pvt/orders/${orderId}`,
    );
    return this.mapVtexOrder(response.data);
  }

  async searchOrders(
    accountName: string,
    appKey: string,
    appToken: string,
    email: string,
  ): Promise<VtexOrder[]> {
    const client = this.createClient(accountName, appKey, appToken);
    const response = await client.get('/api/oms/pvt/orders', {
      params: { clientEmail: email },
    });
    const body = response.data as { list?: Array<Record<string, unknown>> };
    return (body.list || []).map((item) => this.mapVtexOrder(item));
  }

  async getProduct(
    accountName: string,
    appKey: string,
    appToken: string,
    productId: string,
  ): Promise<VtexProduct> {
    const client = this.createClient(accountName, appKey, appToken);
    const response = await client.get(
      `/api/catalog/pvt/product/${productId}`,
    );
    return this.mapVtexProduct(response.data);
  }

  async searchProducts(
    accountName: string,
    appKey: string,
    appToken: string,
    query: string,
  ): Promise<VtexProduct[]> {
    const client = this.createClient(accountName, appKey, appToken);
    const response = await client.get(
      '/api/catalog_system/pub/products/search',
      { params: { q: query } },
    );
    return (response.data as Array<Record<string, unknown>>).map((item) =>
      this.mapVtexProduct(item),
    );
  }

  async getInventory(
    accountName: string,
    appKey: string,
    appToken: string,
    skuId: string,
  ): Promise<VtexInventory> {
    const client = this.createClient(accountName, appKey, appToken);
    const response = await client.get(
      `/api/logistics/pvt/inventory/skus/${skuId}`,
    );
    return this.mapVtexInventory(response.data);
  }

  private mapVtexOrder(data: Record<string, unknown>): VtexOrder {
    return {
      orderId: (data.orderId as string) || '',
      status: (data.status as string) || '',
      totalValue: (data.totalValue as number) || 0,
      items: ((data.items as Array<Record<string, unknown>>) || []).map(
        (item) => ({
          id: (item.id as string) || '',
          name: (item.name as string) || '',
          quantity: (item.quantity as number) || 0,
          price: (item.price as number) || 0,
        }),
      ),
      creationDate: (data.creationDate as string) || '',
      clientProfileData: {
        email: ((data.clientProfileData as Record<string, unknown>)
          ?.email as string) || '',
        firstName: ((data.clientProfileData as Record<string, unknown>)
          ?.firstName as string) || '',
        lastName: ((data.clientProfileData as Record<string, unknown>)
          ?.lastName as string) || '',
        phone: ((data.clientProfileData as Record<string, unknown>)
          ?.phone as string) || '',
      },
    };
  }

  private mapVtexProduct(data: Record<string, unknown>): VtexProduct {
    return {
      id: String((data.id as number) || (data.productId as string) || ''),
      name: (data.productName as string) || (data.name as string) || '',
      description: (data.description as string) || '',
      price: (data.price as number) || (data.bestPrice as number) || 0,
      images: ((data.images as Array<Record<string, unknown>>) || []).map(
        (img) => ({
          imageUrl: (img.imageUrl as string) || '',
          imageLabel: (img.imageLabel as string) || '',
        }),
      ),
    };
  }

  private mapVtexInventory(data: Record<string, unknown>): VtexInventory {
    const warehouses = (data.balance as Array<Record<string, unknown>>) || [];
    return {
      skuId: (data.skuId as string) || '',
      warehouseName: warehouses.length > 0 ? (warehouses[0].warehouseName as string) || '' : '',
      totalQuantity: warehouses.reduce(
        (sum: number, w: Record<string, unknown>) => sum + ((w.totalQuantity as number) || 0),
        0,
      ),
    };
  }
}

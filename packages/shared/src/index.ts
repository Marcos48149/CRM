export enum TenantPlan {
  STARTER = 'STARTER',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE',
}

export enum TenantStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  CANCELLED = 'CANCELLED',
}

export enum IntegrationType {
  WHATSAPP = 'WHATSAPP',
  INSTAGRAM = 'INSTAGRAM',
  VTEX = 'VTEX',
}

export enum UserRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  VIEWER = 'VIEWER',
}

export interface VtexOrder {
  orderId: string;
  status: string;
  totalValue: number;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
  }>;
  creationDate: string;
  clientProfileData: {
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
  };
}

export interface VtexProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  images: Array<{
    imageUrl: string;
    imageLabel: string;
  }>;
}

export interface VtexInventory {
  skuId: string;
  warehouseName: string;
  totalQuantity: number;
}

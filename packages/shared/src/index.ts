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

// CRM Types
export enum ConversationStatus {
  BOT_ACTIVE = 'bot_active',
  HUMAN_TAKEOVER = 'human_takeover',
  CLOSED = 'closed',
}

export enum BotCategory {
  ORDER_STATUS = 'order-status',
  EXCHANGES = 'exchanges',
  RETURNS = 'returns',
  HOW_TO_BUY = 'how-to-buy',
  WEBSITE_ISSUES = 'website-issues',
  SIZING = 'sizing',
  STOCK = 'stock',
  PAYMENT_HELP = 'payment-help',
  DELIVERY_ESTIMATE = 'delivery-estimate',
  GENERAL = 'general',
}

export enum MessageDirection {
  INBOUND = 'INBOUND',
  OUTBOUND = 'OUTBOUND',
}

export enum MessageRole {
  CUSTOMER = 'customer',
  BOT = 'bot',
  AGENT = 'agent',
}

export enum MessageStatus {
  RECEIVED = 'received',
  SENT = 'sent',
  FAILED = 'failed',
  READ = 'read',
}

export interface CrmContact {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  tags: string[];
  vtexCustomerId: string | null;
  totalOrders: number;
  totalSpent: number;
  lastPurchaseAt: string | null;
  firstSeenAt: string;
  blocked: boolean;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CrmConversation {
  id: string;
  status: ConversationStatus;
  channel: string;
  assignedTo: string | null;
  assignedAt: string | null;
  escalatedAt: string | null;
  escalatedBy: string | null;
  lastActivity: string;
  contactId: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  contact?: CrmContact;
  messages?: CrmMessage[];
}

export interface CrmMessage {
  id: string;
  role: MessageRole;
  content: string;
  messageType: string;
  status: MessageStatus;
  direction: MessageDirection;
  whatsappMsgId: string | null;
  conversationId: string;
  tenantId: string;
  createdAt: string;
}

export interface CrmTag {
  id: string;
  name: string;
  color: string;
  tenantId: string;
  createdAt: string;
}

export interface CrmAgentNote {
  id: string;
  content: string;
  authorId: string;
  conversationId: string;
  tenantId: string;
  createdAt: string;
}

export interface CrmBotConfig {
  id: string;
  category: BotCategory;
  prompt: string;
  keywords: string[];
  enabled: boolean;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

import { Injectable, Logger } from '@nestjs/common';

interface VtexOrder {
  orderId: string;
  status: string;
  totalValue: number;
  creationDate: string;
  clientProfileData?: {
    email: string;
  };
}

interface CrmContact {
  id: string;
  phone: string | null;
  email: string | null;
  totalOrders: number;
  totalSpent: number;
  lastPurchaseAt: Date | null;
}

@Injectable()
export class VtexEnrichmentProcessor {
  private readonly logger = new Logger(VtexEnrichmentProcessor.name);

  async enrichContact(
    contact: CrmContact,
    searchOrdersFn: (query: { email: string }) => Promise<VtexOrder[]>,
    updateContactFn: (id: string, data: Partial<CrmContact>) => Promise<void>,
  ): Promise<void> {
    if (!contact.email) {
      this.logger.warn(`Contact ${contact.id} has no email, skipping VTEX enrichment`);
      return;
    }

    try {
      const orders = await searchOrdersFn({ email: contact.email });

      if (!orders || orders.length === 0) {
        this.logger.log(`No VTEX orders found for contact ${contact.id}`);
        return;
      }

      const totalOrders = orders.length;
      const totalSpent = orders.reduce((sum, o) => sum + o.totalValue, 0);
      const sortedByDate = [...orders].sort(
        (a, b) => new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime(),
      );
      const lastPurchaseAt = new Date(sortedByDate[0].creationDate);

      await updateContactFn(contact.id, {
        totalOrders,
        totalSpent,
        lastPurchaseAt,
      });

      this.logger.log(
        `Enriched contact ${contact.id}: ${totalOrders} orders, $${totalSpent} total`,
      );
    } catch (error) {
      this.logger.error(
        `VTEX enrichment failed for contact ${contact.id}`,
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }
}

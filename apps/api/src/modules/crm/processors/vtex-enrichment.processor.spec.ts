import { Test, TestingModule } from '@nestjs/testing';
import { VtexEnrichmentProcessor } from './vtex-enrichment.processor';

describe('VtexEnrichmentProcessor', () => {
  let processor: VtexEnrichmentProcessor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VtexEnrichmentProcessor],
    }).compile();

    processor = module.get<VtexEnrichmentProcessor>(VtexEnrichmentProcessor);
  });

  describe('enrichContact', () => {
    const baseContact = {
      id: 'contact-1',
      phone: '+5491123456789',
      email: 'john@example.com',
      totalOrders: 0,
      totalSpent: 0,
      lastPurchaseAt: null,
    };

    const mockOrders = [
      {
        orderId: 'order-1',
        status: 'invoiced',
        totalValue: 15000,
        creationDate: '2026-07-01T10:00:00Z',
        clientProfileData: { email: 'john@example.com' },
      },
      {
        orderId: 'order-2',
        status: 'delivered',
        totalValue: 25000,
        creationDate: '2026-06-15T10:00:00Z',
        clientProfileData: { email: 'john@example.com' },
      },
    ];

    it('fetches VTEX orders and updates contact with enrichment data', async () => {
      const searchOrdersFn = jest.fn().mockResolvedValue(mockOrders);
      const updateContactFn = jest.fn().mockResolvedValue(undefined);

      await processor.enrichContact(baseContact, searchOrdersFn, updateContactFn);

      expect(searchOrdersFn).toHaveBeenCalledWith({ email: 'john@example.com' });
      expect(updateContactFn).toHaveBeenCalledWith('contact-1', {
        totalOrders: 2,
        totalSpent: 40000,
        lastPurchaseAt: new Date('2026-07-01T10:00:00Z'),
      });
    });

    it('handles no VTEX orders gracefully', async () => {
      const searchOrdersFn = jest.fn().mockResolvedValue([]);
      const updateContactFn = jest.fn();

      await processor.enrichContact(baseContact, searchOrdersFn, updateContactFn);

      expect(searchOrdersFn).toHaveBeenCalled();
      expect(updateContactFn).not.toHaveBeenCalled();
    });

    it('does not call VTEX if contact has no email', async () => {
      const searchOrdersFn = jest.fn();
      const updateContactFn = jest.fn();

      await processor.enrichContact(
        { ...baseContact, email: null },
        searchOrdersFn,
        updateContactFn,
      );

      expect(searchOrdersFn).not.toHaveBeenCalled();
      expect(updateContactFn).not.toHaveBeenCalled();
    });
  });
});

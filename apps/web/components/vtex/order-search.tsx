'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

interface OrderResult {
  orderId: string;
  status: string;
  totalValue: number;
  items: OrderItem[];
  creationDate: string;
  clientProfileData: {
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
  };
}

const orderStatusLabel: Record<string, string> = {
  'ready-for-handling': 'Listo para manejo',
  'invoiced': 'Facturado',
  'canceled': 'Cancelado',
  'payment-pending': 'Pago pendiente',
  'shipped': 'Enviado',
  'delivered': 'Entregado',
};

export function OrderSearch() {
  const [searchMode, setSearchMode] = useState<'orderId' | 'email'>('orderId');
  const [searchValue, setSearchValue] = useState('');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OrderResult | OrderResult[] | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!searchValue.trim()) return;

    setSearching(true);
    setError(null);
    setResult(null);
    setSearched(false);

    try {
      const { default: api } = await import('@/lib/api');
      const params = searchMode === 'orderId'
        ? { orderId: searchValue.trim() }
        : { email: searchValue.trim() };
      const res = await api.get('/vtex/orders', { params });
      setResult(res.data as OrderResult | OrderResult[]);
      setSearched(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al buscar pedido';
      setError(msg);
      setSearched(true);
    } finally {
      setSearching(false);
    }
  };

  const orders = result
    ? Array.isArray(result)
      ? result
      : [result]
    : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Buscar pedidos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            variant={searchMode === 'orderId' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSearchMode('orderId')}
          >
            Por número de pedido
          </Button>
          <Button
            variant={searchMode === 'email' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSearchMode('email')}
          >
            Por email
          </Button>
        </div>

        <div className="flex gap-2">
          <div className="flex-1 space-y-1">
            <Label htmlFor="vtex-search" className="sr-only">
              {searchMode === 'orderId' ? 'Número de pedido' : 'Email del cliente'}
            </Label>
            <Input
              id="vtex-search"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder={
                searchMode === 'orderId' ? 'Ej: 123456789' : 'Ej: cliente@email.com'
              }
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <Button onClick={handleSearch} disabled={searching}>
            {searching ? 'Buscando...' : 'Buscar'}
          </Button>
        </div>

        {error && (
          <p className="text-sm text-red-500">
            {error}
          </p>
        )}

        {searched && !error && orders.length === 0 && (
          <p className="text-sm text-slate-500">
            No se encontraron pedidos.
          </p>
        )}

        {orders.length > 0 && (
          <div className="space-y-3">
            {orders.map((order) => (
              <div key={order.orderId} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-medium">
                    #{order.orderId}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {orderStatusLabel[order.status] || order.status}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500">
                  {new Date(order.creationDate).toLocaleDateString('es-AR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
                <p className="text-sm text-slate-700">
                  {order.clientProfileData.firstName}{' '}
                  {order.clientProfileData.lastName} —{' '}
                  {order.clientProfileData.email}
                </p>
                <div className="text-xs text-slate-500 space-y-1">
                  {order.items.map((item: OrderItem) => (
                    <div key={item.id} className="flex justify-between">
                      <span>
                        {item.name} x{item.quantity}
                      </span>
                      <span>${(item.price / 100).toLocaleString('es-AR')}</span>
                    </div>
                  ))}
                </div>
                <div className="text-right text-sm font-medium text-slate-900">
                  Total: ${(order.totalValue / 100).toLocaleString('es-AR')}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

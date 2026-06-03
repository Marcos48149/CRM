'use client';

import { useEffect, useState, useCallback } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { VtexConnectionCard } from '@/components/vtex/connection-card';
import { OrderSearch } from '@/components/vtex/order-search';
import { ProductSearch } from '@/components/vtex/product-search';
import { ToolsList } from '@/components/vtex/tools-list';
import api from '@/lib/api';

interface ToolInfo {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  enabled: boolean;
}

export default function VtexPage() {
  const { toast } = useToast();

  const [connected, setConnected] = useState(false);
  const [accountName, setAccountName] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get('/vtex/status');
      setConnected(res.data.connected);
      setAccountName(res.data.accountName);
    } catch {
      toast({
        title: 'Error',
        description: 'No pudimos cargar el estado de VTEX',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleConnect = async (data: {
    accountName: string;
    appKey: string;
    appToken: string;
  }) => {
    await api.post('/vtex/connect', data);
    toast({
      title: 'VTEX conectado',
      description: 'La tienda se conectó correctamente',
    });
    await fetchData();
  };

  const handleDisconnect = async () => {
    toast({
      title: 'VTEX desconectado',
      description: 'La integración se desactivó',
    });
    setConnected(false);
    setAccountName(undefined);
  };

  const tools: ToolInfo[] = [
    {
      id: 'get_order_status',
      name: 'Consultar estado de pedido',
      description:
        'Permite a OpenClaw buscar pedidos por número o email del cliente.',
      endpoint: 'POST /api/v1/vtex/openclaw-tool — tool: get_order',
      enabled: connected,
    },
    {
      id: 'search_products',
      name: 'Buscar productos en catálogo',
      description:
        'Permite a OpenClaw buscar productos por nombre o descripción.',
      endpoint: 'POST /api/v1/vtex/openclaw-tool — tool: search_products',
      enabled: connected,
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-slate-900">VTEX</h1>

      <VtexConnectionCard
        connected={connected}
        accountName={accountName}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
      />

      {connected && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <OrderSearch />
            <ProductSearch />
          </div>

          <ToolsList tools={tools} />
        </>
      )}
    </div>
  );
}

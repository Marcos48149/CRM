'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ConnectionCard } from '@/components/whatsapp/connection-card';
import { WorkflowList } from '@/components/whatsapp/workflow-list';
import { WorkflowForm } from '@/components/whatsapp/workflow-form';
import { MessagesTable } from '@/components/whatsapp/messages-table';
import api from '@/lib/api';

interface Workflow {
  id: string;
  name: string;
  trigger: string;
  active: boolean;
}

interface Message {
  id: string;
  date: string;
  from: string;
  preview: string;
  status: 'respondido' | 'fallback';
}

export default function WhatsAppPage() {
  const { toast } = useToast();

  const [connected, setConnected] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState<string | undefined>();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [workflowFormOpen, setWorkflowFormOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [statusRes, workflowsRes] = await Promise.all([
        api.get('/whatsapp/status'),
        api.get('/workflows'),
      ]);

      const status = statusRes.data as { connected: boolean; phoneNumber?: string };
      setConnected(status.connected);
      setPhoneNumber(status.phoneNumber);

      setWorkflows((workflowsRes.data as { data: Workflow[] }).data);
    } catch {
      toast({
        title: 'Error',
        description: 'No pudimos cargar los datos de WhatsApp',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();

    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleConnect = async (data: {
    phoneNumberId: string;
    accessToken: string;
    webhookSecret: string;
  }) => {
    await api.post('/whatsapp/connect', data);
    toast({ title: 'WhatsApp conectado', description: 'El número se conectó correctamente' });
    await fetchData();
  };

  const handleDisconnect = async () => {
    await api.delete('/whatsapp/disconnect');
    toast({ title: 'WhatsApp desconectado', description: 'La integración se desactivó' });
    await fetchData();
  };

  const handleCreateWorkflow = async (formData: {
    name: string;
    trigger: string;
    keyword: string;
    prompt: string;
  }) => {
    const conditions = formData.keyword
      ? [{ field: 'message.text', operator: 'contains', value: formData.keyword }]
      : [];

    await api.post('/workflows', {
      name: formData.name,
      trigger: formData.trigger,
      conditions,
      actions: [
        { type: 'QUERY_OPENCLAW', prompt: formData.prompt },
        { type: 'SEND_REPLY', channel: 'whatsapp' },
      ],
    });

    toast({ title: 'Workflow creado', description: 'El workflow se activó automáticamente' });
    await fetchData();
  };

  const handleToggleWorkflow = async (workflowId: string) => {
    await api.patch(`/workflows/${workflowId}/toggle`);
    await fetchData();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-slate-900">WhatsApp</h1>

      <ConnectionCard
        connected={connected}
        phoneNumber={phoneNumber}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
      />

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            Workflows de WhatsApp
          </h2>
          <Button onClick={() => setWorkflowFormOpen(true)}>
            Nuevo Workflow
          </Button>
        </div>

        <WorkflowList
          workflows={workflows}
          onToggle={handleToggleWorkflow}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">
          Mensajes recientes
        </h2>
        <MessagesTable messages={messages} />
      </section>

      <WorkflowForm
        open={workflowFormOpen}
        onOpenChange={setWorkflowFormOpen}
        onSave={handleCreateWorkflow}
      />
    </div>
  );
}

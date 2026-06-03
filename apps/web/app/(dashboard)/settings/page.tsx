'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { PlanCard } from '@/components/billing/plan-card';
import { UsageBar } from '@/components/billing/usage-bar';
import api from '@/lib/api';

interface BillingInfo {
  plan: string;
  renewalDate: string | null;
  messagesUsed: number;
  messagesLimit: number;
  usagePercentage: number;
}

export default function SettingsPage() {
  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchBilling();
  }, []);

  async function fetchBilling() {
    setLoading(true);
    try {
      const { data } = await api.get('/billing/current');
      setBilling(data);
    } catch {
      toast({ title: 'Error', description: 'No se pudo cargar la información de facturación', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  async function handleUpgrade(plan: 'PRO' | 'ENTERPRISE') {
    setUpgrading(plan);
    try {
      const { data } = await api.post('/billing/subscribe', { plan });
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch {
      toast({ title: 'Error', description: 'No se pudo generar la suscripción. Intentalo de nuevo.', variant: 'destructive' });
    } finally {
      setUpgrading(null);
    }
  }

  const planNames: Record<string, string> = {
    STARTER: 'Starter',
    PRO: 'PRO',
    ENTERPRISE: 'Enterprise',
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Configuración</h1>
        <p className="text-slate-500 mt-2">Administrá tu cuenta, plan y preferencias.</p>
      </div>

      <Tabs defaultValue="billing">
        <TabsList>
          <TabsTrigger value="billing">Plan y Facturación</TabsTrigger>
          <TabsTrigger value="account">Cuenta</TabsTrigger>
        </TabsList>

        <TabsContent value="billing" className="space-y-8 mt-6">
          {loading ? (
            <Card>
              <CardHeader><CardTitle>Plan actual</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </CardContent>
            </Card>
          ) : billing ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    Plan actual
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
                      {planNames[billing.plan] || billing.plan}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <UsageBar
                    used={billing.messagesUsed}
                    limit={billing.messagesLimit}
                    percentage={billing.usagePercentage}
                  />
                  {billing.renewalDate && (
                    <p className="text-sm text-slate-500">
                      Próxima renovación: {new Date(billing.renewalDate).toLocaleDateString('es-AR')}
                    </p>
                  )}
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <PlanCard
                  name="Starter"
                  price="Gratis"
                  description="Para empezar"
                  messagesLimit="500 mensajes/mes"
                  workflowsLimit="3 workflows activos"
                  integrations={['WhatsApp']}
                  isCurrent={billing.plan === 'STARTER'}
                />
                <PlanCard
                  name="PRO"
                  price="$15.000 ARS"
                  description="Para negocios en crecimiento"
                  messagesLimit="5.000 mensajes/mes"
                  workflowsLimit="20 workflows activos"
                  integrations={['WhatsApp', 'Instagram', 'VTEX']}
                  isCurrent={billing.plan === 'PRO'}
                  onUpgrade={() => handleUpgrade('PRO')}
                  loading={upgrading === 'PRO'}
                />
                <PlanCard
                  name="Enterprise"
                  price="$45.000 ARS"
                  description="Para grandes volúmenes"
                  messagesLimit="Mensajes ilimitados"
                  workflowsLimit="Workflows ilimitados"
                  integrations={['WhatsApp', 'Instagram', 'VTEX']}
                  isCurrent={billing.plan === 'ENTERPRISE'}
                  onUpgrade={() => handleUpgrade('ENTERPRISE')}
                  loading={upgrading === 'ENTERPRISE'}
                />
              </div>
            </>
          ) : (
            <p className="text-slate-500">No se pudo cargar la información.</p>
          )}
        </TabsContent>

        <TabsContent value="account" className="mt-6">
          <Card>
            <CardHeader><CardTitle>Cuenta</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">La configuración de cuenta estará disponible próximamente.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { StatsCard } from '@/components/dashboard/stats-card';
import { ContainerStatusBadge } from '@/components/dashboard/container-status';
import { QuickActions } from '@/components/dashboard/quick-actions';
import api from '@/lib/api';

const ALL_INTEGRATIONS = ['WHATSAPP', 'INSTAGRAM', 'VTEX'];

interface Stats {
  totalMessages: number;
  activeWorkflows: number;
  integrations: string[];
  containerStatus: 'running' | 'stopped' | 'not_found';
}

export default function OverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  async function fetchStats() {
    setLoading(true);
    setError(false);
    try {
      const res = await api.get<Stats>('/tenants/me/stats');
      setStats(res.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-5 w-72" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-slate-900">Overview</h1>
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <p className="text-slate-500">No pudimos cargar los datos</p>
          <Button variant="outline" onClick={fetchStats}>
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  const missingIntegrations = ALL_INTEGRATIONS.filter(
    (i) => !stats.integrations.includes(i),
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Overview</h1>

      <ContainerStatusBadge status={stats.containerStatus} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard
          title="Mensajes este mes"
          value={stats.totalMessages}
        />
        <StatsCard
          title="Workflows activos"
          value={stats.activeWorkflows}
        />
        <StatsCard
          title="Integraciones conectadas"
          value={stats.integrations.length}
          description={`${stats.integrations.length} de ${ALL_INTEGRATIONS.length}`}
        />
      </div>

      {missingIntegrations.length > 0 && (
        <QuickActions missingIntegrations={missingIntegrations} />
      )}
    </div>
  );
}

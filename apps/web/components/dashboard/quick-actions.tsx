'use client';

import { Button } from '@/components/ui/button';
import { MessageSquare, Workflow, BarChart3 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface QuickActionsProps {
  missingIntegrations: string[];
}

export function QuickActions({ missingIntegrations }: QuickActionsProps) {
  const router = useRouter();

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
        Acciones rápidas
      </h2>
      <div className="flex flex-wrap gap-3">
        {missingIntegrations.includes('WHATSAPP') && (
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => router.push('/whatsapp')}
          >
            <MessageSquare className="h-4 w-4" />
            Conectar WhatsApp
          </Button>
        )}
        {missingIntegrations.includes('INSTAGRAM') && (
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => router.push('/instagram')}
          >
            <MessageSquare className="h-4 w-4" />
            Conectar Instagram
          </Button>
        )}
        {missingIntegrations.includes('VTEX') && (
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => router.push('/vtex')}
          >
            <MessageSquare className="h-4 w-4" />
            Conectar VTEX
          </Button>
        )}
        <Button
          variant="outline"
          className="flex items-center gap-2"
          onClick={() => router.push('/whatsapp')}
        >
          <Workflow className="h-4 w-4" />
          Crear workflow
        </Button>
        <Button
          variant="outline"
          className="flex items-center gap-2"
          onClick={() => router.push('/metrics')}
        >
          <BarChart3 className="h-4 w-4" />
          Ver métricas
        </Button>
      </div>
    </div>
  );
}

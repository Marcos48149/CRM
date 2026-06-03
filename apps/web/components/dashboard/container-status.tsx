import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

type ContainerStatus = 'running' | 'stopped' | 'not_found';

interface ContainerStatusProps {
  status: ContainerStatus;
}

const statusConfig: Record<ContainerStatus, { label: string; dotClass: string }> = {
  running: {
    label: 'Activo',
    dotClass: 'bg-green-500',
  },
  stopped: {
    label: 'Detenido',
    dotClass: 'bg-slate-400',
  },
  not_found: {
    label: 'Sin instancia',
    dotClass: 'bg-red-500',
  },
};

export function ContainerStatusBadge({ status }: ContainerStatusProps) {
  const config = statusConfig[status];

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-slate-700">Estado del contenedor</span>
      <Badge
        variant="outline"
        className="flex items-center gap-2 py-1"
      >
        <span className={cn('h-2 w-2 rounded-full', config.dotClass)} />
        {config.label}
      </Badge>
    </div>
  );
}

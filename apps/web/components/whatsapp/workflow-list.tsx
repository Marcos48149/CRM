'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface WorkflowItem {
  id: string;
  name: string;
  trigger: string;
  active: boolean;
}

interface WorkflowListProps {
  workflows: WorkflowItem[];
  onToggle: (id: string) => Promise<void>;
}

export function WorkflowList({ workflows, onToggle }: WorkflowListProps) {
  if (workflows.length === 0) {
    return (
      <p className="text-sm text-slate-400 py-4 text-center">
        No tenés workflows creados. Creá uno nuevo para empezar.
      </p>
    );
  }

  const triggerLabel = (trigger: string) => {
    switch (trigger) {
      case 'WHATSAPP_MESSAGE':
        return 'Cualquier mensaje';
      default:
        return trigger;
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>Trigger</TableHead>
          <TableHead>Estado</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {workflows.map((wf) => (
          <TableRow key={wf.id}>
            <TableCell className="font-medium">{wf.name}</TableCell>
            <TableCell>
              <Badge variant="outline">{triggerLabel(wf.trigger)}</Badge>
            </TableCell>
            <TableCell>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={wf.active}
                  onChange={() => onToggle(wf.id)}
                  className="sr-only"
                />
                <div
                  className={`h-5 w-9 rounded-full transition-colors ${
                    wf.active ? 'bg-blue-600' : 'bg-slate-300'
                  } relative`}
                >
                  <div
                    className={`h-4 w-4 rounded-full bg-white absolute top-0.5 transition-transform ${
                      wf.active ? 'translate-x-[18px]' : 'translate-x-0.5'
                    }`}
                  />
                </div>
                <span className="text-xs text-slate-500">
                  {wf.active ? 'Activo' : 'Inactivo'}
                </span>
              </label>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ToolInfo {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  enabled: boolean;
}

interface ToolsListProps {
  tools: ToolInfo[];
}

export function ToolsList({ tools }: ToolsListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Herramientas de OpenClaw</CardTitle>
        <p className="text-sm text-slate-500 mt-1">
          Estas herramientas están disponibles para que el agente OpenClaw
          consulte tu tienda VTEX automáticamente.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {tools.map((tool) => (
            <div
              key={tool.id}
              className="flex items-start justify-between border rounded-lg p-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-900">
                    {tool.name}
                  </span>
                  <Badge
                    variant="outline"
                    className={
                      tool.enabled
                        ? 'text-green-600 border-green-300'
                        : 'text-slate-400 border-slate-200'
                    }
                  >
                    {tool.enabled ? 'Habilitada' : 'Deshabilitada'}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500">{tool.description}</p>
                <code className="text-xs text-slate-400 bg-slate-100 px-1 py-0.5 rounded">
                  {tool.endpoint}
                </code>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

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

interface MessageItem {
  id: string;
  date: string;
  from: string;
  preview: string;
  status: 'respondido' | 'fallback';
}

interface MessagesTableProps {
  messages: MessageItem[];
}

function maskPhone(phone: string): string {
  if (phone.length <= 6) return phone;
  const visible = phone.slice(0, 3);
  const hidden = phone.slice(3, -3).replace(/\d/g, '*');
  const end = phone.slice(-3);
  return `${visible}${hidden}${end}`;
}

export function MessagesTable({ messages }: MessagesTableProps) {
  if (messages.length === 0) {
    return (
      <p className="text-sm text-slate-400 py-4 text-center">
        No hay mensajes todavía. Los mensajes aparecerán aquí cuando los clientes te escriban.
      </p>
    );
  }

  const statusBadge = (status: MessageItem['status']) => {
    switch (status) {
      case 'respondido':
        return <Badge variant="outline" className="text-green-600 border-green-300">Respondido</Badge>;
      case 'fallback':
        return <Badge variant="outline" className="text-amber-600 border-amber-300">Fallback</Badge>;
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Fecha</TableHead>
          <TableHead>Remitente</TableHead>
          <TableHead>Mensaje</TableHead>
          <TableHead>Estado</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {messages.map((msg) => (
          <TableRow key={msg.id}>
            <TableCell className="text-sm text-slate-500">{msg.date}</TableCell>
            <TableCell className="text-sm font-mono">{maskPhone(msg.from)}</TableCell>
            <TableCell className="text-sm text-slate-700 truncate max-w-[200px]">
              {msg.preview}
            </TableCell>
            <TableCell>{statusBadge(msg.status)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

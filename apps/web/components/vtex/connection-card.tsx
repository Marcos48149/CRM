'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface ConnectionCardProps {
  connected: boolean;
  accountName?: string;
  onConnect: (data: { accountName: string; appKey: string; appToken: string }) => Promise<void>;
  onDisconnect: () => Promise<void>;
}

export function VtexConnectionCard({
  connected,
  accountName,
  onConnect,
  onDisconnect,
}: ConnectionCardProps) {
  const [accName, setAccName] = useState('');
  const [appKey, setAppKey] = useState('');
  const [appToken, setAppToken] = useState('');
  const [connecting, setConnecting] = useState(false);

  if (connected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
            VTEX conectado
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm">
              {accountName}
            </Badge>
          </div>
          <Button variant="destructive" onClick={onDisconnect}>
            Desconectar
          </Button>
        </CardContent>
      </Card>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setConnecting(true);
    try {
      await onConnect({ accountName: accName, appKey, appToken });
    } finally {
      setConnecting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conectar VTEX</CardTitle>
        <CardDescription>
          Ingresá las credenciales de tu tienda VTEX para habilitar las consultas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vtex-account-name">Account Name</Label>
            <Input
              id="vtex-account-name"
              value={accName}
              onChange={(e) => setAccName(e.target.value)}
              placeholder="minitienda"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vtex-app-key">App Key</Label>
            <Input
              id="vtex-app-key"
              type="password"
              value={appKey}
              onChange={(e) => setAppKey(e.target.value)}
              placeholder="vtexappkey-..."
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vtex-app-token">App Token</Label>
            <Input
              id="vtex-app-token"
              type="password"
              value={appToken}
              onChange={(e) => setAppToken(e.target.value)}
              placeholder="Token de acceso"
              required
            />
          </div>
          <Button type="submit" disabled={connecting} className="w-full">
            {connecting ? 'Conectando...' : 'Conectar VTEX'}
          </Button>
          <p className="text-xs text-slate-400 text-center">
            <a
              href="https://developers.vtex.com/docs/guides/authentication"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              ¿Cómo obtener estas credenciales?
            </a>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

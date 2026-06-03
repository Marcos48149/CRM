'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface ConnectionCardProps {
  connected: boolean;
  phoneNumber?: string;
  loading?: boolean;
  onConnect: (data: { phoneNumberId: string; accessToken: string; webhookSecret: string }) => Promise<void>;
  onDisconnect: () => Promise<void>;
}

export function ConnectionCard({
  connected,
  phoneNumber,
  loading,
  onConnect,
  onDisconnect,
}: ConnectionCardProps) {
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [connecting, setConnecting] = useState(false);

  if (connected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
            WhatsApp conectado
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm">
              {phoneNumber}
            </Badge>
          </div>
          <Button
            variant="destructive"
            onClick={onDisconnect}
            disabled={loading}
          >
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
      await onConnect({ phoneNumberId, accessToken, webhookSecret });
    } finally {
      setConnecting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conectar WhatsApp</CardTitle>
        <CardDescription>
          Ingresá las credenciales de Meta Cloud API para conectar tu número de WhatsApp.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phoneNumberId">Phone Number ID</Label>
            <Input
              id="phoneNumberId"
              value={phoneNumberId}
              onChange={(e) => setPhoneNumberId(e.target.value)}
              placeholder="Ej: 123456789012345"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="accessToken">Access Token (Meta API)</Label>
            <Input
              id="accessToken"
              type="password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="EAAT..."
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="webhookSecret">Webhook Secret</Label>
            <Input
              id="webhookSecret"
              type="password"
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              placeholder="webhook_verify_token"
              required
            />
          </div>
          <Button type="submit" disabled={connecting} className="w-full">
            {connecting ? 'Conectando...' : 'Conectar WhatsApp'}
          </Button>
          <p className="text-xs text-slate-400 text-center">
            <a
              href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started"
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

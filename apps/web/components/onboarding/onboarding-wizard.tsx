'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';

interface OnboardingWizardProps {
  open: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

const STEPS = [
  { number: 1, title: 'Bienvenido' },
  { number: 2, title: 'Conectar WhatsApp' },
  { number: 3, title: 'Crear workflow' },
  { number: 4, title: '¡Listo!' },
];

export function OnboardingWizard({ open, onComplete, onSkip }: OnboardingWizardProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  async function saveStep(newStep: number) {
    setLoading(true);
    try {
      await api.patch('/tenants/me/onboarding', { step: newStep });
      if (newStep >= 4) {
        onComplete();
      } else {
        setStep(newStep);
      }
    } catch {
      toast({ title: 'Error', description: 'No se pudo guardar el progreso', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  function handleNext() {
    saveStep(step + 1);
  }

  function handleSkip() {
    saveStep(4).then(onComplete).catch(onSkip);
  }

  function handleGoToWhatsApp() {
    router.push('/whatsapp');
  }

  function handleGoToWorkflows() {
    router.push('/whatsapp');
  }

  return (
    <Dialog open={open} onOpenChange={(open) => { if (!open && step > 1) handleSkip(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {step === 1 && '¡Bienvenido a AutoClaw!'}
            {step === 2 && 'Conectá tu WhatsApp'}
            {step === 3 && 'Creá tu primer workflow'}
            {step === 4 && 'Todo listo'}
          </DialogTitle>
          <DialogDescription>
            {step === 1 && 'En pocos pasos vamos a configurar tu asistente automático.'}
            {step === 2 && 'Vinculá tu número de WhatsApp Business para empezar a recibir mensajes.'}
            {step === 3 && 'Definí cómo responde tu asistente cuando llega un mensaje.'}
            {step === 4 && 'Ya podés usar AutoClaw para atender a tus clientes automáticamente.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center gap-2 my-4">
          {STEPS.map((s) => (
            <div key={s.number} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                  s.number < step
                    ? 'bg-green-500 text-white'
                    : s.number === step
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-200 text-slate-500'
                }`}
              >
                {s.number < step ? '✓' : s.number}
              </div>
              <span className={`text-sm ${s.number === step ? 'font-medium text-slate-900' : 'text-slate-400'}`}>
                {s.title}
              </span>
              {s.number < 4 && <div className="h-px w-6 bg-slate-300" />}
            </div>
          ))}
        </div>

        <div className="py-4 space-y-4">
          {step === 1 && (
            <div className="text-sm text-slate-600 space-y-2">
              <p>AutoClaw te permite automatizar las respuestas de tus canales de atención al cliente usando inteligencia artificial.</p>
              <p>En los siguientes pasos vamos a:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Conectar tu WhatsApp Business</li>
                <li>Crear un workflow de respuesta automática</li>
                <li>¡Empezar a atender clientes!</li>
              </ul>
            </div>
          )}

          {step === 2 && (
            <div className="text-sm text-slate-600 space-y-3">
              <p>Para conectar WhatsApp necesitás:</p>
              <ol className="list-decimal list-inside space-y-2">
                <li>Una cuenta de <a href="https://business.facebook.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Meta Business</a></li>
                <li>Un número de WhatsApp Business configurado</li>
                <li>El <strong>Phone Number ID</strong>, <strong>Access Token</strong> y <strong>Webhook Secret</strong></li>
              </ol>
              <div className="flex gap-3 pt-2">
                <Button onClick={handleGoToWhatsApp} disabled={loading}>
                  Ir a conectar WhatsApp
                </Button>
                <Button variant="outline" onClick={handleNext} disabled={loading}>
                  Ya lo conecté
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="text-sm text-slate-600 space-y-3">
              <p>Un workflow define cómo responde tu asistente a los mensajes.</p>
              <p>Por ejemplo, podés crear un workflow que:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Detecte mensajes que contengan &quot;pedido&quot;</li>
                <li>Consulte el estado del pedido en VTEX</li>
                <li>Responda automáticamente al cliente</li>
              </ul>
              <div className="flex gap-3 pt-2">
                <Button onClick={handleGoToWorkflows} disabled={loading}>
                  Ir a crear workflow
                </Button>
                <Button variant="outline" onClick={handleNext} disabled={loading}>
                  Ya lo creé
                </Button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="text-sm text-slate-600 space-y-2 text-center">
              <p className="text-lg font-medium text-slate-900">¡Estás listo para empezar!</p>
              <p>Ya podés recibir mensajes de tus clientes y responder automáticamente.</p>
              <p>Si necesitás ayuda, revisá la documentación o contactanos.</p>
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between">
          {step === 1 && (
            <div className="flex w-full justify-between">
              <Button variant="ghost" onClick={handleSkip}>
                Saltar onboarding
              </Button>
              <Button onClick={handleNext} disabled={loading}>
                {loading ? 'Guardando...' : 'Comenzar'}
              </Button>
            </div>
          )}
          {step === 4 && (
            <Button className="w-full" onClick={onComplete} disabled={loading}>
              {loading ? 'Finalizando...' : 'Ir al dashboard'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

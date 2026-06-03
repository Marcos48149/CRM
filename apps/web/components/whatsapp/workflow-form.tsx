'use client';

import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface WorkflowFormData {
  name: string;
  trigger: string;
  keyword: string;
  prompt: string;
}

interface WorkflowFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: WorkflowFormData) => Promise<void>;
}

export function WorkflowForm({ open, onOpenChange, onSave }: WorkflowFormProps) {
  const [name, setName] = useState('');
  const [triggerType, setTriggerType] = useState('any');
  const [keyword, setKeyword] = useState('');
  const [prompt, setPrompt] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'El nombre es requerido';
    }
    if (triggerType === 'keyword' && !keyword.trim()) {
      newErrors.keyword = 'La palabra clave es requerida';
    }
    if (!prompt.trim()) {
      newErrors.prompt = 'El prompt es requerido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        trigger: triggerType === 'any' ? 'WHATSAPP_MESSAGE' : 'WHATSAPP_MESSAGE',
        keyword: keyword.trim(),
        prompt: prompt.trim(),
      });
      setName('');
      setTriggerType('any');
      setKeyword('');
      setPrompt('');
      setErrors({});
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Nuevo Workflow</SheetTitle>
          <SheetDescription>
            Configurá la automatización para los mensajes de WhatsApp.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-6">
          <div className="space-y-2">
            <Label htmlFor="wf-name">Nombre del workflow</Label>
            <Input
              id="wf-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Responder pedidos"
            />
            {errors.name && (
              <p className="text-xs text-red-500">{errors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="wf-trigger">¿Cuándo se activa?</Label>
            <Select value={triggerType} onValueChange={setTriggerType}>
              <SelectTrigger id="wf-trigger">
                <SelectValue placeholder="Seleccioná un trigger" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Cualquier mensaje</SelectItem>
                <SelectItem value="keyword">Mensaje contiene palabra clave</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {triggerType === 'keyword' && (
            <div className="space-y-2">
              <Label htmlFor="wf-keyword">Palabra clave</Label>
              <Input
                id="wf-keyword"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Ej: pedido, reclamo, horario"
              />
              {errors.keyword && (
                <p className="text-xs text-red-500">{errors.keyword}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="wf-prompt">Prompt para OpenClaw</Label>
            <textarea
              id="wf-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ej: Respondé amablemente al cliente y ayudalo con su consulta sobre el pedido."
              className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            {errors.prompt && (
              <p className="text-xs text-red-500">{errors.prompt}</p>
            )}
          </div>
        </div>

        <SheetFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar workflow'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

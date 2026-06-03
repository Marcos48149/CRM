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

interface NewPostFormData {
  imageUrl: string;
  caption: string;
  scheduledAt?: string;
  publishNow: boolean;
}

interface NewPostFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: NewPostFormData) => Promise<void>;
}

export function NewPostForm({ open, onOpenChange, onSave }: NewPostFormProps) {
  const [imageUrl, setImageUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [previewError, setPreviewError] = useState(false);

  const validate = (publishNow: boolean): boolean => {
    const newErrors: Record<string, string> = {};

    if (!imageUrl.trim()) {
      newErrors.imageUrl = 'La URL de la imagen es requerida';
    } else if (!imageUrl.startsWith('https://')) {
      newErrors.imageUrl = 'La URL debe ser HTTPS';
    }

    if (!caption.trim()) {
      newErrors.caption = 'El caption es requerido';
    } else if (caption.length > 2200) {
      newErrors.caption = 'El caption no puede superar 2200 caracteres';
    }

    if (!publishNow && scheduledAt) {
      const scheduledDate = new Date(scheduledAt);
      if (scheduledDate <= new Date()) {
        newErrors.scheduledAt = 'No se puede programar para el pasado';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (publishNow: boolean) => {
    if (!validate(publishNow)) return;

    setSaving(true);
    try {
      await onSave({
        imageUrl: imageUrl.trim(),
        caption: caption.trim(),
        scheduledAt: publishNow ? undefined : scheduledAt || undefined,
        publishNow,
      });
      setImageUrl('');
      setCaption('');
      setScheduledAt('');
      setErrors({});
      setPreviewError(false);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const captionCount = caption.length;
  const captionLimit = 2200;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Nuevo post</SheetTitle>
          <SheetDescription>
            Creá una publicación para Instagram.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-6">
          <div className="space-y-2">
            <Label htmlFor="ig-image-url">URL de la imagen</Label>
            <Input
              id="ig-image-url"
              value={imageUrl}
              onChange={(e) => {
                setImageUrl(e.target.value);
                setPreviewError(false);
              }}
              placeholder="https://ejemplo.com/imagen.jpg"
            />
            {errors.imageUrl && (
              <p className="text-xs text-red-500">{errors.imageUrl}</p>
            )}
            {imageUrl && imageUrl.startsWith('https://') && (
              <div className="mt-2 w-full aspect-square max-h-32 rounded-md overflow-hidden bg-slate-100">
                {previewError ? (
                  <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                    No se pudo cargar la imagen
                  </div>
                ) : (
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={() => setPreviewError(true)}
                  />
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="ig-caption">Caption</Label>
            <textarea
              id="ig-caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Escribí el texto de la publicación..."
              className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              maxLength={captionLimit}
            />
            <div className="flex justify-between">
              {errors.caption && (
                <p className="text-xs text-red-500">{errors.caption}</p>
              )}
              <p
                className={`text-xs ml-auto ${
                  captionCount > captionLimit * 0.9
                    ? 'text-amber-500'
                    : 'text-slate-400'
                }`}
              >
                {captionCount}/{captionLimit}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ig-schedule">Programar para (opcional)</Label>
            <Input
              id="ig-schedule"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
            {errors.scheduledAt && (
              <p className="text-xs text-red-500">{errors.scheduledAt}</p>
            )}
          </div>
        </div>

        <SheetFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleSave(false)}
            disabled={saving}
          >
            {saving ? 'Programando...' : 'Programar'}
          </Button>
          <Button
            onClick={() => handleSave(true)}
            disabled={saving}
          >
            {saving ? 'Publicando...' : 'Publicar ahora'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

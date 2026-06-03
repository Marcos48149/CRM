'use client';

import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface PostItem {
  id: string;
  imageUrl: string;
  caption: string;
  status: 'published' | 'scheduled' | 'failed';
  scheduledAt?: string;
  createdAt: string;
}

interface PostCardProps {
  post: PostItem;
  onCancel?: (id: string) => void;
}

const statusLabel: Record<PostItem['status'], string> = {
  published: 'Publicado',
  scheduled: 'Programado',
  failed: 'Fallido',
};

const statusClass: Record<PostItem['status'], string> = {
  published: 'text-green-600 border-green-300',
  scheduled: 'text-blue-600 border-blue-300',
  failed: 'text-red-600 border-red-300',
};

export function PostCard({ post, onCancel }: PostCardProps) {
  return (
    <Card className="overflow-hidden">
      <div className="aspect-square bg-slate-100 flex items-center justify-center overflow-hidden">
        {post.imageUrl ? (
          <img
            src={post.imageUrl}
            alt={post.caption}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '';
              (e.target as HTMLImageElement).classList.add('hidden');
              const parent = (e.target as HTMLImageElement).parentElement;
              if (parent) {
                parent.innerHTML = '<span class="text-slate-400 text-sm">Sin imagen</span>';
              }
            }}
          />
        ) : (
          <span className="text-slate-400 text-sm">Sin imagen</span>
        )}
      </div>
      <CardContent className="p-3">
        <p className="text-sm text-slate-700 line-clamp-2 mb-2">
          {post.caption || 'Sin caption'}
        </p>
        <div className="flex items-center justify-between">
          <Badge
            variant="outline"
            className={`text-xs ${statusClass[post.status]}`}
          >
            {statusLabel[post.status]}
          </Badge>
          {post.scheduledAt && (
            <span className="text-xs text-slate-400">
              {new Date(post.scheduledAt).toLocaleDateString('es-AR', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          )}
        </div>
      </CardContent>
      {post.status === 'scheduled' && onCancel && (
        <CardFooter className="p-3 pt-0">
          <Button
            variant="ghost"
            size="sm"
            className="text-red-500 hover:text-red-700 w-full flex items-center gap-1"
            onClick={() => onCancel(post.id)}
          >
            <X className="h-3 w-3" />
            Cancelar
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

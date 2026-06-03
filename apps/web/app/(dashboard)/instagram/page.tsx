'use client';

import { useEffect, useState, useCallback } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ContentCalendar } from '@/components/instagram/content-calendar';
import { PostCard } from '@/components/instagram/post-card';
import { NewPostForm } from '@/components/instagram/new-post-form';
import api from '@/lib/api';

interface PostItem {
  id: string;
  imageUrl: string;
  caption: string;
  status: 'published' | 'scheduled' | 'failed';
  scheduledAt?: string;
  createdAt: string;
}

export default function InstagramPage() {
  const { toast } = useToast();

  const [connected, setConnected] = useState(false);
  const [accountName, setAccountName] = useState<string | undefined>();
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPostOpen, setNewPostOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('calendar');

  // Connection form
  const [accessToken, setAccessToken] = useState('');
  const [igAccountId, setIgAccountId] = useState('');
  const [connecting, setConnecting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [statusRes, postsRes] = await Promise.all([
        api.get('/instagram/status'),
        api.get('/instagram/posts'),
      ]);

      setConnected(statusRes.data.connected);
      setAccountName(statusRes.data.accountName);

      setPosts((postsRes.data as { data: PostItem[] }).data);
    } catch {
      toast({
        title: 'Error',
        description: 'No pudimos cargar los datos de Instagram',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleConnect = async () => {
    if (!accessToken.trim() || !igAccountId.trim()) {
      toast({
        title: 'Campos requeridos',
        description: 'Completá todos los campos para conectar',
        variant: 'destructive',
      });
      return;
    }

    setConnecting(true);
    try {
      await api.post('/instagram/connect', {
        accessToken: accessToken.trim(),
        instagramAccountId: igAccountId.trim(),
      });
      toast({
        title: 'Instagram conectado',
        description: 'La cuenta se conectó correctamente',
      });
      setAccessToken('');
      setIgAccountId('');
      await fetchData();
    } catch {
      toast({
        title: 'Error de conexión',
        description: 'Verificá las credenciales e intentá de nuevo',
        variant: 'destructive',
      });
    } finally {
      setConnecting(false);
    }
  };

  const handleCreatePost = async (data: {
    imageUrl: string;
    caption: string;
    scheduledAt?: string;
    publishNow: boolean;
  }) => {
    const body: Record<string, string> = {
      imageUrl: data.imageUrl,
      caption: data.caption,
    };
    if (data.scheduledAt) {
      body.scheduledAt = data.scheduledAt;
    }

    await api.post('/instagram/posts', body);

    toast({
      title: data.publishNow ? 'Post publicado' : 'Post programado',
      description: data.publishNow
        ? 'La publicación se realizó correctamente'
        : `Se programó para ${new Date(data.scheduledAt!).toLocaleString('es-AR')}`,
    });

    await fetchData();
  };

  const handleCancelPost = async (postId: string) => {
    try {
      await api.delete(`/instagram/posts/${postId}`);
      toast({
        title: 'Post cancelado',
        description: 'La publicación programada fue cancelada',
      });
      await fetchData();
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo cancelar el post',
        variant: 'destructive',
      });
    }
  };

  const handleDayClick = (date: string) => {
    setActiveTab('scheduled');
  };

  const filteredPosts = (status: PostItem['status'] | 'all'): PostItem[] => {
    if (status === 'all') return posts;
    return posts.filter((p) => p.status === status);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Instagram</h1>
        {connected && (
          <Button onClick={() => setNewPostOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Nuevo Post
          </Button>
        )}
      </div>

      {!connected ? (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Conectar Instagram
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Conectá tu cuenta de Instagram Business para gestionar
                publicaciones y automatizar respuestas.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ig-access-token">Access Token (Meta API)</Label>
              <Input
                id="ig-access-token"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="EAAT..."
                type="password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ig-account-id">Instagram Account ID</Label>
              <Input
                id="ig-account-id"
                value={igAccountId}
                onChange={(e) => setIgAccountId(e.target.value)}
                placeholder="178414..."
              />
            </div>

            <div className="text-xs text-slate-500">
              <a
                href="https://developers.facebook.com/docs/instagram-basic-display-api/getting-started"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                ¿Cómo obtener estas credenciales?
              </a>
            </div>

            <Button onClick={handleConnect} disabled={connecting}>
              {connecting ? 'Conectando...' : 'Conectar Instagram'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge
                  variant="outline"
                  className="text-green-600 border-green-300"
                >
                  Conectado
                </Badge>
                {accountName && (
                  <span className="text-sm text-slate-600">
                    {accountName}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="calendar">Calendario</TabsTrigger>
              <TabsTrigger value="published">Publicados</TabsTrigger>
              <TabsTrigger value="scheduled">
                Programados
                {filteredPosts('scheduled').length > 0 && (
                  <span className="ml-1.5 text-xs bg-blue-100 text-blue-700 rounded-full px-1.5 py-0.5">
                    {filteredPosts('scheduled').length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="failed">
                Fallidos
                {filteredPosts('failed').length > 0 && (
                  <span className="ml-1.5 text-xs bg-red-100 text-red-700 rounded-full px-1.5 py-0.5">
                    {filteredPosts('failed').length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="calendar" className="mt-4">
              <ContentCalendar
                posts={posts}
                onDayClick={handleDayClick}
              />
            </TabsContent>

            <TabsContent value="published" className="mt-4">
              {filteredPosts('published').length === 0 ? (
                <p className="text-sm text-slate-500">
                  No hay publicaciones todavía.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredPosts('published').map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="scheduled" className="mt-4">
              {filteredPosts('scheduled').length === 0 ? (
                <p className="text-sm text-slate-500">
                  No hay publicaciones programadas.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredPosts('scheduled').map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      onCancel={handleCancelPost}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="failed" className="mt-4">
              {filteredPosts('failed').length === 0 ? (
                <p className="text-sm text-slate-500">
                  No hay publicaciones fallidas.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredPosts('failed').map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          <NewPostForm
            open={newPostOpen}
            onOpenChange={setNewPostOpen}
            onSave={handleCreatePost}
          />
        </>
      )}
    </div>
  );
}

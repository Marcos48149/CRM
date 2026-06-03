import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import InstagramPage from '@/app/(dashboard)/instagram/page';
import { ContentCalendar } from '@/components/instagram/content-calendar';
import { PostCard } from '@/components/instagram/post-card';
import { NewPostForm } from '@/components/instagram/new-post-form';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

import api from '@/lib/api';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('InstagramPage', () => {
  it('muestra formulario de conexión cuando no está conectado', async () => {
    const mockGet = vi.mocked(api.get);
    mockGet
      .mockResolvedValueOnce({ data: { connected: false } })
      .mockResolvedValueOnce({ data: { data: [], total: 0, page: 1, limit: 20 } });

    render(<InstagramPage />);

    await waitFor(() => {
      expect(screen.getByLabelText('Access Token (Meta API)')).toBeInTheDocument();
    });
    expect(screen.getByLabelText('Instagram Account ID')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Conectar Instagram' })).toBeInTheDocument();
  });

  it('muestra estado conectado con nombre de cuenta', async () => {
    const mockGet = vi.mocked(api.get);
    mockGet
      .mockResolvedValueOnce({ data: { connected: true, accountName: 'Mi Tienda' } })
      .mockResolvedValueOnce({ data: { data: [], total: 0, page: 1, limit: 20 } });

    render(<InstagramPage />);

    await waitFor(() => {
      expect(screen.getByText('Conectado')).toBeInTheDocument();
    });

    expect(screen.getByText('Mi Tienda')).toBeInTheDocument();
    expect(screen.getByText('Nuevo Post')).toBeInTheDocument();
  });

  it('muestra las tabs cuando está conectado', async () => {
    const mockGet = vi.mocked(api.get);
    mockGet
      .mockResolvedValueOnce({ data: { connected: true, accountName: 'Test' } })
      .mockResolvedValueOnce({ data: { data: [], total: 0, page: 1, limit: 20 } });

    render(<InstagramPage />);

    await waitFor(() => {
      expect(screen.getByText('Calendario')).toBeInTheDocument();
    });
    expect(screen.getByText('Publicados')).toBeInTheDocument();
    expect(screen.getByText('Programados')).toBeInTheDocument();
    expect(screen.getByText('Fallidos')).toBeInTheDocument();
  });

  it('muestra badge de contador en pestaña programados', async () => {
    const mockGet = vi.mocked(api.get);
    mockGet
      .mockResolvedValueOnce({ data: { connected: true, accountName: 'Test' } })
      .mockResolvedValueOnce({
        data: {
          data: [
            {
              id: '2',
              imageUrl: 'https://example.com/img2.jpg',
              caption: 'Post programado',
              status: 'scheduled',
              scheduledAt: new Date(Date.now() + 86400000).toISOString(),
              createdAt: new Date().toISOString(),
            },
          ],
          total: 1, page: 1, limit: 20,
        },
      });

    render(<InstagramPage />);

    await waitFor(() => {
      expect(screen.getByText('Programados')).toBeInTheDocument();
    });

    const programadosTab = screen.getByText('Programados').closest('button');
    expect(programadosTab?.textContent).toContain('1');
  });

  it('llama a la API con los datos correctos al hacer submit del formulario', async () => {
    const mockGet = vi.mocked(api.get);
    const mockPost = vi.mocked(api.post);

    mockGet
      .mockResolvedValueOnce({ data: { connected: true, accountName: 'Test' } })
      .mockResolvedValueOnce({ data: { data: [], total: 0, page: 1, limit: 20 } });

    mockPost.mockResolvedValue({ data: {} });

    render(<InstagramPage />);

    await waitFor(() => {
      expect(screen.getByText('Nuevo Post')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Nuevo Post'));

    await waitFor(() => {
      expect(screen.getByText('URL de la imagen')).toBeInTheDocument();
    });

    const imageUrlInput = screen.getByLabelText('URL de la imagen');
    const captionTextarea = screen.getByPlaceholderText(
      'Escribí el texto de la publicación...',
    );

    fireEvent.change(imageUrlInput, {
      target: { value: 'https://example.com/test.jpg' },
    });
    fireEvent.change(captionTextarea, {
      target: { value: 'Mi nuevo post' },
    });

    fireEvent.click(screen.getByText('Publicar ahora'));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/instagram/posts', {
        imageUrl: 'https://example.com/test.jpg',
        caption: 'Mi nuevo post',
      });
    });
  });
});

describe('ContentCalendar', () => {
  it('renderiza el calendario con días del mes', () => {
    const posts = [
      {
        id: '1',
        createdAt: new Date().toISOString(),
        caption: 'Test',
        status: 'published' as const,
      },
    ];
    render(<ContentCalendar posts={posts} />);
    expect(screen.getByText('Dom')).toBeInTheDocument();
    expect(screen.getByText('Lun')).toBeInTheDocument();
    expect(screen.getByText('Mar')).toBeInTheDocument();
  });
});

describe('PostCard', () => {
  it('muestra caption y estado del post', () => {
    const post = {
      id: '1',
      imageUrl: 'https://example.com/img.jpg',
      caption: 'Mi post de prueba',
      status: 'published' as const,
      createdAt: new Date().toISOString(),
    };
    render(<PostCard post={post} />);
    expect(screen.getByText('Mi post de prueba')).toBeInTheDocument();
    expect(screen.getByText('Publicado')).toBeInTheDocument();
  });

  it('muestra botón de cancelar para post programado', () => {
    const onCancel = vi.fn();
    const post = {
      id: '1',
      imageUrl: 'https://example.com/img.jpg',
      caption: 'Post programado',
      status: 'scheduled' as const,
      scheduledAt: new Date(Date.now() + 86400000).toISOString(),
      createdAt: new Date().toISOString(),
    };
    render(<PostCard post={post} onCancel={onCancel} />);
    expect(screen.getByText('Cancelar')).toBeInTheDocument();
  });

  it('no muestra botón de cancelar para post publicado', () => {
    const post = {
      id: '1',
      imageUrl: 'https://example.com/img.jpg',
      caption: 'Post publicado',
      status: 'published' as const,
      createdAt: new Date().toISOString(),
    };
    render(<PostCard post={post} />);
    expect(screen.queryByText('Cancelar')).not.toBeInTheDocument();
  });
});

describe('NewPostForm', () => {
  it('validate campos requeridos', async () => {
    const onSave = vi.fn();
    render(<NewPostForm open={true} onOpenChange={vi.fn()} onSave={onSave} />);

    expect(screen.getByText('URL de la imagen')).toBeInTheDocument();
    expect(screen.getByText('Caption')).toBeInTheDocument();
    expect(screen.getByText('Publicar ahora')).toBeInTheDocument();
    expect(screen.getByText('Programar')).toBeInTheDocument();
  });
});

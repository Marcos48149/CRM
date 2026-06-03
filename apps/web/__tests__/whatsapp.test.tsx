import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import WhatsAppPage from '@/app/(dashboard)/whatsapp/page';

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
    patch: vi.fn(),
  },
}));

import api from '@/lib/api';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('WhatsAppPage', () => {
  it('muestra formulario de conexión cuando no está conectado', async () => {
    const mockGet = vi.mocked(api.get);
    mockGet
      .mockResolvedValueOnce({ data: { connected: false } })
      .mockResolvedValueOnce({ data: { data: [], total: 0, page: 1, limit: 20 } });

    render(<WhatsAppPage />);

    await waitFor(() => {
      expect(screen.getByLabelText('Phone Number ID')).toBeInTheDocument();
    });
    expect(screen.getByLabelText('Access Token (Meta API)')).toBeInTheDocument();
    expect(screen.getByLabelText('Webhook Secret')).toBeInTheDocument();
  });

  it('muestra estado conectado con número cuando sí lo está', async () => {
    const mockGet = vi.mocked(api.get);
    mockGet
      .mockResolvedValueOnce({ data: { connected: true, phoneNumber: '+541112345678' } })
      .mockResolvedValueOnce({ data: { data: [], total: 0, page: 1, limit: 20 } });

    render(<WhatsAppPage />);

    await waitFor(() => {
      expect(screen.getByText('WhatsApp conectado')).toBeInTheDocument();
    });

    expect(screen.getByText('+541112345678')).toBeInTheDocument();
    expect(screen.getByText('Desconectar')).toBeInTheDocument();
  });

  it('el formulario de workflow valida campos requeridos', async () => {
    const mockGet = vi.mocked(api.get);
    mockGet
      .mockResolvedValueOnce({ data: { connected: false } })
      .mockResolvedValueOnce({ data: { data: [], total: 0, page: 1, limit: 20 } });

    render(<WhatsAppPage />);

    await waitFor(() => {
      expect(screen.getByText('Nuevo Workflow')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Nuevo Workflow'));

    await waitFor(() => {
      expect(screen.getByText('Nombre del workflow')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Guardar workflow'));

    await waitFor(() => {
      expect(screen.getByText('El nombre es requerido')).toBeInTheDocument();
      expect(screen.getByText('El prompt es requerido')).toBeInTheDocument();
    });
  });

  it('la tabla de mensajes muestra datos correctamente', async () => {
    const mockGet = vi.mocked(api.get);
    mockGet
      .mockResolvedValueOnce({ data: { connected: false } })
      .mockResolvedValueOnce({ data: { data: [], total: 0, page: 1, limit: 20 } });

    render(<WhatsAppPage />);

    await waitFor(() => {
      expect(screen.getByText('Mensajes recientes')).toBeInTheDocument();
    });

    expect(
      screen.getByText(/No hay mensajes todavía/),
    ).toBeInTheDocument();
  });
});

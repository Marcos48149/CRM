import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import VtexPage from '@/app/(dashboard)/vtex/page';
import { VtexConnectionCard } from '@/components/vtex/connection-card';
import { OrderSearch } from '@/components/vtex/order-search';
import { ProductSearch } from '@/components/vtex/product-search';
import { ToolsList } from '@/components/vtex/tools-list';

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
  },
}));

import api from '@/lib/api';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('VtexPage', () => {
  it('muestra formulario de conexión cuando no está conectado', async () => {
    const mockGet = vi.mocked(api.get);
    mockGet.mockResolvedValueOnce({ data: { connected: false } });

    render(<VtexPage />);

    await waitFor(() => {
      expect(screen.getByLabelText('Account Name')).toBeInTheDocument();
    });
    expect(screen.getByLabelText('App Key')).toBeInTheDocument();
    expect(screen.getByLabelText('App Token')).toBeInTheDocument();
  });

  it('muestra estado conectado con nombre de cuenta', async () => {
    const mockGet = vi.mocked(api.get);
    mockGet.mockResolvedValueOnce({
      data: { connected: true, accountName: 'minitienda' },
    });

    render(<VtexPage />);

    await waitFor(() => {
      expect(screen.getByText('VTEX conectado')).toBeInTheDocument();
    });
    expect(screen.getByText('minitienda')).toBeInTheDocument();
  });

  it('muestra los paneles de consulta cuando está conectado', async () => {
    const mockGet = vi.mocked(api.get);
    mockGet.mockResolvedValueOnce({
      data: { connected: true, accountName: 'minitienda' },
    });

    render(<VtexPage />);

    await waitFor(() => {
      expect(screen.getByText('Buscar pedidos')).toBeInTheDocument();
    });
    expect(screen.getByText('Buscar productos')).toBeInTheDocument();
    expect(screen.getByText('Herramientas de OpenClaw')).toBeInTheDocument();
  });
});

describe('VtexConnectionCard', () => {
  it('muestra formulario de conexión', () => {
    render(
      <VtexConnectionCard
        connected={false}
        onConnect={vi.fn()}
        onDisconnect={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Conectar VTEX' })).toBeInTheDocument();
    expect(screen.getByText('Account Name')).toBeInTheDocument();
    expect(screen.getByText('App Key')).toBeInTheDocument();
    expect(screen.getByText('App Token')).toBeInTheDocument();
  });

  it('muestra estado conectado', () => {
    render(
      <VtexConnectionCard
        connected={true}
        accountName="mitienda"
        onConnect={vi.fn()}
        onDisconnect={vi.fn()}
      />,
    );

    expect(screen.getByText('VTEX conectado')).toBeInTheDocument();
    expect(screen.getByText('mitienda')).toBeInTheDocument();
    expect(screen.getByText('Desconectar')).toBeInTheDocument();
  });
});

describe('OrderSearch', () => {
  it('muestra botones de modo de búsqueda', () => {
    render(<OrderSearch />);

    expect(screen.getByText('Por número de pedido')).toBeInTheDocument();
    expect(screen.getByText('Por email')).toBeInTheDocument();
  });

  it('cambia el placeholder según el modo', () => {
    render(<OrderSearch />);

    const input = screen.getByLabelText('Número de pedido');
    expect(input).toHaveAttribute('placeholder', 'Ej: 123456789');

    fireEvent.click(screen.getByText('Por email'));

    const emailInput = screen.getByLabelText('Email del cliente');
    expect(emailInput).toHaveAttribute('placeholder', 'Ej: cliente@email.com');
  });
});

describe('ProductSearch', () => {
  it('renderiza input de búsqueda', () => {
    render(<ProductSearch />);

    expect(screen.getByPlaceholderText('Ej: zapatilla, remera...')).toBeInTheDocument();
    expect(screen.getByText('Buscar')).toBeInTheDocument();
  });
});

describe('ToolsList', () => {
  it('muestra herramientas de OpenClaw', () => {
    const tools = [
      {
        id: 'get_order_status',
        name: 'Consultar estado de pedido',
        description: 'Busca pedidos por número o email',
        endpoint: 'POST /api/v1/vtex/openclaw-tool',
        enabled: true,
      },
      {
        id: 'search_products',
        name: 'Buscar productos',
        description: 'Busca productos en el catálogo',
        endpoint: 'POST /api/v1/vtex/openclaw-tool',
        enabled: false,
      },
    ];

    render(<ToolsList tools={tools} />);

    expect(screen.getByText('Consultar estado de pedido')).toBeInTheDocument();
    expect(screen.getByText('Buscar productos')).toBeInTheDocument();
    expect(screen.getByText('Habilitada')).toBeInTheDocument();
    expect(screen.getByText('Deshabilitada')).toBeInTheDocument();
  });
});

import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import OverviewPage from '@/app/(dashboard)/overview/page';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

import api from '@/lib/api';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('OverviewPage', () => {
  it('muestra skeleton durante la carga', () => {
    const mockGet = vi.mocked(api.get);
    mockGet.mockImplementationOnce(
      () => new Promise(() => {}),
    );

    const { container } = render(<OverviewPage />);

    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThanOrEqual(1);
  });

  it('muestra las stats correctamente después de cargar', async () => {
    const mockGet = vi.mocked(api.get);
    mockGet.mockResolvedValueOnce({
      data: {
        totalMessages: 150,
        activeWorkflows: 5,
        integrations: ['WHATSAPP', 'VTEX'],
        containerStatus: 'running',
      },
    });

    render(<OverviewPage />);

    await waitFor(() => {
      expect(screen.getByText('150')).toBeInTheDocument();
    });

    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Activo')).toBeInTheDocument();
    expect(screen.getByText('Conectar Instagram')).toBeInTheDocument();
  });

  it('muestra estado de error si la API falla', async () => {
    const mockGet = vi.mocked(api.get);
    mockGet.mockRejectedValueOnce(new Error('Network error'));

    render(<OverviewPage />);

    await waitFor(() => {
      expect(screen.getByText('No pudimos cargar los datos')).toBeInTheDocument();
    });

    expect(screen.getByText('Reintentar')).toBeInTheDocument();
  });
});

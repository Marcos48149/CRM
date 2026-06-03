import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LoginPage from '@/app/(auth)/login/page';

const mockPush = vi.fn();
const mockToast = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@/lib/api', () => ({
  default: {
    post: vi.fn(),
  },
}));

import api from '@/lib/api';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('LoginPage', () => {
  it('renderiza el formulario de login', () => {
    render(<LoginPage />);

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument();
    expect(screen.getByText('¿No tenés cuenta?')).toBeInTheDocument();
    expect(screen.getByText('Registrate')).toBeInTheDocument();
  });

  it('muestra error de validación si el email es inválido', async () => {
    render(<LoginPage />);

    const emailInput = screen.getByLabelText('Email');
    fireEvent.change(emailInput, { target: { value: 'email-invalido' } });

    const form = screen.getByRole('button', { name: 'Iniciar sesión' }).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Email inválido')).toBeInTheDocument();
    });
  });

  it('llama a la API con los datos correctos al hacer submit', async () => {
    const mockPost = vi.mocked(api.post);
    mockPost.mockResolvedValueOnce({
      data: {
        accessToken: 'token-123',
        refreshToken: 'refresh-123',
        user: { id: '1', email: 'test@test.com', role: 'OWNER' },
      },
    });

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'test@test.com' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: 'password123' },
    });

    const form = screen.getByRole('button', { name: 'Iniciar sesión' }).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/auth/login', {
        email: 'test@test.com',
        password: 'password123',
      });
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/overview');
    });
  });

  it('muestra toast de error en credenciales incorrectas', async () => {
    const mockPost = vi.mocked(api.post);
    mockPost.mockRejectedValueOnce({
      response: { status: 401 },
    });

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'test@test.com' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: 'wrong-password' },
    });

    const form = screen.getByRole('button', { name: 'Iniciar sesión' }).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Credenciales incorrectas',
        description: 'Verificá tu email y contraseña',
        variant: 'destructive',
      });
    });
  });
});

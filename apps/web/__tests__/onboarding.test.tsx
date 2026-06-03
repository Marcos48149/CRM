import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/lib/api', () => ({
  default: {
    patch: vi.fn().mockResolvedValue({}),
  },
}));

describe('OnboardingWizard', () => {
  it('muestra el paso de bienvenida al iniciar', () => {
    render(
      <OnboardingWizard open={true} onComplete={vi.fn()} onSkip={vi.fn()} />,
    );

    expect(screen.getByText('¡Bienvenido a AutoClaw!')).toBeInTheDocument();
    expect(screen.getByText('Comenzar')).toBeInTheDocument();
    expect(screen.getByText('Saltar onboarding')).toBeInTheDocument();
  });

  it('no se muestra cuando open es false', () => {
    render(
      <OnboardingWizard open={false} onComplete={vi.fn()} onSkip={vi.fn()} />,
    );

    expect(screen.queryByText('¡Bienvenido a AutoClaw!')).not.toBeInTheDocument();
  });

  it('navega a /whatsapp desde el paso 2', async () => {
    render(
      <OnboardingWizard open={true} onComplete={vi.fn()} onSkip={vi.fn()} />,
    );

    fireEvent.click(screen.getByText('Comenzar'));

    const whatsappButtons = await screen.findAllByText('Ir a conectar WhatsApp');
    fireEvent.click(whatsappButtons[0]);

    expect(mockPush).toHaveBeenCalledWith('/whatsapp');
  });
});

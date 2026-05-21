import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MobileTopHeader } from '@/components/layout/MobileTopHeader';

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: any) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: any) => <button type="button" onClick={onClick}>{children}</button>,
}));

describe('MobileTopHeader', () => {
  it('renderiza saudacao, nome, menu e avatar com inicial', () => {
    render(
      <MobileTopHeader
        greeting="Bom dia"
        userName="Khendry"
        userInitial="K"
        onGoHome={vi.fn()}
        onOpenNavigation={vi.fn()}
        onOpenProfile={vi.fn()}
        onSignOut={vi.fn()}
      />
    );

    expect(screen.getByText('Bom dia')).toBeInTheDocument();
    expect(screen.getAllByText('Khendry').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Abrir menu de navegação' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Abrir menu de perfil' })).toBeInTheDocument();
    expect(screen.getAllByText('K').length).toBeGreaterThan(0);
  });

  it('abre acoes de configuracoes e logout pelo avatar', () => {
    const onOpenProfile = vi.fn();
    const onSignOut = vi.fn();

    render(
      <MobileTopHeader
        greeting="Boa tarde"
        userName="Mendonça"
        userInitial="M"
        onGoHome={vi.fn()}
        onOpenNavigation={vi.fn()}
        onOpenProfile={onOpenProfile}
        onSignOut={onSignOut}
      />
    );

    fireEvent.click(screen.getByText('Configurações'));
    fireEvent.click(screen.getByText('Sair'));

    expect(onOpenProfile).toHaveBeenCalledTimes(1);
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });

  it('aciona a navegacao principal pelo hamburger', () => {
    const onOpenNavigation = vi.fn();

    render(
      <MobileTopHeader
        greeting="Boa noite"
        userName="Usuário"
        userInitial="U"
        onGoHome={vi.fn()}
        onOpenNavigation={onOpenNavigation}
        onOpenProfile={vi.fn()}
        onSignOut={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Abrir menu de navegação' }));
    expect(onOpenNavigation).toHaveBeenCalledTimes(1);
  });
});

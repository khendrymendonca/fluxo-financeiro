import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { ReactNode } from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppBootGate, APP_INTRO_SESSION_KEY } from '@/components/layout/AppBootGate';
import { AppBootScreen } from '@/components/layout/AppBootScreen';
import { GuidedTour } from '@/components/tutorial/GuidedTour';
import { TutorialOfferDialog } from '@/components/tutorial/TutorialOfferDialog';
import { HelpButton } from '@/components/tutorial/HelpButton';
import { TUTORIAL_AUTO_OFFER_DISABLED_KEY, useTutorialState } from '@/hooks/useTutorialState';

const financeStoreMock = vi.hoisted(() => ({
  useFinanceStore: vi.fn(),
}));

const toastMock = vi.hoisted(() => ({
  toast: vi.fn(),
}));

const appRefreshMock = vi.hoisted(() => ({
  refreshAppData: vi.fn(),
}));

vi.mock('@/hooks/useFinanceStore', () => financeStoreMock);
vi.mock('@/hooks/useAppRefresh', () => ({
  useAppRefresh: () => appRefreshMock.refreshAppData,
}));
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => toastMock,
}));

function renderWithQueryClient(children: ReactNode, queryClient = new QueryClient()) {
  return render(
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

function TutorialExperienceHarness({ userId }: { userId?: string }) {
  const [isTutorialOpen, setIsTutorialOpen] = React.useState(false);
  const [isTutorialOfferOpen, setIsTutorialOfferOpen] = React.useState(false);
  const {
    shouldShowInitialOffer,
    dismissTutorialOffer,
    completeTutorial,
    markInitialOfferHandled,
  } = useTutorialState(userId);

  React.useEffect(() => {
    if (!shouldShowInitialOffer) {
      setIsTutorialOfferOpen(false);
      return;
    }

    if (!isTutorialOpen) {
      setIsTutorialOfferOpen(true);
    }
  }, [isTutorialOpen, shouldShowInitialOffer]);

  const openTutorialManually = () => {
    setIsTutorialOfferOpen(false);
    setIsTutorialOpen(true);
  };

  const dismissOfferedTutorial = () => {
    dismissTutorialOffer();
    setIsTutorialOfferOpen(false);
  };

  const startOfferedTutorial = () => {
    markInitialOfferHandled();
    setIsTutorialOfferOpen(false);
    setIsTutorialOpen(true);
  };

  return (
    <>
      <HelpButton onClick={openTutorialManually} />
      <TutorialOfferDialog
        open={isTutorialOfferOpen}
        onStart={startOfferedTutorial}
        onDismiss={dismissOfferedTutorial}
      />
      <GuidedTour
        open={isTutorialOpen}
        onOpenChange={setIsTutorialOpen}
        onFinish={completeTutorial}
      />
    </>
  );
}

describe('Entrada do app, intro e tutorial', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    financeStoreMock.useFinanceStore.mockReturnValue({ loading: false });
    appRefreshMock.refreshAppData.mockResolvedValue(undefined);
  });

  it('renderiza a intro com a nova logo e mensagem de boot', () => {
    render(<AppBootScreen message="Abrindo o Fluxo..." />);

    expect(screen.getByRole('img', { name: 'Fluxo' })).toBeInTheDocument();
    expect(screen.getByText('Abrindo o Fluxo...')).toBeInTheDocument();
  });

  it('mostra intro para usuario nao logado e depois libera o login', async () => {
    renderWithQueryClient(
      <AppBootGate user={null} authLoading={false}>
        <div>Tela de login</div>
      </AppBootGate>
    );

    expect(screen.getByText('Abrindo o Fluxo...')).toBeInTheDocument();
    expect(await screen.findByText('Tela de login')).toBeInTheDocument();
  });

  it('sincroniza dados no boot do usuario logado sem travar o app', async () => {
    renderWithQueryClient(
      <AppBootGate user={{ id: 'user-1' } as any} authLoading={false}>
        <div>Home autenticada</div>
      </AppBootGate>
    );

    expect(screen.getByText('Sincronizando dados financeiros...')).toBeInTheDocument();
    await waitFor(() => expect(appRefreshMock.refreshAppData).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Home autenticada')).toBeInTheDocument();
  });

  it('nao chama refresh financeiro quando nao ha usuario logado', async () => {
    renderWithQueryClient(
      <AppBootGate user={null} authLoading={false}>
        <div>Tela de login</div>
      </AppBootGate>
    );

    expect(await screen.findByText('Tela de login')).toBeInTheDocument();
    expect(appRefreshMock.refreshAppData).not.toHaveBeenCalled();
  });

  it('nao renderiza a home antes da tentativa de refresh inicial', async () => {
    let finishRefresh!: () => void;
    appRefreshMock.refreshAppData.mockReturnValue(new Promise<void>((resolve) => {
      finishRefresh = resolve;
    }));

    renderWithQueryClient(
      <AppBootGate user={{ id: 'user-1' } as any} authLoading={false}>
        <div>Home autenticada</div>
      </AppBootGate>
    );

    expect(screen.getByText('Sincronizando dados financeiros...')).toBeInTheDocument();
    expect(screen.queryByText('Home autenticada')).not.toBeInTheDocument();

    act(() => finishRefresh());

    expect(await screen.findByText('Home autenticada')).toBeInTheDocument();
  });

  it('abre o app com aviso discreto quando o refresh inicial falha', async () => {
    appRefreshMock.refreshAppData.mockRejectedValue(new Error('offline'));

    renderWithQueryClient(
      <AppBootGate user={{ id: 'user-1' } as any} authLoading={false}>
        <div>Home autenticada</div>
      </AppBootGate>
    );

    expect(await screen.findByText('Home autenticada')).toBeInTheDocument();
    expect(toastMock.toast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Nao foi possivel atualizar os dados agora',
      variant: 'destructive',
    }));
  });

  it('nao repete intro quando a sessao do app continua viva', async () => {
    sessionStorage.setItem(APP_INTRO_SESSION_KEY, 'true');

    renderWithQueryClient(
      <AppBootGate user={null} authLoading={false}>
        <div>Login sem intro repetida</div>
      </AppBootGate>
    );

    expect(screen.queryByText('Abrindo o Fluxo...')).not.toBeInTheDocument();
    expect(await screen.findByText('Login sem intro repetida')).toBeInTheDocument();
  });

  it('oferece tutorial no primeiro acesso e permite recusar', () => {
    const onStart = vi.fn();
    const onDismiss = vi.fn();

    render(<TutorialOfferDialog open onStart={onStart} onDismiss={onDismiss} />);

    expect(screen.getByText('Deseja fazer um tour rapido pelo Fluxo?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /agora nao/i }));

    expect(onDismiss).toHaveBeenCalled();
    expect(onStart).not.toHaveBeenCalled();
  });

  it('permite abrir e navegar pelo tutorial manualmente', () => {
    const onOpenChange = vi.fn();

    render(<GuidedTour open onOpenChange={onOpenChange} />);

    expect(screen.getByText('Home e decisao do mes')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /proximo/i }));

    expect(screen.getByText('Gestao de Contas')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /sair/i }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('nao oferece tutorial enquanto nao ha userId carregado', () => {
    const { result } = renderHook(() => useTutorialState(undefined));

    expect(result.current.isLoaded).toBe(false);
    expect(result.current.tutorialStateLoaded).toBe(false);
    expect(result.current.storageKey).toBeNull();
    expect(result.current.shouldShowInitialOffer).toBe(false);
    expect(result.current.shouldOfferTutorial).toBe(false);
  });

  it('respeita dontShowTutorialAgain true como regra soberana', () => {
    localStorage.setItem('fluxo_tutorial_state:user-1', JSON.stringify({ dontShowTutorialAgain: true }));

    const { result, rerender } = renderHook(({ userId }) => useTutorialState(userId), {
      initialProps: { userId: 'user-1' },
    });

    expect(result.current.isLoaded).toBe(true);
    expect(result.current.shouldShowInitialOffer).toBe(false);

    rerender({ userId: 'user-1' });
    expect(result.current.shouldOfferTutorial).toBe(false);
  });

  it('salva dontShowTutorialAgain ao recusar ou concluir tutorial', () => {
    const { result, rerender } = renderHook(({ userId }) => useTutorialState(userId), {
      initialProps: { userId: 'user-1' },
    });

    expect(result.current.isLoaded).toBe(true);
    expect(result.current.shouldShowInitialOffer).toBe(true);

    act(() => {
      result.current.dismissTutorialOffer();
    });
    rerender({ userId: 'user-1' });

    expect(result.current.status).toBe('dismissed');
    expect(result.current.dontShowTutorialAgain).toBe(true);
    expect(result.current.shouldShowInitialOffer).toBe(false);
    expect(localStorage.getItem(TUTORIAL_AUTO_OFFER_DISABLED_KEY)).toBe('true');
    expect(JSON.parse(localStorage.getItem('fluxo_tutorial_state:user-1') || '{}')).toMatchObject({
      dontShowTutorialAgain: true,
      status: 'dismissed',
      dismissedAt: expect.any(String),
      updatedAt: expect.any(String),
    });

    act(() => {
      result.current.resetTutorial();
      result.current.completeTutorial();
    });
    rerender({ userId: 'user-1' });

    expect(result.current.status).toBe('completed');
    expect(localStorage.getItem(TUTORIAL_AUTO_OFFER_DISABLED_KEY)).toBe('true');
    expect(JSON.parse(localStorage.getItem('fluxo_tutorial_state:user-1') || '{}')).toMatchObject({
      dontShowTutorialAgain: true,
      tutorialCompleted: true,
      completedAt: expect.any(String),
      updatedAt: expect.any(String),
    });
  });

  it('clicar no botao real Agora nao persiste e impede nova oferta no reload', async () => {
    const firstRender = render(<TutorialExperienceHarness userId="user-real" />);

    expect(await screen.findByText('Deseja fazer um tour rapido pelo Fluxo?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /agora nao|agora não/i }));

    expect(localStorage.getItem(TUTORIAL_AUTO_OFFER_DISABLED_KEY)).toBe('true');
    const storedAfterClick = JSON.parse(localStorage.getItem('fluxo_tutorial_state:user-real') || '{}');
    expect(storedAfterClick).toMatchObject({
      dontShowTutorialAgain: true,
      status: 'dismissed',
      dismissedAt: expect.any(String),
      updatedAt: expect.any(String),
    });

    await waitFor(() => {
      expect(screen.queryByText('Deseja fazer um tour rapido pelo Fluxo?')).not.toBeInTheDocument();
    });

    firstRender.unmount();
    localStorage.removeItem('fluxo_tutorial_state:user-real');
    render(<TutorialExperienceHarness userId="user-real" />);

    expect(screen.queryByText('Deseja fazer um tour rapido pelo Fluxo?')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /como utilizar o fluxo/i }));
    expect(await screen.findByText('Home e decisao do mes')).toBeInTheDocument();
  });

  it('flag global bloqueia a oferta automatica mesmo sem estado por usuario', async () => {
    localStorage.setItem(TUTORIAL_AUTO_OFFER_DISABLED_KEY, 'true');

    render(<TutorialExperienceHarness userId="user-global" />);

    await waitFor(() => {
      expect(screen.queryByText('Deseja fazer um tour rapido pelo Fluxo?')).not.toBeInTheDocument();
    });
    expect(localStorage.getItem('fluxo_tutorial_state:user-global')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /como utilizar o fluxo/i }));
    expect(await screen.findByText('Home e decisao do mes')).toBeInTheDocument();
  });

  it('fechar a oferta pelo X tambem grava a flag global', async () => {
    const onDismiss = vi.fn();

    render(<TutorialOfferDialog open onStart={vi.fn()} onDismiss={onDismiss} />);

    expect(await screen.findByText('Deseja fazer um tour rapido pelo Fluxo?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /close/i }));

    expect(localStorage.getItem(TUTORIAL_AUTO_OFFER_DISABLED_KEY)).toBe('true');
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('concluir o tutorial tambem grava a flag global e o botao manual continua funcionando', async () => {
    render(<TutorialExperienceHarness userId="user-finish" />);

    fireEvent.click(await screen.findByRole('button', { name: /agora nao|agora nÃ£o/i }));
    localStorage.removeItem(TUTORIAL_AUTO_OFFER_DISABLED_KEY);

    fireEvent.click(screen.getByRole('button', { name: /como utilizar o fluxo/i }));

    while (screen.queryByRole('button', { name: /proximo/i })) {
      fireEvent.click(screen.getByRole('button', { name: /proximo/i }));
    }

    fireEvent.click(screen.getByRole('button', { name: /concluir/i }));

    expect(localStorage.getItem(TUTORIAL_AUTO_OFFER_DISABLED_KEY)).toBe('true');
    expect(JSON.parse(localStorage.getItem('fluxo_tutorial_state:user-finish') || '{}')).toMatchObject({
      dontShowTutorialAgain: true,
      tutorialCompleted: true,
      status: 'completed',
    });

    fireEvent.click(screen.getByRole('button', { name: /como utilizar o fluxo/i }));
    expect(await screen.findByText('Home e decisao do mes')).toBeInTheDocument();
  });

  it('mantem a decisao ao passar por undefined -> userId -> reload -> undefined -> userId', async () => {
    const firstRender = render(<TutorialExperienceHarness userId={undefined} />);

    expect(screen.queryByText('Deseja fazer um tour rapido pelo Fluxo?')).not.toBeInTheDocument();

    firstRender.rerender(<TutorialExperienceHarness userId="auth-user-1" />);

    expect(await screen.findByText('Deseja fazer um tour rapido pelo Fluxo?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /agora nao|agora não/i }));

    expect(localStorage.getItem(TUTORIAL_AUTO_OFFER_DISABLED_KEY)).toBe('true');
    expect(JSON.parse(localStorage.getItem('fluxo_tutorial_state:auth-user-1') || '{}')).toMatchObject({
      dontShowTutorialAgain: true,
      status: 'dismissed',
    });

    firstRender.unmount();

    const secondRender = render(<TutorialExperienceHarness userId={undefined} />);
    expect(screen.queryByText('Deseja fazer um tour rapido pelo Fluxo?')).not.toBeInTheDocument();

    secondRender.rerender(<TutorialExperienceHarness userId="auth-user-1" />);

    await waitFor(() => {
      expect(screen.queryByText('Deseja fazer um tour rapido pelo Fluxo?')).not.toBeInTheDocument();
    });
  });

  it('migra tutorialCompleted antigo para dontShowTutorialAgain e nao usa chave undefined', async () => {
    localStorage.setItem('fluxo_tutorial_state:user-2', JSON.stringify({ tutorialCompleted: true }));
    const { result, rerender } = renderHook(({ userId }) => useTutorialState(userId), {
      initialProps: { userId: undefined as string | undefined },
    });

    expect(result.current.isLoaded).toBe(false);
    expect(result.current.storageKey).toBeNull();
    expect(result.current.shouldShowInitialOffer).toBe(false);

    act(() => {
      result.current.dismissTutorialOffer();
    });

    expect(localStorage.getItem('fluxo_tutorial_state:undefined')).toBeNull();
    expect(localStorage.getItem('fluxo_tutorial_state:null')).toBeNull();
    expect(localStorage.getItem('fluxo_tutorial_state:anonymous')).toBeNull();
    expect(localStorage.getItem('fluxo_tutorial_state:guest')).toBeNull();

    rerender({ userId: 'user-2' });

    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    expect(result.current.dontShowTutorialAgain).toBe(true);
    expect(result.current.shouldShowInitialOffer).toBe(false);
    expect(JSON.parse(localStorage.getItem('fluxo_tutorial_state:user-2') || '{}')).toMatchObject({
      dontShowTutorialAgain: true,
      updatedAt: expect.any(String),
    });
  });

  it('migra autoOfferHandled e status antigos para dontShowTutorialAgain', async () => {
    localStorage.setItem('fluxo_tutorial_state:user-auto', JSON.stringify({ autoOfferHandled: true }));
    localStorage.setItem('fluxo_tutorial_state:user-status', JSON.stringify({ status: 'dismissed' }));

    const auto = renderHook(({ userId }) => useTutorialState(userId), {
      initialProps: { userId: 'user-auto' },
    });
    const status = renderHook(({ userId }) => useTutorialState(userId), {
      initialProps: { userId: 'user-status' },
    });

    await waitFor(() => expect(auto.result.current.isLoaded).toBe(true));
    await waitFor(() => expect(status.result.current.isLoaded).toBe(true));

    expect(auto.result.current.shouldShowInitialOffer).toBe(false);
    expect(status.result.current.shouldShowInitialOffer).toBe(false);
    expect(JSON.parse(localStorage.getItem('fluxo_tutorial_state:user-auto') || '{}')).toMatchObject({
      dontShowTutorialAgain: true,
    });
    expect(JSON.parse(localStorage.getItem('fluxo_tutorial_state:user-status') || '{}')).toMatchObject({
      dontShowTutorialAgain: true,
    });
  });

  it('usa o mesmo dismiss ao clicar Agora nao ou fechar a oferta', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/components/tutorial/TutorialOfferDialog.tsx'), 'utf8');

    expect(source).toContain("disableTutorialAutoOffer('initial offer dismissed')");
    expect(source).toContain('if (!nextOpen) handleDismiss();');
    expect(source).toContain('onClick={handleDismiss}');
  });

  it('mantem update PWA automatico restrito ao boot e botao manual como fallback', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/components/layout/UpdatePrompt.tsx'), 'utf8');

    expect(source).toContain('APP_BOOT_PHASE_STORAGE_KEY');
    expect(source).toContain('updateServiceWorker(true)');
    expect(source).toContain('setIsVisible(true)');
  });

  it('conecta o botao de ajuda ao shell desktop e mobile', () => {
    const indexSource = readFileSync(resolve(process.cwd(), 'src/pages/Index.tsx'), 'utf8');
    const navSource = readFileSync(resolve(process.cwd(), 'src/components/layout/NavigationRail.tsx'), 'utf8');

    expect(indexSource).toContain('TutorialOfferDialog');
    expect(indexSource).toContain('GuidedTour');
    expect(indexSource).toContain('HelpButton onClick={openTutorialManually}');
    expect(indexSource).toContain('setIsTutorialOpen(true)');
    expect(indexSource).toContain('shouldShowInitialOffer');
    expect(indexSource).toContain('completeTutorial');
    expect(navSource).toContain('onOpenHelp');
  });

  it('mantem apenas um ponto de abertura automatica do tutorial e ele depende de shouldShowInitialOffer', () => {
    const indexSource = readFileSync(resolve(process.cwd(), 'src/pages/Index.tsx'), 'utf8');
    const allSource = readFileSync(resolve(process.cwd(), 'src/pages/Index.tsx'), 'utf8') +
      readFileSync(resolve(process.cwd(), 'src/components/tutorial/GuidedTour.tsx'), 'utf8') +
      readFileSync(resolve(process.cwd(), 'src/components/tutorial/TutorialOfferDialog.tsx'), 'utf8');

    expect(indexSource).toContain('if (!shouldShowInitialOffer)');
    expect(indexSource).toContain('if (!isInitialTutorialBlocked)');
    expect((indexSource.match(/setIsTutorialOfferOpen\(true\)/g) || []).length).toBe(1);
    expect(allSource).toContain('disableTutorialAutoOffer');
    expect(allSource).not.toContain('fluxo_tutorial_state:undefined');
    expect(allSource).not.toContain('fluxo_tutorial_state:anonymous');
  });

  it('usa a mesma funcao de refresh no boot e no botao Atualizar', () => {
    const indexSource = readFileSync(resolve(process.cwd(), 'src/pages/Index.tsx'), 'utf8');
    const bootSource = readFileSync(resolve(process.cwd(), 'src/components/layout/AppBootGate.tsx'), 'utf8');

    expect(indexSource).toContain('const refreshAppData = useAppRefresh();');
    expect(indexSource).toContain('await refreshAppData();');
    expect(indexSource).toContain('onRefreshData={handleRefreshData}');
    expect(bootSource).toContain('const refreshAppData = useAppRefresh();');
    expect(bootSource).toContain('refreshAppData().then');
  });
});

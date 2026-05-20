import { act, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppBootGate, APP_INTRO_SESSION_KEY } from '@/components/layout/AppBootGate';
import { AppBootScreen } from '@/components/layout/AppBootScreen';

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

describe('Entrada do app e intro', () => {
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

  it('mantem update PWA automatico restrito ao boot e botao manual como fallback', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/components/layout/UpdatePrompt.tsx'), 'utf8');

    expect(source).toContain('APP_BOOT_PHASE_STORAGE_KEY');
    expect(source).toContain('updateServiceWorker(true)');
    expect(source).toContain('setIsVisible(true)');
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

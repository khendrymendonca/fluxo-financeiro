import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '@/App';
import { NavigationRail } from '@/components/layout/NavigationRail';
import { FEATURES } from '@/config/features';
import ProjectionPage from '@/pages/ProjectionPage';

const featureFlagsMock = vi.hoisted(() => ({
  useFeatureFlag: vi.fn(),
  useIsSuperAdmin: vi.fn(() => false),
  useGlobalFlag: vi.fn(() => false),
}));

const authMock = vi.hoisted(() => ({
  useAuth: vi.fn(),
}));

const financeStoreMock = vi.hoisted(() => ({
  useFinanceStore: vi.fn(),
}));

const debtProjectionMock = vi.hoisted(() => ({
  useDebtProjection: vi.fn(),
  calcularProjecaoDivida: vi.fn(),
  calcularImpactoCorte: vi.fn(),
}));

vi.mock('@/hooks/useFeatureFlags', () => featureFlagsMock);
vi.mock('@/contexts/AuthContext', () => ({
  AuthProvider: ({ children }: any) => <>{children}</>,
  useAuth: authMock.useAuth,
}));
vi.mock('@/hooks/useFinanceStore', () => ({
  FinanceProvider: ({ children }: any) => <>{children}</>,
  useFinanceStore: financeStoreMock.useFinanceStore,
}));
vi.mock('@/hooks/useDebtProjection', () => debtProjectionMock);
vi.mock('@/hooks/useTheme', () => ({
  ThemeProvider: ({ children }: any) => <>{children}</>,
  useTheme: () => ({ theme: 'light', setTheme: vi.fn(), cycleTheme: vi.fn() }),
}));
vi.mock('@/hooks/useThemeColor', () => ({
  ThemeColorProvider: ({ children }: any) => <>{children}</>,
}));
vi.mock('@/components/layout/UpdatePrompt', () => ({
  UpdatePrompt: () => null,
}));
vi.mock('@/components/ui/toaster', () => ({
  Toaster: () => null,
}));
vi.mock('@/components/ui/sonner', () => ({
  Toaster: () => null,
}));
vi.mock('@/pages/Index', () => ({
  default: () => <div>Index page mock</div>,
}));

const activeDebt = {
  id: 'debt-1',
  userId: 'user-1',
  name: 'Acordo banco',
  totalAmount: 1200,
  remainingAmount: 1000,
  installmentAmount: 200,
  interestRateMonthly: 0.02,
  startDate: '2026-04-01',
  status: 'active' as const,
};

function mockProjectionData() {
  debtProjectionMock.calcularProjecaoDivida.mockReturnValue({
    mesesRestantes: 5,
    dataQuitacao: new Date(2026, 8, 1),
    totalJuros: 50,
    cronograma: [{ mes: 1, saldoDevedor: 800, dataLabel: 'mai/26' }],
  });
  debtProjectionMock.calcularImpactoCorte.mockReturnValue({
    mesesEconomizados: 1,
    jurosEconomizados: 25,
  });
  debtProjectionMock.useDebtProjection.mockReturnValue({
    activeDebts: [activeDebt],
    diagnostico: { sobraReal: 800, indiceComprometimento: 40, status: 'verde' },
    estrategias: {
      bolaDNeve: { ordem: [activeDebt], prazoMeses: 5, totalJuros: 50 },
      avalanche: { ordem: [activeDebt], prazoMeses: 5, totalJuros: 40 },
      recomendacao: 'avalanche',
      motivacao: 'Priorize a maior taxa de juros.',
    },
    despesasFixasRanqueadas: [
      {
        id: 'cut-1',
        description: 'Streaming',
        amount: 80,
        impacto: { mesesEconomizados: 1, jurosEconomizados: 25 },
        impactoFinanceiroTotal: 25,
        isTopImpact: true,
      },
    ],
    acaoImediata: 'Foque em quitar Acordo banco primeiro.',
    totalFixedExpenses: 300,
    totalDebtInstallments: 200,
  });
  financeStoreMock.useFinanceStore.mockReturnValue({
    totalIncome: 3000,
  });
}

describe('Projection access and positioning', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.useAuth.mockReturnValue({ user: { id: 'user-1', user_metadata: {} }, loading: false });
    mockProjectionData();
    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      unobserve() {}
      disconnect() {}
    });
    window.history.pushState({}, '', '/');
  });

  it('usa exclusivamente a feature debt_strategy para a view interna projection (sem fallback)', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/pages/Index.tsx'), 'utf8');
    const debtStrategy = FEATURES.find((feature) => feature.key === 'debt_strategy');

    expect(debtStrategy).toMatchObject({
      key: 'debt_strategy',
      label: 'Estratégia de Dívidas',
      enabledByDefault: false,
    });
    // Verifica que NÃO usa array de fallback
    expect(source).toContain("projection: 'debt_strategy'");
    expect(source).not.toContain("projection: ['debt_strategy', 'reports_dashboard']");
  });

  it('a navegação da Projeção respeita rigorosamente debt_strategy', () => {
    // Mesmo se reports_dashboard estiver ativa, Projeção deve sumir se debt_strategy for inativa
    featureFlagsMock.useFeatureFlag.mockImplementation((key: string) => key === 'reports_dashboard' ? true : false);

    render(<NavigationRail currentView="dashboard" onNavigate={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /planejamento/i }));

    expect(screen.queryByRole('button', { name: /projeção/i })).not.toBeInTheDocument();
    expect(featureFlagsMock.useFeatureFlag).toHaveBeenCalledWith('debt_strategy');
  });

  it('mostra a Projeção na navegação quando debt_strategy está ativa', () => {
    featureFlagsMock.useFeatureFlag.mockImplementation((key: string) => key === 'debt_strategy');

    render(<NavigationRail currentView="dashboard" onNavigate={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /planejamento/i }));

    expect(screen.getByRole('button', { name: /projeção/i })).toBeInTheDocument();
    expect(featureFlagsMock.useFeatureFlag).toHaveBeenCalledWith('debt_strategy');
  });

  it('bloqueia a rota direta /projection quando debt_strategy está inativa', async () => {
    featureFlagsMock.useFeatureFlag.mockReturnValue(false);
    window.history.pushState({}, '', '/projection');

    render(<App />);

    expect(await screen.findByText('Index page mock')).toBeInTheDocument();
    expect(screen.queryByText('Bola de Neve')).not.toBeInTheDocument();
    expect(featureFlagsMock.useFeatureFlag).toHaveBeenCalledWith('debt_strategy');
  });

  it('permite a rota direta /projection quando debt_strategy está ativa', async () => {
    featureFlagsMock.useFeatureFlag.mockImplementation((key: string) => key === 'debt_strategy');
    window.history.pushState({}, '', '/projection');

    render(<App />);

    expect(await screen.findByText('Bola de Neve')).toBeInTheDocument();
    expect(screen.queryByText('Index page mock')).not.toBeInTheDocument();
  });

  it('não renderiza o botão Gerar Plano depois de selecionar cortes simulados', () => {
    featureFlagsMock.useFeatureFlag.mockReturnValue(true);

    render(
      <MemoryRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <ProjectionPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('switch'));

    expect(screen.getByText(/resultado da simulação/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /gerar plano/i })).not.toBeInTheDocument();
  });
});

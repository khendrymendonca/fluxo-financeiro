import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MonthSelector } from '@/components/dashboard/MonthSelector';
import { FEATURES, FORCED_DISABLED_FEATURE_KEYS } from '@/config/features';

const financeStoreMock = vi.hoisted(() => ({
  useFinanceStore: vi.fn(),
}));

vi.mock('@/hooks/useFinanceStore', () => financeStoreMock);

describe('Sprint de acesso, mobile, AMOLED e acento', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    financeStoreMock.useFinanceStore.mockReturnValue({
      viewDate: new Date(2026, 4, 11),
      setViewDate: vi.fn(),
      viewMode: 'month',
      setViewMode: vi.fn(),
      nextMonth: vi.fn(),
      prevMonth: vi.fn(),
      nextDay: vi.fn(),
      prevDay: vi.fn(),
      nextYear: vi.fn(),
      prevYear: vi.fn(),
    });
  });

  it('mantem Projecao, Sonhos & Projetos e Simulador bloqueados por feature flag central', () => {
    expect(FORCED_DISABLED_FEATURE_KEYS).toEqual([
      'debt_strategy',
      'goals_manager',
      'simulator',
    ]);
    expect(FEATURES.find((feature) => feature.key === 'debt_strategy')?.enabledByDefault).toBe(false);
    expect(FEATURES.find((feature) => feature.key === 'goals_manager')?.enabledByDefault).toBe(false);
    expect(FEATURES.find((feature) => feature.key === 'simulator')?.enabledByDefault).toBe(false);
  });

  it('bloqueia as features ocultas antes de super admin, plano ou override', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/hooks/useFeatureFlags.ts'), 'utf8');

    expect(source).toContain('FORCED_DISABLED_FEATURE_KEYS');
    expect(source.indexOf('FORCED_DISABLED_FEATURE_KEYS')).toBeLessThan(source.indexOf('if (isSuperAdmin) return true'));
  });

  it('mantem navegacao e views diretas protegidas pelas feature keys ocultas', () => {
    const navigationRail = readFileSync(resolve(process.cwd(), 'src/components/layout/NavigationRail.tsx'), 'utf8');
    const floatingNav = readFileSync(resolve(process.cwd(), 'src/components/layout/FloatingNavMenu.tsx'), 'utf8');
    const index = readFileSync(resolve(process.cwd(), 'src/pages/Index.tsx'), 'utf8');

    expect(navigationRail).toContain("{ id: 'projection', icon: TrendingUp, label: 'Projeção', featureKey: 'debt_strategy' }");
    expect(navigationRail).toContain("{ id: 'goals', icon: Rocket, label: 'Sonhos & Projetos', featureKey: 'goals_manager' }");
    expect(navigationRail).toContain("{ id: 'simulator', icon: Calculator, label: 'Simulador', featureKey: 'simulator' }");
    expect(floatingNav).toContain("projection:   { icon: TrendingUp,     label: 'Projeção',    featureKey: 'debt_strategy' }");
    expect(floatingNav).toContain("goals:        { icon: Rocket,         label: 'Metas',       featureKey: 'goals_manager' }");
    expect(floatingNav).toContain("simulator:    { icon: Calculator,     label: 'Simulador',   featureKey: 'simulator' }");
    expect(index).toContain("projection: 'debt_strategy'");
    expect(index).toContain("goals: 'goals_manager'");
    expect(index).toContain("simulator: 'simulator'");
    expect(index).toContain("{ id: 'projection', icon: TrendingUp, label: 'Projeção', featureKey: 'debt_strategy' }");
    expect(index).toContain("{ id: 'goals', icon: Rocket, label: 'Sonhos & Projetos', featureKey: 'goals_manager' }");
    expect(index).toContain("{ id: 'simulator', icon: Calculator, label: 'Simulador', featureKey: 'simulator' }");
  });

  it('remove Tudo da UI do seletor de periodo e preserva Mes como opcao padrao', () => {
    render(<MonthSelector />);

    expect(screen.getByRole('button', { name: 'Mês' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tudo' })).not.toBeInTheDocument();
  });

  it('normaliza viewMode legado all para month no seletor de periodo', () => {
    const setViewMode = vi.fn();
    financeStoreMock.useFinanceStore.mockReturnValue({
      viewDate: new Date(2026, 4, 11),
      setViewDate: vi.fn(),
      viewMode: 'all',
      setViewMode,
      nextMonth: vi.fn(),
      prevMonth: vi.fn(),
      nextDay: vi.fn(),
      prevDay: vi.fn(),
      nextYear: vi.fn(),
      prevYear: vi.fn(),
    });

    render(<MonthSelector />);

    expect(setViewMode).toHaveBeenCalledWith('month');
    expect(screen.queryByText(/Visualizando Todo/i)).not.toBeInTheDocument();
  });

  it('condiciona os dois FABs mobile ao estado central de overlay do shell', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/pages/Index.tsx'), 'utf8');

    expect(source).toContain('const isAnyShellOverlayOpen = showTransactionForm || showGoalForm || isDrawerOpen || isTutorialOpen || isTutorialOfferOpen;');
    expect(source).toContain('const shouldShowMobileFabs = isMobile && !isAnyShellOverlayOpen;');
    expect(source).toContain('{shouldShowMobileFabs && (');
    expect(source).toContain("shouldShowMobileFabs && ['dashboard', 'transactions'].includes(currentView)");
  });

  it('aplica AMOLED preto real por tokens compartilhados entre web e mobile', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');
    const themeHook = readFileSync(resolve(process.cwd(), 'src/hooks/useTheme.tsx'), 'utf8');
    const appLayout = readFileSync(resolve(process.cwd(), 'src/components/layout/AppLayout.tsx'), 'utf8');

    expect(css).toContain('.theme-amoled');
    expect(css).toContain('--background: 0 0% 0%');
    expect(css).toContain('--card: 0 0% 3%');
    expect(themeHook).not.toContain("effectiveTheme = 'dark';");
    expect(appLayout).toContain('bg-card border-b border-border');
    expect(appLayout).toContain('bg-background border-b border-border');
  });

  it('usa a cor de destaque do usuario no acento corrigido em vez de ciano hardcoded', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/pages/CardsDashboard.tsx'), 'utf8');

    expect(source).not.toContain('#00d4aa');
    expect(source).not.toContain('#00b894');
    expect(source).not.toContain('#0a0a0f');
    expect(source).toContain('bg-primary hover:bg-primary/90 text-primary-foreground');
    expect(source).toContain('hsl(var(--primary))');
  });
});

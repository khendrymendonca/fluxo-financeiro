import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CostAnalysisPage from '@/pages/CostAnalysisPage';

const financeStoreMock = vi.hoisted(() => ({
  useFinanceStore: vi.fn(),
}));

const themeMock = vi.hoisted(() => ({
  useTheme: vi.fn(() => ({ theme: 'light', setTheme: vi.fn() })),
  useThemeColor: vi.fn(() => ({ accentColor: 'teal', setAccentColor: vi.fn() })),
}));

vi.mock('@/hooks/useFinanceStore', () => financeStoreMock);
vi.mock('@/hooks/useTheme', () => ({ useTheme: themeMock.useTheme }));
vi.mock('@/hooks/useThemeColor', () => ({
  useThemeColor: themeMock.useThemeColor,
  accentColors: [{ id: 'teal', name: 'Verde Água', hsl: '174 86% 32%' }],
}));

describe('CostAnalysisPage - Análise de Custos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      unobserve() {}
      disconnect() {}
    });

    financeStoreMock.useFinanceStore.mockReturnValue({
      viewDate: new Date(2026, 7, 31), // Agosto de 2026
      setViewDate: vi.fn(),
      categories: [
        { id: 'cat-casa', name: 'Casa', type: 'expense', isActive: true },
        { id: 'cat-lazer', name: 'Lazer', type: 'expense', isActive: true },
      ],
      subcategories: [
        { id: 'sub-energia', categoryId: 'cat-casa', name: 'Energia', isActive: true },
        { id: 'sub-filhos', categoryId: 'cat-casa', name: 'Filhos', isActive: true },
      ],
      transactions: [
        // Gasto com Energia (Casa)
        {
          id: 'tx-1',
          date: '2026-08-10',
          amount: 300,
          type: 'expense',
          categoryId: 'cat-casa',
          subcategoryId: 'sub-energia',
          description: 'Conta de Luz',
          isPaid: true,
        },
        // Gasto com Filhos (Casa) no cartão
        {
          id: 'tx-2',
          date: '2026-08-15',
          amount: 200,
          type: 'expense',
          categoryId: 'cat-casa',
          subcategoryId: 'sub-filhos',
          description: 'Material Escolar',
          cardId: 'card-1',
          isPaid: false,
        },
        // Outro gasto em Casa sem subcategoria
        {
          id: 'tx-3',
          date: '2026-08-20',
          amount: 100,
          type: 'expense',
          categoryId: 'cat-casa',
          description: 'Manutenção',
          isPaid: true,
        },
        // Gasto em Lazer
        {
          id: 'tx-4',
          date: '2026-08-22',
          amount: 400,
          type: 'expense',
          categoryId: 'cat-lazer',
          description: 'Restaurante',
          isPaid: true,
        },
      ],
    });
  });

  it('renderiza o título da página Análise de Custos e os seletores', () => {
    render(<CostAnalysisPage />);
    expect(screen.getByText('Análise de Custos')).toBeInTheDocument();
    expect(screen.getByText('Evolução Histórica (12 Meses)')).toBeInTheDocument();
    expect(screen.getByText('Lançamentos do Período')).toBeInTheDocument();
  });

  it('calcula o valor total e lista os lançamentos da categoria Casa quando selecionada', () => {
    render(<CostAnalysisPage />);
    // Total em Casa: 300 + 200 + 100 = 600
    expect(screen.getByText('Conta de Luz')).toBeInTheDocument();
    expect(screen.getByText('Material Escolar')).toBeInTheDocument();
    expect(screen.getByText('Manutenção')).toBeInTheDocument();
    expect(screen.queryByText('Restaurante')).not.toBeInTheDocument();
    expect(screen.getByText('3 lançamentos')).toBeInTheDocument();
  });

  it('exibe o detalhamento por subcategorias quando todas as subcategorias estão selecionadas', () => {
    render(<CostAnalysisPage />);
    expect(screen.getByText('Detalhamento por Subcategorias')).toBeInTheDocument();
    expect(screen.getAllByText('Energia').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Filhos').length).toBeGreaterThanOrEqual(1);
  });

  it('calcula as médias estatísticas a partir do primeiro mês de registro quando o filtro de ano ou período for ativado', () => {
    render(<CostAnalysisPage />);
    // Clica no filtro de Ano
    const yearButton = screen.getByRole('button', { name: 'Ano' });
    fireEvent.click(yearButton);

    // Como as compras da categoria Casa só começaram em Agosto de 2026 nos dados de teste,
    // a contagem de meses desde o 1º gasto deve ser 1 mês (e não 8 ou 12 meses diluindo a média erradamente)
    expect(screen.getByText(/1 mês \(desde o 1º gasto\)/i)).toBeInTheDocument();
  });
});

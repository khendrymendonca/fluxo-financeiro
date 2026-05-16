export interface TutorialStep {
  id: string;
  title: string;
  body: string;
}

export const tutorialSteps: TutorialStep[] = [
  {
    id: 'home',
    title: 'Home e decisao do mes',
    body: 'A Home resume o mes selecionado: contas, compromissos da competencia, saldo decisorio e vencidas reais separadas.',
  },
  {
    id: 'bills',
    title: 'Gestao de Contas',
    body: 'Esta e a tela operacional para pagar contas, baixar pendencias e pagar faturas. Ela mostra o mes selecionado e pendencias anteriores abertas.',
  },
  {
    id: 'cards',
    title: 'Cartoes',
    body: 'Cartoes e demonstrativo: limite, compras, faturas, parcelas e historico. Pagamento de fatura acontece na Gestao de Contas.',
  },
  {
    id: 'transactions',
    title: 'Lancamentos',
    body: 'Lancamentos funciona como extrato. Compra no cartao aparece aqui, mas a despesa efetiva ocorre no pagamento da fatura. Transferencias nao entram como receita ou despesa.',
  },
  {
    id: 'reports',
    title: 'Relatorios',
    body: 'Relatorios mostra a visao projetada por competencia e tambem pode separar o realizado. A ideia e enxergar receitas previstas, despesas previstas e saldo previsto.',
  },
  {
    id: 'budgets',
    title: 'Orcamentos',
    body: 'Orcamentos acompanham limites planejados por categoria. O modulo sera revisado antes de ganhar nova regra financeira.',
  },
  {
    id: 'settings',
    title: 'Configuracoes',
    body: 'Em Ajustes voce gerencia dados da conta, tema, cor de destaque, atalhos mobile e recursos liberados por plano quando aplicavel.',
  },
];

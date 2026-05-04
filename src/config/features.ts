// ============================================================
// FONTE DA VERDADE — Features do Fluxo
// Adicionar novas features AQUI. Nunca no banco.
// ============================================================

export type FeatureType = 'screen' | 'premium';

export interface FeatureDefinition {
  key: string;
  label: string;
  description: string;
  type: FeatureType;
  enabledByDefault: boolean;
}

export const FEATURES: FeatureDefinition[] = [
  // ── Telas ──────────────────────────────────────────────
  {
    key: 'transactions',
    label: 'Lançamentos',
    description: 'Extrato de receitas e despesas',
    type: 'screen',
    enabledByDefault: true,
  },
  {
    key: 'accounts',
    label: 'Gestão de Contas',
    description: 'Contas bancárias e contas fixas',
    type: 'screen',
    enabledByDefault: true,
  },
  {
    key: 'cards_dashboard',
    label: 'Cartões',
    description: 'Dashboard de cartões de crédito',
    type: 'screen',
    enabledByDefault: true,
  },
  {
    key: 'goals_manager',
    label: 'Metas',
    description: 'Objetivos de poupança',
    type: 'screen',
    enabledByDefault: true,
  },
  {
    key: 'debts_manager',
    label: 'Dívidas',
    description: 'Gestão e quitação de dívidas',
    type: 'screen',
    enabledByDefault: true,
  },
  {
    key: 'emergency_fund',
    label: 'Reserva de Emergência',
    description: 'Fundo de emergência',
    type: 'screen',
    enabledByDefault: true,
  },
  {
    key: 'reports_dashboard',
    label: 'Relatórios',
    description: 'Gráficos e relatórios financeiros',
    type: 'screen',
    enabledByDefault: true,
  },
  {
    key: 'simulator',
    label: 'Simulador',
    description: 'Simulador "E Se?"',
    type: 'screen',
    enabledByDefault: true,
  },

  // ── Premium ─────────────────────────────────────────────
  {
    key: 'theme_customization',
    label: 'Personalização de Cores',
    description: 'Seletor de tema e cores do app',
    type: 'premium',
    enabledByDefault: false,
  },

  // ── Plano do Mês ────────────────────────────────────────
  {
    key: 'monthly_plan_core',
    label: 'Plano do Mês — Base',
    description: 'Leitura de status do mês, alertas e compromissos próximos',
    type: 'premium',
    enabledByDefault: true, // disponível no Free
  },
  {
    key: 'decision_engine',
    label: 'Posso Pagar?',
    description: 'Simulador de decisão financeira antes de assumir um gasto',
    type: 'premium',
    enabledByDefault: false, // Pro / Família
  },

  // ── Dívidas ─────────────────────────────────────────────
  {
    key: 'debt_strategy',
    label: 'Estratégia de Dívidas',
    description: 'Priorização e recomendações de pagamento de dívidas no plano do mês',
    type: 'premium',
    enabledByDefault: false, // Pro / Família
  },

  // ── Relatórios e Exportação ──────────────────────────────
  {
    key: 'advanced_reports',
    label: 'Relatórios Avançados',
    description: 'Gráficos detalhados, histórico anual e análise por categoria',
    type: 'premium',
    enabledByDefault: false, // Pro / Família
  },
  {
    key: 'export_data',
    label: 'Exportação de Dados',
    description: 'Exportar transações e relatórios em CSV ou PDF',
    type: 'premium',
    enabledByDefault: false, // Pro / Família
  },

  // ── Limites de uso ───────────────────────────────────────
  {
    key: 'unlimited_accounts',
    label: 'Contas Ilimitadas',
    description: 'Sem limite de contas bancárias cadastradas',
    type: 'premium',
    enabledByDefault: false, // Pro / Família
  },
  {
    key: 'unlimited_cards',
    label: 'Cartões Ilimitados',
    description: 'Sem limite de cartões de crédito cadastrados',
    type: 'premium',
    enabledByDefault: false, // Pro / Família
  },
  {
    key: 'unlimited_debts',
    label: 'Dívidas Ilimitadas',
    description: 'Sem limite de acordos e dívidas cadastrados',
    type: 'premium',
    enabledByDefault: false, // Pro / Família
  },

  // ── Família ──────────────────────────────────────────────
  {
    key: 'family_features',
    label: 'Recursos Familiares',
    description: 'Compartilhamento de dados e visão consolidada familiar',
    type: 'premium',
    enabledByDefault: false, // apenas Família
  },

  // ── Admin ────────────────────────────────────────────────
  {
    key: 'admin_panel',
    label: 'Central de Comando',
    description: 'Acesso ao painel administrativo do Fluxo',
    type: 'premium',
    enabledByDefault: false, // apenas Admin
  },
];

export const FEATURE_KEYS = FEATURES.map((f) => f.key);

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
    enabledByDefault: false, // bloqueado por padrão
  },
];

export const FEATURE_KEYS = FEATURES.map((f) => f.key);

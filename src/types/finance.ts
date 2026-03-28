export type TransactionType = 'income' | 'expense';
export type TransactionStatus = 'punctual' | 'installment' | 'recurring' | 'adjustment';
export type AccountType = 'corrente' | 'poupanca' | 'caixinha' | 'investment' | 'benefit_vr' | 'benefit_va' | 'benefit_flex';
export type BillStatus = 'pending' | 'paid' | 'late' | 'cancelled';
export type CategoryGroupName = 'Essenciais' | 'Estilo de Vida' | 'Metas/Acordos' | 'essencial' | 'lazer' | 'metas';

export interface CategoryGroup {
  id: string;
  name: CategoryGroupName;
  description: string;
}

export interface Category {
  id: string;
  userId: string;
  groupId: string;
  name: string;
  type: TransactionType;
  icon?: string;
  color?: string;
  isActive: boolean;
  targetAmount?: number;
  isFixed?: boolean;
}

export interface Subcategory {
  id: string;
  categoryId: string;
  name: string;
  isActive: boolean;
}

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  transactionType: TransactionStatus;
  categoryId?: string;
  subcategoryId?: string;
  description: string;
  amount: number;
  date: string;
  accountId?: string;
  cardId?: string;
  isPaid: boolean;
  paymentDate?: string;
  installmentGroupId?: string;
  installmentNumber?: number;
  installmentTotal?: number;
  invoiceMonthYear?: string; // formato: YYYY-MM
  isRecurring?: boolean;
  recurrence?: string;
  debtId?: string;
  isInvoicePayment?: boolean;
  // ✅ ADICIONADO: rastreabilidade de origem para bills convertidas
  isVirtual?: boolean;
  isAutomatic?: boolean;
  originalBillId?: string;
  originalId?: string; // ✅ ADICIONADO: para deduplicação de recorrentes
  deleted_at?: string; // ✅ ADICIONADO: Soft Delete
}

export interface Account {
  id: string;
  userId: string;
  name: string;
  bank: string;
  balance: number;
  color: string;
  icon?: string;
  accountType: AccountType;
  hasOverdraft?: boolean;
  overdraftLimit?: number;
  monthlyYieldRate?: number;
}

export interface CreditCard {
  id: string;
  userId: string;
  name: string;
  bank: string;
  limit: number;
  closingDay: number;
  dueDay: number;
  color: string;
  isClosingDateFixed: boolean;
  isActive: boolean;
  history?: InvoiceConfig[];
}

export interface InvoiceConfig {
  dueDay: number;
  closingDay: number;
  effectiveDate: string;
}

export interface Debt {
  id: string;
  userId: string;
  name: string;
  totalAmount: number;
  remainingAmount: number;
  installmentAmount: number;
  interestRateMonthly: number;
  startDate: string;
  endDate?: string;
  dueDay?: number;
  strategyPriority?: number;
  minimumPayment?: number;
  // ✅ ADICIONADO: de qual conta sai o pagamento do acordo
  accountId?: string;
  // ✅ ADICIONADO: controle de renegociação
  status?: 'active' | 'renegotiated' | 'paid';
  totalInstallments?: number;
}

export interface SavingsGoal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  color: string;
  icon?: string;
  // ✅ ADICIONADO: vínculo com conta/caixinha real
  accountId?: string;
}

export interface FinanceState {
  transactions: Transaction[];
  accounts: Account[];
  creditCards: CreditCard[];
  debts: Debt[];
  savingsGoals: SavingsGoal[];
  categories: Category[];
  subcategories: Subcategory[];
  categoryGroups: CategoryGroup[];
  emergencyMonths: number;
}

export type FilterMode = 'day' | 'month' | 'year' | 'all';

/** @deprecated Use categories from database instead */
export const INCOME_CATEGORIES_LEGACY = {
  salary: { label: 'Salário', icon: 'Briefcase' },
  benefits: { label: 'Benefícios', icon: 'Gift' },
  extras: { label: 'Extras', icon: 'Sparkles' },
  investments: { label: 'Investimentos', icon: 'TrendingUp' },
  other: { label: 'Outros', icon: 'MoreHorizontal' },
};

/** @deprecated Use categories from database instead */
export const EXPENSE_CATEGORIES_LEGACY = {
  housing: { label: 'Moradia', icon: 'Home' },
  food: { label: 'Alimentação', icon: 'UtensilsCrossed' },
  transport: { label: 'Transporte', icon: 'Car' },
  health: { label: 'Saúde', icon: 'Heart' },
  education: { label: 'Educação', icon: 'GraduationCap' },
  leisure: { label: 'Lazer', icon: 'PartyPopper' },
  shopping: { label: 'Compras', icon: 'ShoppingBag' },
  bills: { label: 'Contas', icon: 'Receipt' },
  subscriptions: { label: 'Assinaturas', icon: 'Repeat' },
  other: { label: 'Outros', icon: 'MoreHorizontal' },
};



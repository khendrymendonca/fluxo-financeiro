export type TransactionType = 'income' | 'expense';
export type TransactionStatus = 'punctual' | 'installment' | 'recurring' | 'adjustment';
export type AccountType = 'checking' | 'savings' | 'caixinha' | 'investment' | 'benefit_vr' | 'benefit_va' | 'benefit_flex';
export type BillStatus = 'pending' | 'paid' | 'late' | 'cancelled';
export type CategoryGroupName = 'needs' | 'wants' | 'savings';

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
  paymentDate?: string; // data efetiva de pagamento (pode diferir da data de vencimento)
  installmentGroupId?: string;
  installmentNumber?: number;
  installmentTotal?: number;
  invoiceMonthYear?: string; // YYYY-MM
  isRecurring?: boolean;
  recurrence?: string;
  debtId?: string;
  isInvoicePayment?: boolean;
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
  monthlyPayment: number;
  interestRateMonthly: number;
  startDate: string;
  endDate?: string;
  dueDay?: number;
  strategyPriority?: number;
  minimumPayment?: number;
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
}

export interface Bill {
  id: string;
  userId: string;
  name: string;
  categoryId?: string;
  subcategoryId?: string;
  amount: number;
  type: 'payable' | 'receivable';
  accountId?: string;
  dueDate: string;
  paymentDate?: string;
  status: BillStatus;
  isFixed: boolean;
  recurrenceRule?: string;
  startDate?: string;
}

export interface BudgetRule {
  id: string;
  userId: string;
  needsPercent: number;
  wantsPercent: number;
  savingsPercent: number;
}

export interface UserHabit {
  id: string;
  userId: string;
  habitType: string;
  description?: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  isActive: boolean;
}

export interface HabitLog {
  id: string;
  habitId: string;
  loggedDate: string;
  status: 'completed' | 'missed' | 'skipped';
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
  bills: Bill[];
  budgetRule?: BudgetRule;
  habits: UserHabit[];
  habitLogs: HabitLog[];
  emergencyMonths: number;
}

// Keep these for UI mapping until fully migrated to DB-driven categories
export const INCOME_CATEGORIES_LEGACY = {
  salary: { label: 'Salário', icon: 'Briefcase' },
  benefits: { label: 'Benefícios', icon: 'Gift' },
  extras: { label: 'Extras', icon: 'Sparkles' },
  investments: { label: 'Investimentos', icon: 'TrendingUp' },
  other: { label: 'Outros', icon: 'MoreHorizontal' },
};

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

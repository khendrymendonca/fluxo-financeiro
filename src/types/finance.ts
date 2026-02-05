export type TransactionType = 'income' | 'expense';

export type IncomeCategory = 'salary' | 'benefits' | 'extras' | 'investments' | 'other';
export type ExpenseCategory = 
  | 'housing' 
  | 'food' 
  | 'transport' 
  | 'health' 
  | 'education' 
  | 'leisure' 
  | 'shopping' 
  | 'bills' 
  | 'subscriptions'
  | 'other';

export interface Transaction {
  id: string;
  type: TransactionType;
  category: IncomeCategory | ExpenseCategory;
  description: string;
  amount: number;
  date: string;
  accountId?: string;
  cardId?: string;
  isRecurring?: boolean;
}

export interface Account {
  id: string;
  name: string;
  bank: string;
  balance: number;
  color: string;
  icon?: string;
}

export interface CreditCard {
  id: string;
  name: string;
  bank: string;
  limit: number;
  closingDay: number;
  dueDay: number;
  color: string;
}

export interface Debt {
  id: string;
  name: string;
  totalAmount: number;
  remainingAmount: number;
  monthlyPayment: number;
  interestRate: number;
  startDate: string;
  endDate?: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  color: string;
  icon?: string;
}

export interface FinanceState {
  transactions: Transaction[];
  accounts: Account[];
  creditCards: CreditCard[];
  debts: Debt[];
  savingsGoals: SavingsGoal[];
}

export const INCOME_CATEGORIES: Record<IncomeCategory, { label: string; icon: string }> = {
  salary: { label: 'Salário', icon: 'Briefcase' },
  benefits: { label: 'Benefícios', icon: 'Gift' },
  extras: { label: 'Extras', icon: 'Sparkles' },
  investments: { label: 'Investimentos', icon: 'TrendingUp' },
  other: { label: 'Outros', icon: 'MoreHorizontal' },
};

export const EXPENSE_CATEGORIES: Record<ExpenseCategory, { label: string; icon: string }> = {
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

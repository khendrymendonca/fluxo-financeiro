import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, logSafeError } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import { Debt } from '@/types/finance';
import { useAuth } from '@/contexts/AuthContext';
import { addMonths, format } from 'date-fns';
import { parseLocalDate } from '@/utils/dateUtils';
import { Category, CreditCard } from '@/types/finance';
import { calcInvoiceMonthYearForCard } from '@/utils/creditCardUtils';

interface DebtMutationDeps {
  creditCards?: CreditCard[];
  categories?: Category[];
}

interface DebtDbPayload {
  name?: string;
  total_amount?: number;
  remaining_amount?: number;
  installment_amount?: number;
  interest_rate_monthly?: number;
  minimum_payment?: number;
  due_day?: number;
  strategy_priority?: number;
  status?: string;
  total_installments?: number;
  card_id?: string;
  debt_type?: string;
  start_date?: string;
}

interface DebtInstallmentRow {
  id: string;
  description: string | null;
  amount: number | null;
  date: string;
  is_paid: boolean | null;
  payment_date: string | null;
  account_id: string | null;
  card_id: string | null;
  category_id: string | null;
  debt_id: string | null;
  installment_group_id: string | null;
  installment_number: number | null;
  installment_total: number | null;
  deleted_at: string | null;
}

interface SyncDebtInstallmentsReport {
  created: number;
  updated: number;
  preservedPaid: number;
  conflicts: string[];
}

const GRID_AFFECTING_DEBT_FIELDS: (keyof Debt)[] = [
  'name',
  'totalAmount',
  'remainingAmount',
  'installmentAmount',
  'dueDay',
  'startDate',
  'totalInstallments',
  'status',
  'cardId',
  'debtType',
];

function mapDebtRow(row: any, fallback?: Partial<Debt>): Debt {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    totalAmount: Number(row.total_amount) || 0,
    remainingAmount: Number(row.remaining_amount) || 0,
    installmentAmount: Number(row.installment_amount) || 0,
    interestRateMonthly: Number(row.interest_rate_monthly) || 0,
    minimumPayment: row.minimum_payment,
    dueDay: row.due_day,
    strategyPriority: row.strategy_priority,
    status: row.status,
    totalInstallments: row.total_installments,
    cardId: row.card_id,
    debtType: row.debt_type,
    startDate: row.start_date || fallback?.startDate || '',
  };
}

function shouldSyncDebtInstallments(updates: Partial<Debt>) {
  return GRID_AFFECTING_DEBT_FIELDS.some((field) =>
    Object.prototype.hasOwnProperty.call(updates, field)
  );
}

function getInstallmentCount(debt: Debt) {
  const explicitCount = Number(debt.totalInstallments);
  if (Number.isFinite(explicitCount) && explicitCount > 0) {
    return Math.trunc(explicitCount);
  }

  const amount = Number(debt.installmentAmount);
  const baseTotal = Number(debt.remainingAmount || debt.totalAmount);
  if (Number.isFinite(amount) && amount > 0 && Number.isFinite(baseTotal) && baseTotal > 0) {
    return Math.max(1, Math.ceil(baseTotal / amount));
  }

  return 1;
}

function getInstallmentDate(baseDate: Date, offset: number, dueDay?: number) {
  const monthDate = addMonths(baseDate, offset);

  if (!dueDay) {
    return format(monthDate, 'yyyy-MM-dd');
  }

  const normalizedDueDay = Math.max(1, Math.min(31, Math.trunc(dueDay)));
  const date = new Date(monthDate.getFullYear(), monthDate.getMonth(), normalizedDueDay);

  if (date.getMonth() !== monthDate.getMonth()) {
    date.setDate(0);
  }

  return format(date, 'yyyy-MM-dd');
}

function buildExpectedDebtInstallments(
  debt: Debt,
  userId: string,
  categoryId?: string | null,
  cardById?: Map<string, CreditCard>
) {
  const count = getInstallmentCount(debt);
  const amount = Number(debt.installmentAmount);
  const baseDate = debt.startDate ? parseLocalDate(debt.startDate) : new Date();

  return Array.from({ length: count }, (_, index) => {
    const installmentDate = getInstallmentDate(baseDate, index, debt.dueDay);
    const linkedCard = debt.cardId ? cardById?.get(debt.cardId) : undefined;
    const invoiceMonthYear = linkedCard
      ? calcInvoiceMonthYearForCard(parseLocalDate(installmentDate), linkedCard)
      : null;

    return {
    user_id: userId,
    type: 'expense',
    transaction_type: 'installment',
    description: `Acordo ${debt.name} (${index + 1}/${count})`,
    amount,
    date: installmentDate,
    debt_id: debt.id,
    category_id: categoryId || null,
    card_id: debt.cardId || null,
    invoice_month_year: invoiceMonthYear,
    is_paid: false,
    installment_number: index + 1,
    installment_total: count,
    };
  });
}

async function syncDebtInstallments({
  debt,
  userId,
  categoryId,
  creditCards,
}: {
  debt: Debt;
  userId: string;
  categoryId?: string | null;
  creditCards?: CreditCard[];
}): Promise<SyncDebtInstallmentsReport> {
  const report: SyncDebtInstallmentsReport = {
    created: 0,
    updated: 0,
    preservedPaid: 0,
    conflicts: [],
  };

  const amount = Number(debt.installmentAmount);
  if (!Number.isFinite(amount) || amount <= 0) {
    report.conflicts.push('installmentAmount inválido; sincronização ignorada.');
    return report;
  }

  const { data: existingInstallments, error: fetchError } = await supabase
    .from('transactions')
    .select('id, description, amount, date, is_paid, payment_date, account_id, card_id, category_id, debt_id, installment_group_id, installment_number, installment_total, deleted_at')
    .eq('debt_id', debt.id);

  if (fetchError) throw fetchError;

  const existingRows = (existingInstallments || []) as DebtInstallmentRow[];
  const activeRows = existingRows.filter((row) => !row.deleted_at);
  const shouldMaterialize = debt.status === 'renegotiated' || existingRows.length > 0;

  if (!shouldMaterialize) {
    return report;
  }

  const normalizedGroupId =
    activeRows.find((row) => row.installment_group_id)?.installment_group_id ||
    existingRows.find((row) => row.installment_group_id)?.installment_group_id ||
    crypto.randomUUID();

  const fallbackCategoryId =
    categoryId ||
    activeRows.find((row) => row.category_id)?.category_id ||
    existingRows.find((row) => row.category_id)?.category_id ||
    null;

  const rowsByInstallment = activeRows.reduce((map, row) => {
    if (!row.installment_number) return map;
    const current = map.get(row.installment_number) || [];
    current.push(row);
    map.set(row.installment_number, current);
    return map;
  }, new Map<number, DebtInstallmentRow[]>());

  const cardById = new Map((creditCards || []).map((card) => [card.id, card] as const));
  const expectedInstallments = buildExpectedDebtInstallments(debt, userId, fallbackCategoryId, cardById);

  for (const expected of expectedInstallments) {
    const installmentNumber = expected.installment_number;
    const matchingActiveRows = rowsByInstallment.get(installmentNumber) || [];
    const paidRows = matchingActiveRows.filter((row) => row.is_paid);
    const pendingRows = matchingActiveRows.filter((row) => !row.is_paid);

    if (matchingActiveRows.length > 1) {
      report.conflicts.push(`Parcela ${installmentNumber} possui ${matchingActiveRows.length} registros ativos.`);
    }

    if (paidRows.length > 0) {
      report.preservedPaid += paidRows.length;
      continue;
    }

    const pendingRow = pendingRows[0];
    if (pendingRow) {
      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          type: expected.type,
          transaction_type: expected.transaction_type,
          description: expected.description,
          amount: expected.amount,
          date: expected.date,
          debt_id: expected.debt_id,
          category_id: expected.category_id,
          card_id: expected.card_id,
          invoice_month_year: expected.invoice_month_year,
          installment_group_id: normalizedGroupId,
          installment_number: expected.installment_number,
          installment_total: expected.installment_total,
        })
        .eq('id', pendingRow.id)
        .select('id');

      if (updateError) throw updateError;
      report.updated += 1;
      continue;
    }

    const { error: insertError } = await supabase
      .from('transactions')
      .insert({
        ...expected,
        installment_group_id: normalizedGroupId,
      })
      .select('id');

    if (insertError) throw insertError;
    report.created += 1;
  }

  return report;
}

// --- 1. ADICIONAR DÍVIDA ---
export function useAddDebt() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (debt: Omit<Debt, 'id' | 'userId'>) => {
      if (!user) throw new Error('Utilizador não autenticado');

      const safeName = (debt.name ?? '').trim().slice(0, 150);

      const payload = {
        user_id: user.id,
        name: safeName,
        total_amount: debt.totalAmount,
        remaining_amount: debt.remainingAmount,
        installment_amount: debt.installmentAmount,
        interest_rate_monthly: debt.interestRateMonthly,
        due_day: debt.dueDay,
        strategy_priority: debt.strategyPriority,
        status: debt.status || 'active',
        total_installments: debt.totalInstallments,
        card_id: debt.cardId,
        debt_type: debt.debtType,
      };

      const { data, error } = await supabase.from('debts').insert(payload).select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast({ title: 'Acordo registrado!' });
    },
    onError: (err) => {
      logSafeError('useAddDebt', err);
      toast({ title: 'Erro ao registrar acordo', variant: 'destructive' });
    }
  });
}

// --- 2. ATUALIZAR DÍVIDA ---
export function useUpdateDebt(deps: DebtMutationDeps = {}) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: Partial<Debt> }) => {
      const payload: DebtDbPayload = {};

      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.totalAmount !== undefined) payload.total_amount = updates.totalAmount;
      if (updates.remainingAmount !== undefined) payload.remaining_amount = updates.remainingAmount;
      if (updates.installmentAmount !== undefined) payload.installment_amount = updates.installmentAmount;
      if (updates.interestRateMonthly !== undefined) payload.interest_rate_monthly = updates.interestRateMonthly;
      if (updates.minimumPayment !== undefined) payload.minimum_payment = updates.minimumPayment;
      if (updates.dueDay !== undefined) payload.due_day = updates.dueDay;
      if (updates.strategyPriority !== undefined) payload.strategy_priority = updates.strategyPriority;
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.totalInstallments !== undefined) payload.total_installments = updates.totalInstallments;
      if (updates.cardId !== undefined) payload.card_id = updates.cardId;
      if (updates.debtType !== undefined) payload.debt_type = updates.debtType;
      if (updates.startDate !== undefined) payload.start_date = updates.startDate;

      // 1. Atualizar a dívida
      const { data: updatedDebtRow, error } = await supabase
        .from('debts')
        .update(payload)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;

      let syncReport: SyncDebtInstallmentsReport | null = null;
      if (user && shouldSyncDebtInstallments(updates)) {
        const updatedDebt = mapDebtRow(updatedDebtRow, updates);
        const creditCards = deps.creditCards ?? queryClient.getQueryData<CreditCard[]>(['credit-cards']) ?? [];
        syncReport = await syncDebtInstallments({
          debt: updatedDebt,
          userId: user.id,
          creditCards,
        });
      }

      return { id, syncReport };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast({ title: 'Acordo atualizado!' });
    },
    onError: (err) => {
      logSafeError('useUpdateDebt', err);
      toast({ title: 'Erro ao atualizar acordo', variant: 'destructive' });
    }
  });
}

// --- 3. DELETAR DÍVIDA ---
export function useDeleteDebt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const now = new Date().toISOString();

      // 1. Soft delete da dívida
      const { error } = await supabase
        .from('debts')
        .update({ deleted_at: now })
        .eq('id', id);
      if (error) throw error;

      // 2. 🗑️ Soft delete em cascata: transações não pagas vinculadas à dívida
      const { error: txError } = await supabase
        .from('transactions')
        .update({ deleted_at: now })
        .eq('debt_id', id)
        .is('deleted_at', null);
      if (txError) throw txError;

      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['cards'] }); // Recalcular limites baseados nas transações restantes
      toast({ title: 'Acordo removido e saldos estornados.' });
    },
    onError: (err) => {
      logSafeError('useDeleteDebt', err);
      toast({ title: 'Erro ao remover acordo', variant: 'destructive' });
    }
  });
}

// --- 4. RENEGOCIAR ACORDO ---
export function useRenegotiateDebt(deps: DebtMutationDeps = {}) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ debt, firstInstallmentDate }: { debt: Debt, firstInstallmentDate?: string }) => {
      if (!user) throw new Error('Utilizador não autenticado');

      // 1. Atualizar status do acordo e data se fornecida
      const debtUpdates: { status: 'renegotiated'; start_date?: string } = { status: 'renegotiated' };
      if (firstInstallmentDate) debtUpdates.start_date = firstInstallmentDate;

      const { data: updatedDebtRow, error: debtError } = await supabase
        .from('debts')
        .update(debtUpdates)
        .eq('id', debt.id)
        .select('*')
        .single();

      if (debtError) throw debtError;

      // 2. Recalcular/materializar parcelas sem sobrescrever pagamentos já efetivados
      const categories = deps.categories ?? queryClient.getQueryData<Category[]>(['categories']) ?? [];
      const creditCards = deps.creditCards ?? queryClient.getQueryData<CreditCard[]>(['credit-cards']) ?? [];
      const agreementCategoryId = categories.find((category) =>
        ['Acordo', 'Metas/Acordos', 'Renegociação'].includes(category.name)
      )?.id;

      const updatedDebt = mapDebtRow(updatedDebtRow, {
        ...debt,
        status: 'renegotiated',
        startDate: firstInstallmentDate || debt.startDate,
      });
      const syncReport = await syncDebtInstallments({
        debt: updatedDebt,
        userId: user.id,
        categoryId: agreementCategoryId,
        creditCards,
      });

      return { id: debt.id, syncReport };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast({ title: 'Acordo gerado com sucesso!' });
    },
    onError: (err) => {
      logSafeError('useRenegotiateDebt', err);
      toast({ title: 'Erro ao renegociar acordo', variant: 'destructive' });
    }
  });
}

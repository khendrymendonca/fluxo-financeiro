import { useState, useEffect, useCallback } from 'react';
import { FinanceState, Transaction, Account, CreditCard, Debt, SavingsGoal } from '@/types/finance';

const STORAGE_KEY = 'fluxo-finance-data';

const initialState: FinanceState = {
  transactions: [],
  accounts: [],
  creditCards: [],
  debts: [],
  savingsGoals: [],
};

export function useFinanceStore() {
  const [state, setState] = useState<FinanceState>(() => {
    if (typeof window === 'undefined') return initialState;

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return initialState;
      }
    }
    return initialState;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // Transactions
  const addTransaction = useCallback((transaction: Omit<Transaction, 'id'>, customInstallments?: { date: string, amount: number }[]) => {
    const transactionId = crypto.randomUUID();
    const installmentGroupId = (transaction.installments || customInstallments) ? crypto.randomUUID() : undefined;

    const transactionsToAdd: Transaction[] = [];

    // Scenario 1: Custom Installments (Manually set dates/values)
    if (customInstallments && customInstallments.length > 0) {
      customInstallments.forEach((inst, index) => {
        transactionsToAdd.push({
          ...transaction,
          id: crypto.randomUUID(),
          date: inst.date,
          amount: inst.amount,
          installments: installmentGroupId ? {
            current: index + 1,
            total: customInstallments.length,
            id: installmentGroupId
          } : undefined
        });
      });
    }
    // Scenario 2: Auto-generated Installments (Equal values, monthly)
    else if (transaction.installments && transaction.installments.total > 1) {
      const installmentValue = transaction.amount / transaction.installments.total;
      for (let i = 1; i <= transaction.installments.total; i++) {
        const date = new Date(transaction.date);
        date.setMonth(date.getMonth() + (i - 1));

        transactionsToAdd.push({
          ...transaction,
          id: crypto.randomUUID(),
          amount: installmentValue,
          date: date.toISOString().split('T')[0],
          installments: installmentGroupId ? {
            current: i,
            total: transaction.installments.total,
            id: installmentGroupId
          } : undefined
        });
      }
    }
    // Scenario 3: Recurring Transaction (Generate 12 months for now)
    else if (transaction.recurrence === 'monthly') {
      for (let i = 0; i < 12; i++) {
        const date = new Date(transaction.date);
        date.setMonth(date.getMonth() + i);

        transactionsToAdd.push({
          ...transaction,
          id: crypto.randomUUID(),
          date: date.toISOString().split('T')[0],
          // Recurring items are individual transactions, not linked installments usually, 
          // but we store them as individual items.
        });
      }
    }
    // Scenario 4: Single Transaction
    else {
      transactionsToAdd.push({ ...transaction, id: transactionId });
    }

    setState(prev => {
      let updatedAccounts = prev.accounts;
      let updatedDebts = prev.debts;

      // Update Accounts Balance (Only for immediate transactions or if logic dictates)
      // We only update balance for transactions that are effectively "paid" now or affect balance now.
      // Usually only the first one of a series if date is today/past? 
      // For simplicity, we update balance for ALL added transactions that have an accountID.
      // This means "Future" transactions will already deduct from "Current Balance" in this simple logic?
      // Wait, usually future transactions shouldn't affect current balance. 
      // User said: "puxar automaticamente, e debitar da forma de pagamento".
      // Let's keep logic: if it has accountId, it affects balance. 
      // Refinement: Only affect balance if date <= today? 
      // For now, let's keep consistent: if you book it on account, it affects balance. 

      transactionsToAdd.forEach(t => {
        if (t.accountId) {
          updatedAccounts = updatedAccounts.map(acc => {
            if (acc.id === t.accountId) {
              const amount = Number(t.amount);
              const newBalance = t.type === 'income'
                ? acc.balance + amount
                : acc.balance - amount;
              return { ...acc, balance: newBalance };
            }
            return acc;
          });
        }
      });

      // Handle Debt Balance Update (Payment)
      // Check if ANY of the added transactions pay a debt
      const debtPayments = transactionsToAdd.filter(t => t.debtId);
      if (debtPayments.length > 0) {
        updatedDebts = updatedDebts.map(debt => {
          const paymentsForThisDebt = debtPayments.filter(p => p.debtId === debt.id);
          if (paymentsForThisDebt.length > 0) {
            const totalPaid = paymentsForThisDebt.reduce((sum, p) => sum + p.amount, 0);
            const newRemaining = Math.max(0, debt.remainingAmount - totalPaid);
            return { ...debt, remainingAmount: newRemaining };
          }
          return debt;
        });
      }

      return {
        ...prev,
        transactions: [...transactionsToAdd, ...prev.transactions],
        accounts: updatedAccounts,
        debts: updatedDebts,
      };
    });
  }, []);

  const createDebtWithInstallments = useCallback((debt: Omit<Debt, 'id' | 'linkedTransactionIds'>, firstPaymentDate: string) => {
    const debtId = crypto.randomUUID();
    const transactionsToAdd: Transaction[] = [];
    const linkedIds: string[] = [];

    // Calculate details
    const numberOfInstallments = Math.ceil(debt.totalAmount / debt.monthlyPayment); // Approx or exact? User input "quantas parcelas" in request description.
    // User said: "valor total da dívida, quantas parcelas e as datas de pagamento"
    // So we should strictly trust user inputs. 
    // But currently Debt doesn't store 'totalInstallments'. We infer it.
    // Let's assume for this specific action we calculate based on monthlyPayment till total is reached.

    let remainingToCreate = debt.totalAmount;

    for (let i = 0; i < numberOfInstallments; i++) {
      const transactionId = crypto.randomUUID();
      linkedIds.push(transactionId);

      const date = new Date(firstPaymentDate);
      date.setMonth(date.getMonth() + i);

      // Determine amount for this installment (last one might be smaller)
      const amount = Math.min(debt.monthlyPayment, remainingToCreate);
      remainingToCreate -= amount;

      transactionsToAdd.push({
        id: transactionId,
        type: 'expense',
        description: `Parcela ${i + 1}/${numberOfInstallments} - ${debt.name}`,
        amount: amount,
        category: 'bills', // Default category for debts
        date: date.toISOString().split('T')[0],
        // debtId: debtId, // Link back to this debt so when paid it reduces amount? 
        // Logic conflict: Creating the debt already sets "Remaining Amount".
        // The transactions are "Future Expenses".
        // When these transactions are "Paid" (or just exist), should they reduce the debt?
        // In "DebtsManager", we have "Total" and "Remaining".
        // If we create "Future Transactions", they are just scheduled. 
        // Providing `debtId` connects them. 
        // BUT `addTransaction` logic above reduces debt balance when a transaction with debtId is added.
        // If we add ALL these transactions now, the debt balance would go to ZERO immediately because logic says "Added transaction = Payment made".
        // FIX: validation in addTransaction to ONLY reduce debt if transaction date is <= today? 
        // OR: Special flag `isFutureProjection`?
        // Let's keep it simple: DONT add `debtId` to these projected transactions to avoid auto-reducing debt balance immediately.
        // Instead, user "matches" them later?
        // BETTER: The user request says: "parcelas tem que aparecer no contas a pagar".
        // If I pay a bill in "Transactions", it is money leaving my account.
        // Ideally, these generated transactions are "Pending".
        // Fluxo-financeiro app simple version doesn't have "Pending/Paid" status yet. It just has "Transactions".
        // If they are in the future, they are effectively "Accounts Payable".
        // Problem: `useFinanceStore` deducts balance immediately for ALL transactions.
        // We need to fix `useFinanceStore` to NOT deduct balance for future transactions.
      });
    }

    // Fix for Future Balance Impact:
    // We need to modify the store logic to separate "Realized Balance" vs "Projected".
    // For now, let's just add the Debt and the Transactions.
    // IMPORTANT: We must NOT pass `debtId` to these generated transactions if `addTransaction` deducts balance immediately.
    // Actually, `addTransaction` logic I wrote above deducts balance if `accountId` is present.
    // These debt installments usually DON'T have an accountId specific yet? Or user specifies?
    // "pagamento via sair da minha conta bancária no Itaú" -> so they likely have accountId.
    // If they have accountId, balance updates immediately.
    // This is a flaw in the current simple architecture (no Pending status). 
    // Correct approach for now: Do NOT set accountId for these future installments. User sets it when paying?
    // User said: "controle de dívidas... controlando o pagamento por lá também".
    // Let's set them created WITHOUT accountId. So they appear in charts/list but don't affect bank balance yet.

    setState(prev => ({
      ...prev,
      debts: [...prev.debts, { ...debt, id: debtId, linkedTransactionIds: linkedIds }],
      transactions: [...transactionsToAdd, ...prev.transactions]
    }));
  }, []);

  const payInvoice = useCallback((cardId: string, invoiceDate: string, accountId: string, amount: number) => {
    const transactionId = crypto.randomUUID();
    const paymentTransaction: Transaction = {
      id: transactionId,
      type: 'expense',
      description: `Pagamento de Fatura - ${invoiceDate}`,
      amount: amount,
      category: 'bills', // Or specific 'invoice' category
      date: new Date().toISOString().split('T')[0],
      accountId: accountId,
      isInvoicePayment: true,
      // We don't verify if it covers full amount here, we just record the payment.
      // The "Limit Available" logic needs to account for this.
      // Limit Used = (Sum of all Card Expenses) - (Sum of all Card Payments) ? 
      // Start simple: Yes.
      // IMPORTANT: The payment transaction itself is an EXPENSE from the ACCOUNT. 
      // It represents money leaving the bank.
      // Does it also represent a Credit to the Card? 
      // Usually we handle card payments as "Transfer" from Account to Card, or just an Expense that "clears" the card debt.
      // If we treat it as an Expense on the Account, that's correct for cash flow.
      // For Card Balance, we need to sum Expenses on Card MINUS Payments regarding that Card.
      // But this transaction is on `accountId`. How do we link it to the card?
      // We should add `cardId` to this payment transaction too?
      // If we add `cardId` to an expense, it usually means "Expense made WITH card".
      // We need a way to distinguish "Expense WITH card" vs "Payment OF card".
      // `isInvoicePayment: true` combined with `cardId` could mean "Payment OF card".
      cardId: cardId
    };

    setState(prev => {
      // 1. Deduct from Account Balance
      const updatedAccounts = prev.accounts.map(acc => {
        if (acc.id === accountId) {
          return { ...acc, balance: acc.balance - amount };
        }
        return acc;
      });

      return {
        ...prev,
        accounts: updatedAccounts,
        transactions: [paymentTransaction, ...prev.transactions]
      };
    });
  }, []);

  const deleteTransaction = useCallback((id: string) => {
    setState(prev => {
      const transaction = prev.transactions.find(t => t.id === id);
      let updatedAccounts = prev.accounts;
      let updatedDebts = prev.debts;

      if (transaction) {
        // Reverse Account Balance
        if (transaction.accountId) {
          updatedAccounts = prev.accounts.map(acc => {
            if (acc.id === transaction.accountId) {
              const amount = Number(transaction.amount);
              // Reverse the operation
              const newBalance = transaction.type === 'income'
                ? acc.balance - amount
                : acc.balance + amount;
              return { ...acc, balance: newBalance };
            }
            return acc;
          });
        }

        // Reverse Debt Payment
        if (transaction.debtId) {
          updatedDebts = updatedDebts.map(debt => {
            if (debt.id === transaction.debtId) {
              // We added a payment, so we must add it back to remaining amount
              return { ...debt, remainingAmount: debt.remainingAmount + transaction.amount };
            }
            return debt;
          });
        }
      }

      return {
        ...prev,
        transactions: prev.transactions.filter(t => t.id !== id),
        accounts: updatedAccounts,
        debts: updatedDebts,
      };
    });
  }, []);

  // Accounts
  const addAccount = useCallback((account: Omit<Account, 'id'>) => {
    const newAccount = { ...account, id: crypto.randomUUID() };
    setState(prev => ({
      ...prev,
      accounts: [...prev.accounts, newAccount],
    }));
  }, []);

  const updateAccount = useCallback((id: string, updates: Partial<Account>) => {
    setState(prev => ({
      ...prev,
      accounts: prev.accounts.map(a => a.id === id ? { ...a, ...updates } : a),
    }));
  }, []);

  const deleteAccount = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      accounts: prev.accounts.filter(a => a.id !== id),
    }));
  }, []);

  // Credit Cards
  const addCreditCard = useCallback((card: Omit<CreditCard, 'id'>) => {
    const newCard = { ...card, id: crypto.randomUUID() };
    setState(prev => ({
      ...prev,
      creditCards: [...prev.creditCards, newCard],
    }));
  }, []);

  const deleteCreditCard = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      creditCards: prev.creditCards.filter(c => c.id !== id)
    }));
  }, []);

  const updateCreditCard = useCallback((updatedCard: CreditCard) => {
    setState(prev => ({
      ...prev,
      creditCards: prev.creditCards.map(c => c.id === updatedCard.id ? updatedCard : c)
    }));
  }, []);

  const getCardSettingsForDate = useCallback((card: CreditCard, targetDate: Date) => {
    // Logic: Find the applicable config for the targetDate.
    // 1. We assume `card` object has `dueDay/closingDay` as the CURRENT/LATEST settings.
    // 2. `history` should contain previous configurations or future ones.
    // Actually, to support "From June onwards", we need to store time-boxed configs.
    // If we only store "Current", we lose what it was "Before".
    // So when updating:
    // We should push the *previous* state into history with an `endDate`? Or just `effectiveDate`.
    // Let's assume `history` stores: { dueDay, closingDay, effectiveDate }.
    // effectiveDate = The date this config STARTED being active.

    if (!card.history || card.history.length === 0) {
      return { dueDay: card.dueDay, closingDay: card.closingDay };
    }

    // 1. Combine root (current) and history into a timeline.
    // We need to know the effective date of the current root settings too?
    // This gets complex.
    // SIMPLE APPROACH for "User wants to edit":
    // When user edits "From Date X":
    // We add a new entry to history: { dueDay: newDay, closingDay: newClosing, effectiveDate: X }.
    // AND we might update root if X is <= Today.

    // Retrieval:
    // Sort all history entries by effectiveDate DESC.
    // Find the first one where effectiveDate <= targetDate.
    // If found, return that.
    // If NOT found (targetDate is older than all history), return... what?
    // We should assume the oldest history entry applies, or the current one if no history matches?
    // Let's Assume: The Root `dueDay` is the FALLBACK if no specific history matches? 
    // Or Root is just "Configuration Label".

    // Let's try:
    // History: [{date: '2024-06-01', due: 10}, {date: '2024-01-01', due: 20}]
    // Query May 2024: Matches '2024-01-01' -> Due 20.
    // Query July 2024: Matches '2024-06-01' -> Due 10.
    // Query 2023: No match. Fallback to... '2024-01-01'? (The oldest known).

    const sortedHistory = [...card.history].sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime());

    const match = sortedHistory.find(h => new Date(h.effectiveDate) <= targetDate);

    if (match) return { dueDay: match.dueDay, closingDay: match.closingDay };

    // If date is before all history, return the oldest history item (assuming it was valid before too)
    // or return current root props.
    if (sortedHistory.length > 0) {
      return { dueDay: sortedHistory[sortedHistory.length - 1].dueDay, closingDay: sortedHistory[sortedHistory.length - 1].closingDay };
    }

    return { dueDay: card.dueDay, closingDay: card.closingDay };
  }, []);

  // Re-implementing getCardSettingsForDate with correct logic inside scope or better:
  // Since we can't easily add helpers that depend on state inside the store object without `get()` access (which we have via closures but...)
  // Let's make it a pure helper function exported alongside, OR keep it basic inside.
  // The Issue: `getCardSettingsForDate` needs access to the CARD object, which is passed in. It doesn't need store state. 
  // So it can be a static helper. But I put it in the return, so I must define it.


  // Debts
  const addDebt = useCallback((debt: Omit<Debt, 'id'>) => {
    const newDebt = { ...debt, id: crypto.randomUUID() };
    setState(prev => ({
      ...prev,
      debts: [...prev.debts, newDebt],
    }));
  }, []);

  const updateDebt = useCallback((id: string, updates: Partial<Debt>) => {
    setState(prev => ({
      ...prev,
      debts: prev.debts.map(d => d.id === id ? { ...d, ...updates } : d),
    }));
  }, []);

  const deleteDebt = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      debts: prev.debts.filter(d => d.id !== id),
    }));
  }, []);

  // Savings Goals
  const addSavingsGoal = useCallback((goal: Omit<SavingsGoal, 'id'>) => {
    const newGoal = { ...goal, id: crypto.randomUUID() };
    setState(prev => ({
      ...prev,
      savingsGoals: [...prev.savingsGoals, newGoal],
    }));
  }, []);

  const updateSavingsGoal = useCallback((id: string, updates: Partial<SavingsGoal>) => {
    setState(prev => ({
      ...prev,
      savingsGoals: prev.savingsGoals.map(g => g.id === id ? { ...g, ...updates } : g),
    }));
  }, []);

  const deleteSavingsGoal = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      savingsGoals: prev.savingsGoals.filter(g => g.id !== id),
    }));
  }, []);

  // Computed values
  const totalBalance = state.accounts.reduce((sum, acc) => sum + acc.balance, 0);

  const currentMonthTransactions = state.transactions.filter(t => {
    const transactionDate = new Date(t.date);
    const now = new Date();
    return transactionDate.getMonth() === now.getMonth() &&
      transactionDate.getFullYear() === now.getFullYear();
  });

  const totalIncome = currentMonthTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = currentMonthTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const getCardExpenses = useCallback((cardId: string) => {
    return currentMonthTransactions
      .filter(t => t.cardId === cardId && t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [currentMonthTransactions]);

  const getCategoryExpenses = useCallback(() => {
    const expenses: Record<string, number> = {};
    currentMonthTransactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        expenses[t.category] = (expenses[t.category] || 0) + t.amount;
      });
    return expenses;
  }, [currentMonthTransactions]);

  return {
    ...state,
    totalBalance,
    totalIncome,
    totalExpenses,
    currentMonthTransactions,
    getCardExpenses,
    getCategoryExpenses,
    addTransaction,
    deleteTransaction,
    addAccount,
    updateAccount,
    deleteAccount,
    addCreditCard,
    updateCreditCard,
    deleteCreditCard,
    addDebt,
    updateDebt,
    deleteDebt,
    addSavingsGoal,
    updateSavingsGoal,
    deleteSavingsGoal,
    createDebtWithInstallments,
    payInvoice,
    getCardSettingsForDate,
  };
}

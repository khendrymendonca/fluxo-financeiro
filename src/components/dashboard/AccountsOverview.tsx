import { CreditCard as CreditCardIcon, Building2 } from 'lucide-react';
import { Account, CreditCard } from '@/types/finance';

interface AccountsOverviewProps {
  accounts: Account[];
  creditCards: CreditCard[];
  getCardExpenses: (cardId: string) => number;
}

import { useFinanceStore } from '@/hooks/useFinanceStore';

export function AccountsOverview({ accounts, creditCards, getCardExpenses }: AccountsOverviewProps) {
  const { getAccountViewBalance } = useFinanceStore();
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="card-elevated p-6 animate-fade-in">
      <h3 className="text-lg font-semibold mb-4">Contas e Cartões</h3>

      {/* Bank Accounts */}
      <div className="space-y-3 mb-6">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Contas</p>
        {accounts.map((account) => (
          <div
            key={account.id}
            className="flex items-center justify-between p-3 rounded-xl bg-muted/30"
          >
            <div className="flex items-center gap-3">
              <div
                className="p-2 rounded-xl"
                style={{ backgroundColor: `${account.color}20` }}
              >
                <Building2 className="w-4 h-4" style={{ color: account.color }} />
              </div>
              <div>
                <p className="font-medium text-sm">{account.name}</p>
                <p className="text-xs text-muted-foreground">{account.bank}</p>
              </div>
            </div>
            <span className="font-semibold text-sm">
              {formatCurrency(getAccountViewBalance(account.id))}
            </span>
          </div>
        ))}
      </div>

      {/* Credit Cards */}
      {creditCards.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Cartões</p>
          {creditCards.map((card) => {
            const currentExpenses = getCardExpenses(card.id);
            const usagePercentage = (currentExpenses / card.limit) * 100;

            return (
              <div
                key={card.id}
                className="p-3 rounded-xl bg-muted/30 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="p-2 rounded-xl"
                      style={{ backgroundColor: `${card.color}20` }}
                    >
                      <CreditCardIcon className="w-4 h-4" style={{ color: card.color }} />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{card.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Venc. dia {card.dueDay}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm text-danger">
                      {formatCurrency(currentExpenses)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      de {formatCurrency(card.limit)}
                    </p>
                  </div>
                </div>
                <div className="progress-gradient">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(usagePercentage, 100)}%`,
                      backgroundColor: usagePercentage > 80 ? 'hsl(0, 70%, 60%)' : card.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

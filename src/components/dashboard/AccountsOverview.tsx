import { CreditCard as CreditCardIcon, Building2 } from 'lucide-react';
import { Account, CreditCard } from '@/types/finance';
import { cn } from '@/lib/utils';

interface AccountsOverviewProps {
  accounts: Account[];
  creditCards: CreditCard[];
}

import { useFinanceStore } from '@/hooks/useFinanceStore';

import { useIsMobile } from '@/hooks/useIsMobile';

export function AccountsOverview({ accounts, creditCards }: AccountsOverviewProps) {
  const { getAccountViewBalance, getCardUsedLimit } = useFinanceStore();
  const isMobile = useIsMobile();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className={cn("card-elevated animate-fade-in h-full", "p-4 md:p-6")}>
      <h3 className="text-lg font-semibold mb-4">Contas e Cartões</h3>

      {/* Bank Accounts */}
      <div className="mb-6">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Contas</p>
        <div className="flex md:grid md:grid-cols-2 lg:grid-cols-2 gap-3 overflow-x-auto md:overflow-visible pb-2 md:pb-0 -mx-2 md:mx-0 px-2 md:px-0 no-scrollbar">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="flex items-center justify-between p-3 rounded-xl bg-muted/30 min-w-[200px] md:min-w-0 flex-shrink-0 md:flex-shrink"
            >
              <div className="flex items-center gap-3">
                <div
                  className="p-2 rounded-xl"
                  style={{ backgroundColor: `${account.color}20` }}
                >
                  <Building2 className="w-4 h-4" style={{ color: account.color }} />
                </div>
                <div>
                  <p className="font-medium text-sm truncate max-w-[100px]">{account.name}</p>
                  <p className="text-xs text-muted-foreground">{account.bank}</p>
                </div>
              </div>
              <span className="font-semibold text-sm ml-2">
                {formatCurrency(getAccountViewBalance(account.id))}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Credit Cards */}
      {creditCards.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Cartões</p>
          <div className="flex md:grid md:grid-cols-2 lg:grid-cols-2 gap-3 overflow-x-auto md:overflow-visible pb-2 md:pb-0 -mx-2 md:mx-0 px-2 md:px-0 no-scrollbar">
            {creditCards.map((card) => {
              const currentExpenses = getCardUsedLimit(card.id);
              const usagePercentage = (currentExpenses / card.limit) * 100;

              return (
                <div
                  key={card.id}
                  className="p-3 rounded-xl bg-muted/30 space-y-2 min-w-[240px] md:min-w-0 flex-shrink-0 md:flex-shrink"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="p-2 rounded-xl"
                        style={{ backgroundColor: `${card.color}20` }}
                      >
                        <CreditCardIcon className="w-4 h-4" style={{ color: card.color }} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{card.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Venc. {card.dueDay}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-semibold text-sm text-danger">
                        {formatCurrency(currentExpenses)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(card.limit)}
                      </p>
                    </div>
                  </div>
                  <div className="progress-gradient h-1.5 w-full">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(usagePercentage, 100)}%`,
                        backgroundColor: usagePercentage > 80 ? 'hsl(var(--destructive))' : card.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}



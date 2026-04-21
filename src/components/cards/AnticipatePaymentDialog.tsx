import React, { useState } from 'react';
import { 
  X, 
  Banknote, 
  Calendar as CalendarIcon, 
  CreditCard as CardIcon,
  Loader2
} from 'lucide-react';
import { useAnticipateCardPayment } from '@/hooks/useCreditCardMutations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/utils/formatters';
import { todayLocalString } from '@/utils/dateUtils';
import { cn } from '@/lib/utils';
import { CreditCard, Account } from '@/types/finance';

interface AnticipatePaymentDialogProps {
  card: CreditCard;
  accounts: Account[];
  isOpen: boolean;
  onClose: () => void;
}

export function AnticipatePaymentDialog({ card, accounts, isOpen, onClose }: AnticipatePaymentDialogProps) {
  const { mutateAsync: anticipatePayment } = useAnticipateCardPayment();
  
  const [amount, setAmount] = useState<string>('');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(todayLocalString());
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!amount || parseFloat(amount) <= 0 || !selectedAccountId) return;

    setIsSubmitting(true);
    try {
      await anticipatePayment({
        cardId: card.id,
        accountId: selectedAccountId,
        amount: parseFloat(amount),
        date: paymentDate
      });
      onClose();
    } catch (error) {
      // Erro tratado pelo hook via toast
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredAccounts = accounts.filter(acc => 
    acc.accountType !== 'investment' && 
    acc.accountType !== 'metas' &&
    acc.id !== 'card-payment'
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/20 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-zinc-950 rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-zinc-100 dark:border-zinc-900 animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="px-8 pt-8 pb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 italic">Abatimento de Fatura</h2>
            <p className="text-xs uppercase font-black tracking-[0.2em] text-zinc-400 mt-1">Ajuste de Saldo Devedor</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-full hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors text-zinc-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-8 space-y-8">
          
          {/* Identidade do Cartão - Privacidade Absoluta */}
          <div 
            className="p-6 rounded-[2rem] relative overflow-hidden shadow-inner border border-white/10"
            style={{ backgroundColor: card.color || '#27272a' }}
          >
            <div className="relative z-10 flex flex-col justify-between h-24 text-white">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest opacity-60">Cartão</p>
                  <p className="font-bold text-lg">{card.name}</p>
                </div>
                <CardIcon className="w-6 h-6 opacity-40" />
              </div>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest opacity-60 leading-none">Limite Total</p>
                  <p className="font-black text-xl">{formatCurrency(card.limit)}</p>
                </div>
                <div className="text-xs font-black uppercase tracking-widest bg-white/20 px-2 py-1 rounded-lg">
                  {card.bank}
                </div>
              </div>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl" />
          </div>

          {/* Form */}
          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-zinc-400 ml-1">Valor do Pagamento</Label>
              <div className="relative">
                <Banknote className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-300" />
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0,00"
                  className="h-14 pl-12 rounded-2xl border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/30 font-bold text-lg focus:ring-zinc-200 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-zinc-400 ml-1">Data</Label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
                  <Input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="h-12 pl-10 rounded-xl border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/30 font-bold text-xs"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-zinc-400 ml-1">Origem</Label>
                <select
                  value={selectedAccountId}
                  onChange={e => setSelectedAccountId(e.target.value)}
                  className="h-12 w-full rounded-xl border border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/30 px-4 font-bold text-xs focus:ring-zinc-200 transition-all outline-none appearance-none"
                >
                  <option value="">Escolher conta</option>
                  {filteredAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.bank} - {acc.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-4 flex flex-col gap-3">
            <Button
              onClick={handleConfirm}
              disabled={isSubmitting || !amount || !selectedAccountId}
              className={cn(
                "h-16 rounded-[1.5rem] font-black uppercase tracking-widest transition-all text-sm",
                "bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white",
                "shadow-xl shadow-zinc-200 dark:shadow-none active:scale-[0.98]"
              )}
            >
              {isSubmitting ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>Confirmar Abatimento</>
              )}
            </Button>
            
            <button 
              onClick={onClose}
              className="h-12 text-xs font-black uppercase tracking-[0.2em] text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              Cancelar e Voltar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

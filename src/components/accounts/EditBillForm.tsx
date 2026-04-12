import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Transaction } from '@/types/finance';
import { RotateCw, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseLocalDate } from '@/utils/dateUtils';

interface EditBillFormProps {
  bill: Transaction;
  onClose: () => void;
  onSave: (
    updates: { amount?: number; date?: string },
    applyScope: 'this' | 'future' | 'all',
    realId: string,
    referenceDate: string
  ) => Promise<void>;
}

export function EditBillForm({ bill, onClose, onSave }: EditBillFormProps) {
  const [amount, setAmount] = useState(bill.amount.toFixed(2));
  const [date, setDate] = useState(bill.date?.slice(0, 10) ?? '');
  const [applyScope, setApplyScope] = useState<'this' | 'future' | 'all'>('future');
  const [isSaving, setIsSaving] = useState(false);

  // Preservamos o ID exato (mesmo que seja virtual) para que o backend/mutações consigam detectar e desmembrar
  const idToUpdate = bill.id;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) return;

    const updates: { amount?: number; date?: string } = {};

    // Só envia o campo se mudou
    if (parsedAmount !== bill.amount) updates.amount = parsedAmount;
    if (date && date !== bill.date?.slice(0, 10)) updates.date = date;

    if (Object.keys(updates).length === 0) {
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      await onSave(updates, applyScope, idToUpdate, bill.date);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="px-5 py-4 space-y-5">
      {bill.isVirtual && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2">
          <span className="text-[11px] font-bold text-amber-600 leading-tight">
            Você está editando uma projeção futura. As alterações serão aplicadas
            a partir de {format(parseLocalDate(bill.date), "MMMM 'de' yyyy", { locale: ptBR })}.
          </span>
        </div>
      )}

      {/* Valor */}
      <div className="space-y-1.5">
        <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
          Novo Valor (R$)
        </Label>
        <Input
          type="number"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="h-12 rounded-2xl border-2 font-black text-xl"
          required
        />
      </div>

      {/* Data de vencimento */}
      <div className="space-y-1.5">
        <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
          Nova Data de Vencimento
        </Label>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-12 rounded-2xl border-2 font-bold"
        />
        <p className="text-[11px] text-muted-foreground font-medium px-1">
          Altere apenas o dia se quiser mudar o vencimento. O mês será preservado conforme a projeção futura.
        </p>
      </div>

      {/* Alcance da alteração */}
      <div className="space-y-2 p-4 bg-primary/5 rounded-2xl border border-primary/20">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 rounded-lg bg-primary text-primary-foreground">
            <RotateCw className="w-3 h-3" />
          </div>
          <Label className="text-xs font-black uppercase tracking-widest text-primary">
            A partir de quando?
          </Label>
        </div>
        <select
          className="h-11 w-full rounded-xl border-2 border-primary/20 bg-background px-3 text-xs font-bold focus:ring-2 focus:ring-primary outline-none transition-all cursor-pointer hover:border-primary/40"
          value={applyScope}
          onChange={(e) => setApplyScope(e.target.value as 'this' | 'future' | 'all')}
        >
          <option value="this">Somente este mês</option>
          <option value="future">Este mês e todos os futuros</option>
          <option value="all">Todo o histórico (inclui meses anteriores não pagos)</option>
        </select>
        <p className="text-[11px] text-primary/60 font-medium leading-tight px-1">
          {applyScope === 'this' && 'Apenas este lançamento será alterado. Os demais permanecem intactos.'}
          {applyScope === 'future' && 'Este e todos os próximos meses receberão o novo valor/data.'}
          {applyScope === 'all' && '⚠️ Atenção: altera todo o grupo, inclusive meses não pagos anteriores.'}
        </p>
      </div>

      {/* Ações */}
      <div className="flex gap-3 pt-1">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="flex-1 h-12 rounded-2xl font-bold"
          disabled={isSaving}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isSaving}
          className="flex-1 h-12 rounded-2xl font-black shadow-lg shadow-primary/20"
        >
          {isSaving ? (
            <><Loader2 className="w-4 h-4 animate-spin mr-2" />Salvando...</>
          ) : (
            'Confirmar Alteração'
          )}
        </Button>
      </div>
    </form>
  );
}

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Transaction } from '@/types/finance';
import { RotateCw, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseLocalDate } from '@/utils/dateUtils';
import { useFinanceStore } from '@/hooks/useFinanceStore';
import { CategoryPickerPopover } from '@/components/ui/CategoryPickerPopover';

interface EditBillFormProps {
  bill: Transaction;
  onClose: () => void;
  onSave: (
    updates: { amount?: number; date?: string; description?: string; categoryId?: string | null; subcategoryId?: string | null },
    applyScope: 'this' | 'future' | 'all',
    realId: string,
    referenceDate: string
  ) => Promise<void>;
}

export function EditBillForm({ bill, onClose, onSave }: EditBillFormProps) {
  const { categories, subcategories } = useFinanceStore();
  const [description, setDescription] = useState(bill.description ?? '');
  const [categoryId, setCategoryId] = useState<string | null>(bill.categoryId ?? null);
  const [subcategoryId, setSubcategoryId] = useState<string | null>(
    bill.subcategoryId ?? (bill as any).subcategory_id ?? null
  );
  const [amount, setAmount] = useState(bill.amount.toFixed(2));
  const [date, setDate] = useState(bill.date?.slice(0, 10) ?? '');
  const [applyScope, setApplyScope] = useState<'this' | 'future' | 'all'>('future');
  const [isSaving, setIsSaving] = useState(false);

  // Preservamos o ID exato (mesmo que seja virtual) para que o backend/mutações consigam detectar e desmembrar
  const idToUpdate = bill.id;
  const initialSubcategoryId = bill.subcategoryId ?? (bill as any).subcategory_id ?? null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) return;

    const updates: { amount?: number; date?: string; description?: string; categoryId?: string | null; subcategoryId?: string | null } = {};

    // Só envia o campo se mudou
    if (parsedAmount !== bill.amount) updates.amount = parsedAmount;
    if (date && date !== bill.date?.slice(0, 10)) updates.date = date;
    if (description && description !== bill.description) updates.description = description;
    if (categoryId !== bill.categoryId) updates.categoryId = categoryId;
    if (subcategoryId !== initialSubcategoryId) updates.subcategoryId = subcategoryId;

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

      {/* Nome */}
      <div className="space-y-1">
        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          Nome da Conta
        </Label>
        <Input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="h-10 rounded-xl border-2 font-bold"
          required
        />
      </div>

      {/* Categoria */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Categoria
          </Label>
          {categoryId && (
            <button
              type="button"
              onClick={() => { setCategoryId(null); setSubcategoryId(null); }}
              className="text-[10px] font-bold text-muted-foreground hover:text-danger transition-colors"
            >
              Remover categoria
            </button>
          )}
        </div>
        <CategoryPickerPopover
          categories={categories}
          subcategories={subcategories}
          type={bill.type}
          categoryId={categoryId}
          subcategoryId={subcategoryId}
          onSelect={(newCategoryId, newSubcategoryId) => {
            setCategoryId(newCategoryId);
            setSubcategoryId(newSubcategoryId);
          }}
        />
      </div>

      {/* Valor */}
      <div className="space-y-1">
        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          Novo Valor (R$)
        </Label>
        <Input
          type="number"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="h-10 rounded-xl border-2 font-black text-lg"
          required
        />
      </div>

      {/* Data de vencimento */}
      <div className="space-y-1">
        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          Nova Data
        </Label>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-10 rounded-xl border-2 font-bold"
        />
      </div>

      {/* Alcance da alteração */}
      <div className="space-y-2 p-3 bg-primary/5 rounded-xl border border-primary/20">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1 rounded-lg bg-primary text-primary-foreground">
            <RotateCw className="w-3 h-3" />
          </div>
          <Label className="text-[10px] font-black uppercase tracking-widest text-primary">
            A partir de quando?
          </Label>
        </div>
        <select
          className="h-10 w-full rounded-xl border-2 border-primary/20 bg-background px-3 text-xs font-bold focus:ring-2 focus:ring-primary outline-none transition-all cursor-pointer hover:border-primary/40"
          value={applyScope}
          onChange={(e) => setApplyScope(e.target.value as 'this' | 'future' | 'all')}
        >
          <option value="this">Somente este mês</option>
          <option value="future">Este mês e todos os futuros</option>
          <option value="all">Todo o histórico</option>
        </select>
      </div>

      {/* Ações */}
      <div className="flex gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="flex-1 h-10 rounded-xl font-bold"
          disabled={isSaving}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isSaving}
          className="flex-1 h-10 rounded-xl font-black shadow-md shadow-primary/20"
        >
          {isSaving ? (
            <><Loader2 className="w-4 h-4 animate-spin mr-2" />Salvando...</>
          ) : (
            'Confirmar'
          )}
        </Button>
      </div>
    </form>
  );
}

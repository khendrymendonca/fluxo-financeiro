import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tags, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Category, Subcategory, Transaction } from '@/types/finance';
import { CategoryPickerPopover } from '@/components/ui/CategoryPickerPopover';

interface BulkCategoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (categoryId: string, subcategoryId: string | null) => Promise<void>;
  selectedTransactions: Transaction[];
  categories: Category[];
  subcategories: Subcategory[];
  isPending?: boolean;
}

export function BulkCategoryDialog({
  isOpen,
  onClose,
  onConfirm,
  selectedTransactions,
  categories,
  subcategories,
  isPending = false,
}: BulkCategoryDialogProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | null>(null);

  const selectedCount = selectedTransactions.length;

  const hasInstallments = useMemo(() => {
    return selectedTransactions.some(t => Boolean(t.installmentGroupId || (t as any).installment_group_id));
  }, [selectedTransactions]);

  const hasRecurring = useMemo(() => {
    return selectedTransactions.some(t => Boolean(t.isRecurring || (t as any).is_recurring || t.originalId));
  }, [selectedTransactions]);

  // Se todos forem despesa, sugerimos despesa; se todos forem receita, receita.
  const targetType = useMemo(() => {
    if (selectedTransactions.length === 0) return undefined;
    const firstType = selectedTransactions[0].type;
    const allSame = selectedTransactions.every(t => t.type === firstType);
    return allSame ? firstType : undefined;
  }, [selectedTransactions]);

  const handleConfirm = async () => {
    if (!selectedCategoryId) return;
    await onConfirm(selectedCategoryId, selectedSubcategoryId);
    onClose();
    setSelectedCategoryId(null);
    setSelectedSubcategoryId(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[460px] p-6 rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Tags className="w-4 h-4" />
            </div>
            Alterar Categoria
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Defina a nova categoria para os <strong className="text-foreground">{selectedCount}</strong> lançamentos selecionados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          {(hasInstallments || hasRecurring) && (
            <Alert className="bg-primary/5 border-primary/20 text-xs leading-relaxed">
              <AlertCircle className="h-4 w-4 text-primary shrink-0" />
              <AlertTitle className="text-xs font-semibold text-primary">Sincronização com Contas Recorrentes</AlertTitle>
              <AlertDescription className="text-muted-foreground mt-1">
                Sua seleção possui lançamentos parcelados ou recorrentes. Ao atualizar, todas as parcelas e projeções vinculadas serão alinhadas para manter a coerência contábil.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Nova Categoria e Subcategoria
            </Label>
            <CategoryPickerPopover
              categories={categories}
              subcategories={subcategories}
              type={targetType}
              categoryId={selectedCategoryId}
              subcategoryId={selectedSubcategoryId}
              onSelect={(catId, subId) => {
                setSelectedCategoryId(catId);
                setSelectedSubcategoryId(subId);
              }}
              placeholder="Selecione a categoria de destino..."
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 mt-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isPending}
            className="rounded-xl font-bold"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isPending || !selectedCategoryId}
            className="rounded-xl font-bold gap-2"
          >
            {isPending ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

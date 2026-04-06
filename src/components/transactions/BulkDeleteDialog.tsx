import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { AlertCircle, Trash2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface BulkDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (options: { installmentScope: 'this' | 'future' | 'all', deleteFutureBills: boolean }) => void;
  selectedCount: number;
  hasInstallments: boolean;
  hasRecurring: boolean;
  isPending?: boolean;
}

export function BulkDeleteDialog({
  isOpen,
  onClose,
  onConfirm,
  selectedCount,
  hasInstallments,
  hasRecurring,
  isPending = false
}: BulkDeleteDialogProps) {
  const [installmentScope, setInstallmentScope] = useState<'this' | 'future' | 'all'>('this');
  const [deleteFutureBills, setDeleteFutureBills] = useState(false);

  const handleConfirm = () => {
    onConfirm({ installmentScope, deleteFutureBills });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="w-5 h-5" />
            Remover {selectedCount} lançamento{selectedCount > 1 ? 's' : ''}
          </DialogTitle>
          <DialogDescription>
            Esta ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {(hasInstallments || hasRecurring) && (
            <Alert variant="destructive" className="bg-destructive/5 border-destructive/20">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Atenção</AlertTitle>
              <AlertDescription>
                Sua seleção contém itens parcelados ou recorrentes. Como deseja tratá-los?
              </AlertDescription>
            </Alert>
          )}

          {hasInstallments && (
            <div className="space-y-3">
              <Label className="text-base font-semibold">Para lançamentos parcelados:</Label>
              <RadioGroup 
                value={installmentScope} 
                onValueChange={(v: any) => setInstallmentScope(v)}
                className="flex flex-col gap-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="this" id="this" />
                  <Label htmlFor="this" className="font-normal cursor-pointer">Apenas a parcela selecionada</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="future" id="future" />
                  <Label htmlFor="future" className="font-normal cursor-pointer">Esta parcela e todas as futuras</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="all" />
                  <Label htmlFor="all" className="font-normal cursor-pointer">Todas as parcelas do grupo</Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {hasRecurring && (
            <div className="space-y-3 pt-2">
              <Label className="text-base font-semibold">Para contas fixas/recorrentes:</Label>
              <RadioGroup 
                value={deleteFutureBills ? "future" : "this"} 
                onValueChange={(v) => setDeleteFutureBills(v === "future")}
                className="flex flex-col gap-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="this" id="bill-this" />
                  <Label htmlFor="bill-this" className="font-normal cursor-pointer">Apenas este mês</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="future" id="bill-future" />
                  <Label htmlFor="bill-future" className="font-normal cursor-pointer">Este e todos os meses futuros</Label>
                </div>
              </RadioGroup>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancelar</Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={isPending}>
            {isPending ? 'Removendo...' : (hasRecurring && deleteFutureBills) || (hasInstallments && installmentScope !== 'this') ? 'Remover Tudo' : 'Remover'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

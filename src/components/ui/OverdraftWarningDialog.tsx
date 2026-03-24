import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ShieldCheck, AlertTriangle } from "lucide-react";

interface OverdraftWarningDialogProps {
    isOpen: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    amountUsedFromLimit: number;
    accountName: string;
}

export function OverdraftWarningDialog({
    isOpen,
    onConfirm,
    onCancel,
    amountUsedFromLimit,
    accountName,
}: OverdraftWarningDialogProps) {
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(value);
    };

    return (
        <AlertDialog open={isOpen}>
            <AlertDialogContent className="border-warning/50 bg-warning/5">
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2 text-warning">
                        <AlertTriangle className="w-5 h-5" />
                        Uso do Limite da Conta
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-foreground/80 pt-2 text-base">
                        O saldo atual da conta <strong className="text-foreground">{accountName}</strong> não é suficiente para esta transação.
                        <div className="mt-4 p-3 rounded-lg bg-warning/10 border border-warning/20 flex items-start gap-3">
                            <ShieldCheck className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                            <p>
                                Aproximadamente <strong className="text-xl text-warning block mt-1">{formatCurrency(amountUsedFromLimit)}</strong> serão descontados do seu limite de Cheque Especial habilitado.
                            </p>
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-6">
                    <AlertDialogCancel onClick={onCancel} className="hover:bg-muted font-medium">
                        Cancelar
                    </AlertDialogCancel>
                    <AlertDialogAction onClick={onConfirm} className="bg-warning hover:bg-warning/90 text-warning-foreground font-black uppercase tracking-wider">
                        Confirmar Pagamento
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}



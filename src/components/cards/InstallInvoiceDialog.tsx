import React, { useState } from 'react';
import {
    X,
    Banknote,
    CreditCard as CardIcon,
    Loader2,
    ListOrdered
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFinanceStore } from '@/hooks/useFinanceStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/utils/formatters';
import { cn } from '@/lib/utils';
import { CreditCard } from '@/types/finance';
import { format, addMonths } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface InstallInvoiceDialogProps {
    card: CreditCard;
    currentInvoiceAmount: number;
    invoiceMonthYear: string;
    isOpen: boolean;
    onClose: () => void;
}

export function InstallInvoiceDialog({ card, currentInvoiceAmount, invoiceMonthYear, isOpen, onClose }: InstallInvoiceDialogProps) {
    const { user } = useAuth();
    const { categories } = useFinanceStore();
    const queryClient = useQueryClient();

    const [downPayment, setDownPayment] = useState<string>(''); // entrada
    const [installmentAmount, setInstallmentAmount] = useState<string>(''); // valor da parcela
    const [totalInstallments, setTotalInstallments] = useState<string>('2'); // numero parcelas

    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const getRemainingAmount = () => {
        const down = parseFloat(downPayment) || 0;
        return Math.max(0, currentInvoiceAmount - down);
    };

    const handleConfirm = async () => {
        if (!user) return;

        const down = parseFloat(downPayment) || 0;
        const instAmount = parseFloat(installmentAmount);
        const numInstallments = parseInt(totalInstallments);

        if (isNaN(instAmount) || isNaN(numInstallments) || numInstallments < 2) {
            toast({ title: 'Preencha todos os campos corretamente.', variant: 'destructive' });
            return;
        }

        setIsSubmitting(true);
        try {
            const today = format(new Date(), 'yyyy-MM-dd');

            const [yearStr, monthStr] = invoiceMonthYear.split('-');
            // O mês no JS Date é 0-indexed. parseInt('04') -> 4. month=4 -> index 3.
            const mesDaFatura = new Date(parseInt(yearStr), parseInt(monthStr) - 1, card.dueDay);
            const startParcelaDate = addMonths(mesDaFatura, 1);
            const startParcelaStr = format(startParcelaDate, 'yyyy-MM-dd');

            // PASSO 1: Pagamento da Entrada
            if (down > 0) {
                const { error: txError } = await supabase.from('transactions').insert({
                    user_id: user.id,
                    type: 'expense',
                    transaction_type: 'punctual',
                    description: `Pagamento parcial fatura ${card.name}`,
                    amount: down,
                    date: today,
                    card_id: card.id,
                    is_invoice_payment: true,
                    invoice_month_year: invoiceMonthYear,
                    is_paid: true,
                    payment_date: today,
                });
                if (txError) throw txError;
            }

            // PASSO 2: Criar Acordo (Invoice Installment)
            const { data: debtData, error: debtError } = await supabase.from('debts').insert({
                user_id: user.id,
                name: `Fatura parcelada ${card.name} ${invoiceMonthYear}`,
                total_amount: instAmount * numInstallments,
                remaining_amount: instAmount * numInstallments,
                installment_amount: instAmount,
                interest_rate_monthly: 0,
                due_day: card.dueDay,
                status: 'renegotiated',
                total_installments: numInstallments,
                card_id: card.id,
                debt_type: 'invoice_installment',
                start_date: startParcelaStr,
            }).select().single();

            if (debtError) throw debtError;

            // PASSO 3: Gerar as parcelas como transações para a fatura do cartão
            const groupId = crypto.randomUUID();
            const categoryId = categories.find(c => c.name === 'Metas/Acordos' || c.name === 'Renegociação')?.id;

            const installmentsData = [];
            for (let i = 0; i < numInstallments; i++) {
                const dt = addMonths(startParcelaDate, i);
                installmentsData.push({
                    user_id: user.id,
                    type: 'expense',
                    transaction_type: 'installment',
                    description: `Parcela fatura ${card.name} (${i + 1}/${numInstallments})`,
                    amount: instAmount,
                    date: format(dt, 'yyyy-MM-dd'),
                    card_id: card.id,
                    debt_id: debtData.id,
                    category_id: categoryId,
                    is_paid: false,
                    installment_group_id: groupId,
                    installment_number: i + 1,
                    installment_total: numInstallments,
                });
            }

            const { error: instError } = await supabase.from('transactions').insert(installmentsData);
            if (instError) throw instError;

            // Invalidar
            await queryClient.invalidateQueries({ queryKey: ['transactions'] });
            await queryClient.invalidateQueries({ queryKey: ['debts'] });
            await queryClient.invalidateQueries({ queryKey: ['credit-cards'] });

            toast({ title: 'Fatura parcelada com sucesso!' });
            onClose();

        } catch (error) {
            console.error(error);
            toast({ title: 'Erro ao parcelar fatura.', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const isFormValid = parseFloat(downPayment) >= 0 || downPayment === '' ? (parseFloat(installmentAmount) > 0 && parseInt(totalInstallments) >= 2) : false;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/20 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-zinc-950 rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-zinc-100 dark:border-zinc-900 animate-in zoom-in-95 duration-300 overflow-y-auto max-h-[90vh] no-scrollbar">

                {/* Header */}
                <div className="px-8 pt-8 pb-4 flex items-center justify-between sticky top-0 bg-white dark:bg-zinc-950 z-20">
                    <div>
                        <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 italic">Parcelar Fatura</h2>
                        <p className="text-xs uppercase font-black tracking-[0.2em] text-zinc-400 mt-1">Negociação de Cartão</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors text-zinc-400"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="px-8 pb-8 space-y-6">

                    {/* Identidade do Cartão */}
                    <div
                        className="p-6 rounded-[2rem] relative overflow-hidden shadow-inner border border-white/10"
                        style={{ backgroundColor: card.color || '#27272a' }}
                    >
                        <div className="relative z-10 flex flex-col justify-between h-20 text-white">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-widest opacity-60">Fatura {invoiceMonthYear}</p>
                                    <p className="font-bold text-lg">{card.name}</p>
                                </div>
                                <CardIcon className="w-6 h-6 opacity-40" />
                            </div>
                            <div className="flex justify-between items-end">
                                <p className="font-black text-2xl tabular-nums">{formatCurrency(currentInvoiceAmount)}</p>
                            </div>
                        </div>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl" />
                    </div>

                    <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                        <p className="text-xs text-primary font-semibold text-center italic">Informe abaixo exatamente como o banco calculou no app. Não calculamos juros automaticamente.</p>
                    </div>

                    {/* Form */}
                    <div className="space-y-5">
                        <div className="space-y-2">
                            <Label className="text-xs font-black uppercase tracking-widest text-zinc-400 ml-1">Valor da Entrada (opcional)</Label>
                            <div className="relative">
                                <Banknote className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-300" />
                                <Input
                                    type="number"
                                    value={downPayment}
                                    onChange={(e) => setDownPayment(e.target.value)}
                                    placeholder="Ex: 500,00"
                                    className="h-14 pl-12 rounded-2xl border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/30 font-bold text-lg focus:ring-zinc-200 transition-all"
                                />
                            </div>
                            <div className="flex justify-between px-2 pt-1 text-xs font-black tracking-widest uppercase">
                                <span className="text-zinc-400">A base do banco pode ter juros</span>
                                <span className="text-zinc-600 dark:text-zinc-300 min-w-max ml-2">Restante a parcelar: {formatCurrency(getRemainingAmount())}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-black uppercase tracking-widest text-zinc-400 ml-1">Valor da Parcela</Label>
                                <div className="relative">
                                    <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
                                    <Input
                                        type="number"
                                        value={installmentAmount}
                                        onChange={(e) => setInstallmentAmount(e.target.value)}
                                        placeholder="250,00"
                                        className="h-12 pl-9 rounded-xl border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/30 font-bold text-sm"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-black uppercase tracking-widest text-zinc-400 ml-1">Nº Parcelas</Label>
                                <div className="relative">
                                    <ListOrdered className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
                                    <Input
                                        type="number"
                                        value={totalInstallments}
                                        min={2}
                                        onChange={(e) => setTotalInstallments(e.target.value)}
                                        className="h-12 pl-9 rounded-xl border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/30 font-bold text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Footer */}
                    <div className="pt-4 flex flex-col gap-3">
                        <Button
                            onClick={handleConfirm}
                            disabled={isSubmitting || !isFormValid}
                            className={cn(
                                "h-16 rounded-[1.5rem] font-black uppercase tracking-widest transition-all text-sm",
                                "bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white",
                                "shadow-xl shadow-zinc-200 dark:shadow-none active:scale-[0.98]"
                            )}
                        >
                            {isSubmitting ? (
                                <Loader2 className="w-6 h-6 animate-spin" />
                            ) : (
                                <>Confirmar Parcelamento</>
                            )}
                        </Button>

                        <button
                            onClick={onClose}
                            className="h-12 text-xs font-black uppercase tracking-[0.2em] text-zinc-400 hover:text-zinc-600 transition-colors"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

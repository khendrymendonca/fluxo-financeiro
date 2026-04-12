import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useFinanceStore } from "@/hooks/useFinanceStore";
import { useAddTransaction, useUpdateTransaction, useBulkUpdateTransactions } from "@/hooks/useTransactionMutations";
import { CreditCardVisual } from "@/components/cards/CreditCardVisual";
import { AddCardDialog } from "@/components/cards/AddCardDialog";
import { EditCardDialog } from "@/components/cards/EditCardDialog";
import { AnticipateInstallmentsDialog } from "@/components/cards/AnticipateInstallmentsDialog";
import { AnticipatePaymentDialog } from "@/components/cards/AnticipatePaymentDialog";
import { InstallInvoiceDialog } from "@/components/cards/InstallInvoiceDialog";
import { Button } from "@/components/ui/button";
import { Portal } from "@/components/ui/Portal";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus, Receipt, Calendar, CreditCard, Pencil, Download,
  ChevronLeft, ChevronRight, Search, TrendingUp, TrendingDown,
  AlertCircle, CheckCircle2, Clock, XCircle, Check
} from "lucide-react";
import { parseLocalDate, todayLocalString } from "@/utils/dateUtils";
import { cn } from "@/lib/utils";
import { format, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getCardSettingsForDate, getInvoiceStatusDisplay } from "@/utils/creditCardUtils";
import { Transaction } from "@/types/finance";
import { PageHeader } from "@/components/ui/PageHeader";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const MONTHS_CHART = 6;

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#18181f] border border-white/10 rounded-xl px-4 py-2 shadow-2xl">
      <p className="text-xs text-zinc-400 uppercase tracking-widest font-bold mb-1">{label}</p>
      <p className="text-base font-black text-[#00d4aa]">{fmtBRL(payload[0].value)}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: ReturnType<typeof getInvoiceStatusDisplay> | null }) {
  if (!status) return null;
  const icons: Record<string, React.ReactNode> = {
    "text-emerald-400": <CheckCircle2 className="w-3 h-3" />,
    "text-rose-400": <AlertCircle className="w-3 h-3" />,
    "text-amber-400": <Clock className="w-3 h-3" />,
    "text-zinc-400": <XCircle className="w-3 h-3" />,
  };
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest border",
      status.color,
      "bg-white/5 border-current/20"
    )}>
      {icons[status.color] ?? null}
      {status.text}
    </span>
  );
}

export default function CardsDashboard() {
  const queryClient = useQueryClient();
  const {
    creditCards, transactions, accounts, categories,
    updateCreditCard, addCreditCard, getCardUsedLimit,
    viewDate, setViewDate
  } = useFinanceStore();

  const { mutateAsync: addTransaction } = useAddTransaction();
  const { mutateAsync: updateTransaction } = useUpdateTransaction();
  const { mutateAsync: bulkUpdateTransactions } = useBulkUpdateTransactions();

  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  const sortedCards = useMemo(
    () => [...creditCards].sort((a, b) => a.id.localeCompare(b.id)),
    [creditCards]
  );

  const [showAddCard, setShowAddCard] = useState(false);
  const [showEditCard, setShowEditCard] = useState(false);
  const [showPayInvoice, setShowPayInvoice] = useState(false);
  const [showAnticipatePayment, setShowAnticipatePayment] = useState(false);
  const [showInstallInvoice, setShowInstallInvoice] = useState(false);
  const [selectedCardForAnticipation, setSelectedCardForAnticipation] = useState<any>(null);

  // Pay Invoice State
  const [payInvoiceAccountId, setPayInvoiceAccountId] = useState<string>("");
  const [payInvoiceAmount, setPayInvoiceAmount] = useState<string>("");
  const [payInvoiceDate, setPayInvoiceDate] = useState<string>(todayLocalString());
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [chartPeriod, setChartPeriod] = useState<"mensal" | "anual">("mensal");
  const [transactionToAnticipate, setTransactionToAnticipate] = useState<Transaction | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sortedCards.length > 0 && !selectedCardId) {
      setSelectedCardId(sortedCards[0].id);
    }
  }, [sortedCards, selectedCardId]);

  const selectedCard = useMemo(
    () => creditCards.find((c) => c.id === selectedCardId) ?? null,
    [creditCards, selectedCardId]
  );

  const currentInvoiceTransactions = useMemo(() => {
    if (!selectedCardId || !selectedCard) return [];
    const viewDateStr = format(viewDate, "yyyy-MM");
    const closingDay = getCardSettingsForDate(selectedCard, viewDate).closingDay;
    const viewYear = viewDate.getFullYear();
    const viewMonth = viewDate.getMonth();
    const endInv = new Date(viewYear, viewMonth, Number(closingDay), 23, 59, 59);
    const startInv = new Date(viewYear, viewMonth - 1, Number(closingDay) + 1, 0, 0, 0);
    return transactions
      .filter((t) => {
        if (t.cardId !== selectedCardId) return false;
        // 🛡️ REGRA DE ABATIMENTO: Só excluímos pagamentos de fatura se forem DESPESAS (saída de dinheiro).
        // Estornos e abatimentos (RECEITA) devem ser mantidos para reduzir o total da fatura.
        if (t.isInvoicePayment && t.type === 'expense') return false;
        if (t.isVirtual) return false;
        if (t.invoiceMonthYear) return t.invoiceMonthYear === viewDateStr;
        const tDate = parseLocalDate(t.date);
        return tDate >= startInv && tDate <= endInv;
      })
      .sort((a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime());
  }, [selectedCardId, selectedCard, viewDate, transactions]);

  const currentInvoiceTotal = useMemo(
    () => currentInvoiceTransactions.reduce(
      (s, t) => s + (t.type === "income" ? -t.amount : t.amount), 0
    ),
    [currentInvoiceTransactions]
  );

  const stats = useMemo(() => {
    if (!selectedCardId || !selectedCard) return { used: 0, available: 0, limit: 0, percentUsed: 0 };
    const limit = Number(selectedCard.limit ?? 0);
    const used = getCardUsedLimit(selectedCardId);
    const available = Math.max(0, limit - used);
    const percentUsed = limit > 0 ? (used / limit) * 100 : 0;
    return { used, available, limit, percentUsed };
  }, [selectedCardId, selectedCard, getCardUsedLimit]);

  const dynamicStatus = useMemo(() => {
    if (!selectedCard || !selectedCardId) return null;
    const viewDateStr = format(viewDate, "yyyy-MM");
    const isPaid = transactions.some(
      (t) => t.cardId === selectedCardId && t.isInvoicePayment && t.invoiceMonthYear === viewDateStr
    );
    return getInvoiceStatusDisplay(selectedCard, viewDate, isPaid, currentInvoiceTotal);
  }, [selectedCard, selectedCardId, viewDate, transactions, currentInvoiceTotal]);

  const chartData = useMemo(() => {
    if (!selectedCardId || !selectedCard) return [];
    const n = chartPeriod === "mensal" ? MONTHS_CHART : 12;
    return Array.from({ length: n }, (_, i) => {
      const d = subMonths(viewDate, n - 1 - i);
      const label = format(d, "MMM", { locale: ptBR });
      const mStr = format(d, "yyyy-MM");

      const total = transactions
        .filter((t) => {
          // 🛡️ REGRA DE ABATIMENTO: Só excluímos se for PAGAMENTO real (despesa), não estorno/abatimento (income)
          if (t.cardId !== selectedCardId || t.isVirtual || (t.isInvoicePayment && t.type === 'expense')) return false;
          // 🛡️ REGRA DE COMPETÊNCIA: Filtra pela data da transação (date) e não pela fatura (invoiceMonthYear)
          const tDateStr = t.date.slice(0, 7); // Pega 'YYYY-MM' da string ISO
          return tDateStr === mStr;
        })
        .reduce((s, t) => s + (t.type === "income" ? -t.amount : t.amount), 0);
      return { label, total: Math.max(0, total) };
    });
  }, [selectedCardId, selectedCard, viewDate, transactions, chartPeriod]);

  const filteredTransactions = useMemo(
    () => currentInvoiceTransactions.filter((t) =>
      t.description.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [currentInvoiceTransactions, searchQuery]
  );

  const handleConfirmPayment = async () => {
    if (!selectedCard || !payInvoiceAccountId || !payInvoiceAmount) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }

    const valorPago = parseFloat(payInvoiceAmount);
    const totalFatura = currentInvoiceTotal;

    if (isNaN(valorPago) || valorPago <= 0) {
      toast({ title: "Valor pago inválido", variant: "destructive" });
      return;
    }

    if (valorPago > totalFatura) {
      toast({ title: "O valor pago não pode ser maior que o total da fatura", variant: "destructive" });
      return;
    }

    setIsProcessingPayment(true);
    const viewDateStr = format(viewDate, "yyyy-MM");
    const isParcial = valorPago < totalFatura;
    const saldoRestante = totalFatura - valorPago;

    try {
      // 1. Criar transação de pagamento (BAIXA)
      await addTransaction({
        description: `Pagamento Fatura ${selectedCard.name} ${format(viewDate, 'MMM/yy', { locale: ptBR })}`,
        amount: valorPago,
        type: 'expense',
        transactionType: 'punctual',
        is_invoice_payment: true,
        accountId: payInvoiceAccountId,
        cardId: selectedCard.id,
        invoiceMonthYear: viewDateStr,
        isPaid: true,
        date: parseLocalDate(payInvoiceDate).toISOString(),
        paymentDate: payInvoiceDate
      } as any);

      // 2. Se parcial, criar saldo remanescente para o mês seguinte
      if (isParcial) {
        const nextInvoiceMonthYear = format(addMonths(viewDate, 1), 'yyyy-MM');

        // 🛡️ DEDUPLICAÇÃO: Buscar remainders existentes para este cartão no mesmo mês de fatura
        const { data: existingRemainders } = await supabase
          .from('transactions')
          .select('id')
          .eq('card_id', selectedCard.id)
          .eq('transaction_type', 'invoiceremainder')
          .eq('invoice_month_year', nextInvoiceMonthYear)
          .is('deleted_at', null);

        // Soft delete dos remainders existentes (padrão obrigatório do sistema)
        if (existingRemainders && existingRemainders.length > 0) {
          await supabase
            .from('transactions')
            .update({ deleted_at: new Date().toISOString() })
            .in('id', existingRemainders.map(r => r.id));
        }

        await addTransaction({
          description: `Saldo Fatura ${selectedCard.name} ${format(viewDate, 'MMM/yy', { locale: ptBR })}`,
          amount: saldoRestante,
          type: 'expense',
          transactionType: 'invoiceremainder',
          is_invoice_payment: false,
          accountId: null,
          cardId: selectedCard.id,
          invoiceMonthYear: nextInvoiceMonthYear,
          isPaid: false,
          date: format(addMonths(parseLocalDate(payInvoiceDate), 1), 'yyyy-MM-dd')
        } as any);
      }

      // 3. Atualizar compras originais
      if (!isParcial) {
        // Pagamento TOTAL: marcar tudo como pago
        const ids = currentInvoiceTransactions.map(t => t.id);
        if (ids.length > 0) {
          await bulkUpdateTransactions({ ids, updates: { isPaid: true, paymentDate: payInvoiceDate } });
        }
      }

      // 4. Finalizar
      await queryClient.invalidateQueries({ queryKey: ['transactions'] });
      await queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
      await queryClient.invalidateQueries({ queryKey: ['accounts'] });

      setShowPayInvoice(false);
      setPayInvoiceAccountId("");
      setPayInvoiceAmount("");
      toast({ title: "Pagamento registrado com sucesso!" });
    } catch (error) {
      console.error("Erro ao pagar fatura:", error);
      toast({ title: "Erro ao processar pagamento", variant: "destructive" });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleExport = useCallback(() => {
    const header = "Data,Descrição,Categoria,Valor\n";
    const rows = currentInvoiceTransactions.map((t) => {
      const cat = categories.find((c) => c.id === t.categoryId)?.name ?? "";
      const val = (t.type === "income" ? -t.amount : t.amount).toFixed(2).replace(".", ",");
      return `${t.date},"${t.description}","${cat}",${val}`;
    });
    const csv = header + rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fatura-${selectedCard?.name ?? "cartao"}-${format(viewDate, "yyyy-MM")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [currentInvoiceTransactions, categories, selectedCard, viewDate]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const containerCenter = container.scrollLeft + container.clientWidth / 2;
    let closestIndex = 0;
    let minDistance = Infinity;

    Array.from(container.children).forEach((child, index) => {
      const el = child as HTMLElement;
      // offsetLeft relativo ao container scrollable
      const childCenter = el.offsetLeft + el.offsetWidth / 2 - container.offsetLeft;
      const distance = Math.abs(container.scrollLeft + container.clientWidth / 2 - (el.offsetLeft + el.offsetWidth / 2));
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });

    if (sortedCards[closestIndex] && sortedCards[closestIndex].id !== selectedCardId) {
      setSelectedCardId(sortedCards[closestIndex].id);
    }
  };

  // ── helpers reutilizados na lista de cartões ────────────────────────────────
  const getCardInvoiceStatus = (cardId: string) => {
    const card = creditCards.find((c) => c.id === cardId);
    if (!card) return null;
    const viewDateStr = format(viewDate, "yyyy-MM");
    const isPaid = transactions.some(
      (t) => t.cardId === cardId && t.isInvoicePayment && t.invoiceMonthYear === viewDateStr
    );
    const total = transactions
      .filter((t) => {
        if (t.cardId !== cardId || t.isVirtual) return false;
        // 🛡️ REGRA DE ABATIMENTO: Só excluímos se for PAGAMENTO real (despesa), não estorno/abatimento (income)
        if (t.isInvoicePayment && t.type === 'expense') return false;
        return t.invoiceMonthYear === viewDateStr;
      })
      .reduce((s, t) => s + (t.type === "income" ? -t.amount : t.amount), 0);
    return getInvoiceStatusDisplay(card, viewDate, isPaid, total);
  };

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-in pb-24 w-full pt-2 max-w-7xl mx-auto">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="px-4 md:px-8">
        <PageHeader title="Meus Cartões" icon={CreditCard}>
          <Button
            variant="outline" size="sm"
            className="hidden md:flex rounded-xl border-primary/20 gap-2 font-bold uppercase text-xs tracking-widest h-10 px-4"
            onClick={() => setShowAddCard(true)}
          >
            <Plus className="w-4 h-4 text-primary" /> Novo Cartão
          </Button>
        </PageHeader>
        <Button
          variant="outline"
          className="md:hidden w-full rounded-xl border-primary/20 gap-2 font-bold uppercase text-xs tracking-widest h-12 mt-2 mb-4"
          onClick={() => setShowAddCard(true)}
        >
          <Plus className="w-4 h-4 text-primary" /> Novo Cartão
        </Button>
      </div>

      {/* ── Sem cartões ────────────────────────────────────────────────────── */}
      {sortedCards.length === 0 && (
        <div className="mx-4 p-12 text-center text-muted-foreground bg-muted/10 border-dashed border-2 border-white/10 rounded-3xl">
          <CreditCard className="w-16 h-16 mx-auto mb-4 opacity-10" />
          <p className="text-xl font-bold">Nenhum cartão ativo.</p>
          <Button variant="ghost" className="mt-4" onClick={() => setShowAddCard(true)}>
            Começar agora
          </Button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          DESKTOP — Master-Detail (lg+)
      ══════════════════════════════════════════════════════════════════════ */}
      {sortedCards.length > 0 && (
        <div className="hidden lg:grid lg:grid-cols-12 gap-0 items-start">

          {/* Coluna esquerda — lista de cartões */}
          <div className="lg:col-span-4 flex flex-col gap-3 px-2 border-r border-border max-h-[calc(100vh-120px)] overflow-y-auto overflow-x-visible no-scrollbar">
            {sortedCards.map((card) => {
              const usedLimit = getCardUsedLimit(card.id);
              const availableLimit = Number(card.limit ?? 0) - usedLimit;
              const isSelected = selectedCardId === card.id;
              const invoiceStatus = getCardInvoiceStatus(card.id);
              return (
                <div
                  key={card.id}
                  onClick={() => setSelectedCardId(card.id)}
                  className={cn(
                    "px-2 py-1 transition-all duration-500 ease-out cursor-pointer rounded-2xl",
                    isSelected
                      ? "opacity-100 scale-100 shadow-2xl"
                      : "opacity-50 scale-[0.97] hover:opacity-75 hover:scale-[0.98]"
                  )}
                >
                  <CreditCardVisual
                    card={card}
                    usedLimit={usedLimit}
                    availableLimit={availableLimit}
                    isSelected={isSelected}
                    invoiceStatus={invoiceStatus}
                  />
                </div>
              );
            })}
          </div>

          {/* Coluna direita — detalhes */}
          <div className="lg:col-span-8 px-2 pr-4 space-y-5 max-h-[calc(100vh-120px)] overflow-y-auto no-scrollbar">
            {selectedCard && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-400 space-y-4">

                {/* Nav de mês + botões */}
                <div className="flex items-center justify-between z-20 relative">
                  <div className="flex items-center gap-1 bg-card border border-border rounded-xl px-2 py-1">
                    <button className="p-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground transition-all flex items-center justify-center w-8 h-8" onClick={() => setViewDate((d) => subMonths(d, 1))}>
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-black tracking-tight min-w-[118px] text-center capitalize text-foreground">
                      {format(viewDate, "MMMM yyyy", { locale: ptBR })}
                    </span>
                    <button className="p-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground transition-all flex items-center justify-center w-8 h-8" onClick={() => setViewDate((d) => addMonths(d, 1))}>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline" size="sm"
                      className="rounded-xl gap-2 font-bold text-xs uppercase tracking-widest h-9 px-3 border-white/10 hover:bg-white/5"
                      onClick={handleExport}
                    >
                      <Download className="w-3.5 h-3.5" /> Exportar
                    </Button>
                    <Button
                      variant="outline" size="sm"
                      className="rounded-xl gap-2 font-bold text-xs uppercase tracking-widest h-9 px-3 border-white/10 hover:bg-white/5"
                      onClick={() => setShowEditCard(true)}
                    >
                      <Pencil className="w-3.5 h-3.5" /> Editar
                    </Button>
                  </div>
                </div>

                {/* Hero da fatura */}
                <div className="bg-card border border-border rounded-2xl p-6 relative overflow-hidden">
                  <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full opacity-[0.06] blur-3xl pointer-events-none" style={{ background: selectedCard.color ?? '#00d4aa' }} />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-xs uppercase font-black text-muted-foreground tracking-[0.2em]">
                        Fatura · {format(viewDate, 'MMMM yyyy', { locale: ptBR })}
                      </p>
                      <StatusBadge status={dynamicStatus} />
                    </div>
                    <div className="flex items-end justify-between mb-4">
                      <h2 className="text-5xl lg:text-6xl font-black tracking-tighter tabular-nums text-foreground">
                        {fmtBRL(currentInvoiceTotal)}
                      </h2>
                      {dynamicStatus?.text !== 'Paga' && currentInvoiceTotal > 0 && (
                        <Button
                          onClick={() => {
                            setPayInvoiceAmount(currentInvoiceTotal.toFixed(2));
                            setShowPayInvoice(true);
                          }}
                          className="bg-[#00d4aa] hover:bg-[#00b894] text-[#0a0a0f] rounded-xl font-black uppercase text-xs tracking-widest px-6 h-11 shadow-lg shadow-[#00d4aa]/20 transition-all hover:scale-105 active:scale-95"
                        >
                          Pagar Fatura
                        </Button>
                      )}
                    </div>
                    <div className="flex items-center gap-6 text-[11px] font-semibold text-muted-foreground">
                      <span>Fecha <strong className="text-foreground">dia {selectedCard.closingDay}</strong></span>
                      <span>Vence <strong className="text-foreground">dia {selectedCard.dueDay}</strong></span>
                      <span>Limite <strong className="text-foreground">{fmtBRL(stats.limit)}</strong></span>
                    </div>
                    <div className="mt-4">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                        <span>{stats.percentUsed.toFixed(0)}% usado</span>
                        <span>{fmtBRL(stats.available)} disponível</span>
                      </div>
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full transition-all duration-700",
                          stats.percentUsed > 90 ? "bg-rose-400" :
                            stats.percentUsed > 70 ? "bg-amber-400" : "bg-emerald-400"
                        )} style={{ width: `${stats.percentUsed}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stats — 2 cards (sem Cashback) */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-card border border-border rounded-2xl p-5">
                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">Gastos</p>
                    <p className="text-2xl font-black tabular-nums text-foreground">{fmtBRL(currentInvoiceTotal)}</p>
                  </div>
                  <div className="bg-card border border-border rounded-2xl p-5 relative group">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">Disponível</p>
                        <p className="text-2xl font-black tabular-nums text-foreground">{fmtBRL(stats.available)}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowInstallInvoice(true)}
                          className="px-3 py-1.5 rounded-xl border border-border text-[11px] font-black uppercase tracking-widest text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all duration-300"
                        >
                          Parcelar
                        </button>
                        <button
                          onClick={() => setShowAnticipatePayment(true)}
                          className="px-3 py-1.5 rounded-xl border border-border text-[11px] font-black uppercase tracking-widest text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all duration-300"
                        >
                          Abater
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Gráfico de evolução */}
                <div className="bg-card border border-border rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <p className="text-sm font-black text-foreground">Evolução de Gastos</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Últimos {chartPeriod === "mensal" ? MONTHS_CHART : 12} meses
                      </p>
                    </div>
                    <div className="flex gap-1 bg-white/5 rounded-lg p-0.5">
                      {(["mensal", "anual"] as const).map((p) => (
                        <button
                          key={p}
                          onClick={() => setChartPeriod(p)}
                          className={cn(
                            "px-3 py-1 rounded-md text-xs font-black uppercase tracking-widest transition-all",
                            chartPeriod === p
                              ? "bg-[#00d4aa] text-[#0a0a0f]"
                              : "text-zinc-500 hover:text-zinc-300"
                          )}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%" minHeight={200}>
                      <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gradTeal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#00d4aa" stopOpacity={0.35} />
                            <stop offset="100%" stopColor="#00d4aa" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
                        <XAxis
                          dataKey="label"
                          tick={{ fill: "#71717a", fontSize: 10, fontWeight: 700 }}
                          axisLine={false} tickLine={false}
                        />
                        <YAxis
                          tick={{ fill: "#52525b", fontSize: 9 }}
                          axisLine={false} tickLine={false}
                          tickFormatter={(v) => v >= 1000 ? `R$${(v / 1000).toFixed(0)}k` : `R$${v}`}
                        />
                        <RechartsTooltip
                          content={<ChartTooltip />}
                          cursor={{ stroke: "rgba(255,255,255,0.08)", strokeWidth: 1 }}
                        />
                        <Area
                          type="monotone" dataKey="total"
                          stroke="#00d4aa" strokeWidth={2.5}
                          fill="url(#gradTeal)"
                          dot={{ r: 4, fill: "#00d4aa", strokeWidth: 0 }}
                          activeDot={{ r: 6, fill: "#00d4aa", strokeWidth: 0 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Extrato da fatura */}
                <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-black text-foreground">Lançamentos da Fatura</p>
                    <span className="text-xs text-muted-foreground font-bold">
                      {filteredTransactions.length} {filteredTransactions.length === 1 ? "item" : "itens"}
                    </span>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar por descrição..."
                      className="w-full bg-muted/30 border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm placeholder:text-muted-foreground text-foreground outline-none focus:border-primary/40 transition-colors"
                    />
                  </div>

                  <div className="space-y-2">
                    {filteredTransactions.length === 0 ? (
                      <div className="text-center py-12 rounded-xl border border-dashed border-border/50">
                        <Receipt className="w-10 h-10 mx-auto mb-3 opacity-20 text-muted-foreground" />
                        <p className="text-muted-foreground text-sm italic">Nenhum gasto nesta fatura.</p>
                      </div>
                    ) : (
                      filteredTransactions.map((t) => {
                        const category = categories.find((c) => c.id === t.categoryId);
                        const isIncome = t.type === "income";
                        return (
                          <div
                            key={t.id}
                            onClick={() => {
                              if (t.installmentTotal && t.installmentGroupId)
                                setTransactionToAnticipate(t);
                            }}
                            className={cn(
                              "flex items-center justify-between p-3.5 rounded-xl",
                              "bg-muted/10 hover:bg-muted/30 border border-border/50 transition-all group",
                              t.installmentTotal ? "cursor-pointer" : ""
                            )}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                                style={{
                                  background: category?.color
                                    ? `${category.color}20`
                                    : "hsl(var(--muted))"
                                }}
                              >
                                {isIncome
                                  ? <TrendingUp className="w-4 h-4 text-emerald-500" />
                                  : <TrendingDown className="w-4 h-4" style={{ color: category?.color ?? "#71717a" }} />
                                }
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-foreground leading-tight group-hover:text-primary truncate">
                                  {t.description}
                                </p>
                                <p className="text-xs text-muted-foreground uppercase font-bold tracking-tighter mt-0.5">
                                  {category?.name ?? "Sem categoria"}
                                  {t.installmentNumber && t.installmentTotal
                                    ? ` · ${t.installmentNumber}/${t.installmentTotal}`
                                    : ""}
                                  {" · "}{format(parseLocalDate(t.date), "dd MMM", { locale: ptBR })}
                                </p>
                              </div>
                            </div>
                            <p className={cn(
                              "text-sm font-black tabular-nums shrink-0 ml-4",
                              isIncome ? "text-emerald-500" : "text-foreground"
                            )}>
                              {isIncome ? "+" : "−"}{fmtBRL(t.amount)}
                            </p>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MOBILE — Carrossel snap + painel
      ══════════════════════════════════════════════════════════════════════ */}
      {sortedCards.length > 0 && (
        <div className="block lg:hidden space-y-4">

          <div
            ref={carouselRef}
            onScroll={handleScroll}
            className="flex snap-x snap-mandatory gap-4 px-10 py-6 no-scrollbar"
            style={{ overflowX: 'auto', overflowY: 'visible' }}
          >
            {sortedCards.map((card) => {
              const usedLimit = getCardUsedLimit(card.id);
              const availableLimit = Number(card.limit ?? 0) - usedLimit;
              const isSelected = selectedCardId === card.id;
              const invoiceStatus = getCardInvoiceStatus(card.id);
              return (
                <div
                  key={card.id}
                  onClick={() => setSelectedCardId(card.id)}
                  className={cn(
                    "px-2 py-1 snap-center w-[300px] shrink-0 transition-all duration-500 ease-out cursor-pointer rounded-2xl",
                    isSelected ? "opacity-100 scale-100 shadow-2xl" : "opacity-50 scale-[0.97] hover:opacity-75 hover:scale-[0.98]"
                  )}
                >
                  <CreditCardVisual
                    card={card}
                    usedLimit={usedLimit}
                    availableLimit={availableLimit}
                    isSelected={isSelected}
                    invoiceStatus={invoiceStatus}
                  />
                </div>
              );
            })}
          </div>

          {selectedCard && (
            <div className="px-4 space-y-4">

              {/* Nav mês mobile */}
              <div className="flex items-center justify-between z-20 relative">
                <div className="flex items-center gap-1 bg-card border border-border rounded-xl px-2 py-1">
                  <button className="p-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground transition-all flex items-center justify-center w-8 h-8" onClick={() => setViewDate((d) => subMonths(d, 1))}>
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-black tracking-tight min-w-[100px] text-center capitalize text-foreground">
                    {format(viewDate, "MMMM yyyy", { locale: ptBR })}
                  </span>
                  <button className="p-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground transition-all flex items-center justify-center w-8 h-8" onClick={() => setViewDate((d) => addMonths(d, 1))}>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="rounded-xl gap-1.5 text-xs font-black uppercase h-9 px-3 border-white/10" onClick={handleExport}>
                    <Download className="w-3 h-3" /> CSV
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-xl gap-1.5 text-xs font-black uppercase h-9 px-3 border-white/10" onClick={() => setShowEditCard(true)}>
                    <Pencil className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              {/* Fatura mobile */}
              <div className="bg-card border border-border rounded-2xl p-5 relative overflow-hidden">
                <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full opacity-[0.06] blur-3xl pointer-events-none" style={{ background: selectedCard.color ?? '#00d4aa' }} />

                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs uppercase font-black text-muted-foreground tracking-[0.2em]">Fatura atual</p>
                    <StatusBadge status={dynamicStatus} />
                  </div>

                  <div className="flex items-end justify-between mb-3">
                    <h2 className="text-4xl font-black tracking-tighter tabular-nums text-foreground">
                      {fmtBRL(currentInvoiceTotal)}
                    </h2>
                    {dynamicStatus?.text !== 'Paga' && currentInvoiceTotal > 0 && (
                      <Button
                        onClick={() => {
                          setPayInvoiceAmount(currentInvoiceTotal.toFixed(2));
                          setShowPayInvoice(true);
                        }}
                        className="bg-[#00d4aa] hover:bg-[#00b894] text-[#0a0a0f] rounded-xl font-black uppercase text-[11px] tracking-widest px-4 h-10 shadow-lg shadow-[#00d4aa]/20"
                      >
                        Pagar
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs font-semibold text-muted-foreground">
                    <span>Fecha <strong className="text-foreground">dia {selectedCard.closingDay}</strong></span>
                    <span>Vence <strong className="text-foreground">dia {selectedCard.dueDay}</strong></span>
                  </div>

                  <div className="mt-4 pt-4 border-t border-border/50">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                      <span>{stats.percentUsed.toFixed(0)}% usado</span>
                      <span>{fmtBRL(stats.available)} disponível</span>
                    </div>
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all duration-700",
                        stats.percentUsed > 90 ? "bg-rose-400" :
                          stats.percentUsed > 70 ? "bg-amber-400" : "bg-emerald-400"
                      )} style={{ width: `${stats.percentUsed}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats mobile */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-card border border-border rounded-2xl p-4">
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">Gastos</p>
                  <p className="text-xl font-black tabular-nums text-foreground">{fmtBRL(currentInvoiceTotal)}</p>
                </div>
                <div className="bg-card border border-border rounded-2xl p-4 relative group">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">Disponível</p>
                      <p className="text-xl font-black tabular-nums text-foreground">{fmtBRL(stats.available)}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowInstallInvoice(true)}
                        className="px-2 py-1 rounded-lg border border-border text-[11px] font-black uppercase tracking-widest text-muted-foreground"
                      >
                        Parcelar
                      </button>
                      <button
                        onClick={() => setShowAnticipatePayment(true)}
                        className="px-2 py-1 rounded-lg border border-border text-[11px] font-black uppercase tracking-widest text-muted-foreground"
                      >
                        Abater
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Gráfico mobile */}
              <div className="bg-card border border-border rounded-2xl p-4">
                <p className="text-xs font-black text-foreground mb-4">Evolução de Gastos</p>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%" minHeight={200}>
                    <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gradTealM" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#00d4aa" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#00d4aa" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9, fontWeight: 700 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 8 }} axisLine={false} tickLine={false}
                        tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`} />
                      <RechartsTooltip content={<ChartTooltip />} cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }} />
                      <Area type="monotone" dataKey="total" stroke="#00d4aa" strokeWidth={2}
                        fill="url(#gradTealM)"
                        dot={{ r: 3, fill: "#00d4aa", strokeWidth: 0 }}
                        activeDot={{ r: 5, fill: "#00d4aa", strokeWidth: 0 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Extrato mobile */}
              <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
                <p className="text-xs font-black text-foreground">Lançamentos</p>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar..."
                    className="w-full bg-muted/30 border border-border rounded-xl pl-9 pr-4 py-2 text-sm placeholder:text-muted-foreground text-foreground outline-none focus:border-primary/40 transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  {filteredTransactions.length === 0 ? (
                    <p className="text-center text-muted-foreground text-xs py-8 italic">Nenhum gasto nesta fatura.</p>
                  ) : (
                    filteredTransactions.map((t) => {
                      const category = categories.find((c) => c.id === t.categoryId);
                      return (
                        <div
                          key={t.id}
                          onClick={() => { if (t.installmentTotal && t.installmentGroupId) setTransactionToAnticipate(t); }}
                          className="flex items-center justify-between p-3 rounded-xl bg-muted/10 border border-border/50"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center"
                              style={{ background: category?.color ? `${category.color}20` : "hsl(var(--muted))" }}
                            >
                              <Receipt className="w-3.5 h-3.5 text-muted-foreground" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-foreground truncate">{t.description}</p>
                              <p className="text-[11px] text-muted-foreground uppercase font-bold">
                                {format(parseLocalDate(t.date), "dd MMM", { locale: ptBR })}
                              </p>
                            </div>
                          </div>
                          <p className={cn(
                            "text-xs font-black tabular-nums shrink-0 ml-2",
                            t.type === "income" ? "text-emerald-500" : "text-foreground"
                          )}>
                            {t.type === "income" ? "+" : "−"}{fmtBRL(t.amount)}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>
          )}
        </div>
      )}

      {/* Dialogs */}
      {showAddCard && (
        <Portal>
          <AddCardDialog isOpen={showAddCard} onClose={() => setShowAddCard(false)} onAdd={addCreditCard} />
        </Portal>
      )}
      {showEditCard && selectedCard && (
        <Portal>
          <EditCardDialog
            card={selectedCard}
            isOpen={showEditCard}
            onClose={() => setShowEditCard(false)}
            onSave={(updated) => { const { id, ...updates } = updated; updateCreditCard({ id, updates }); }}
          />
        </Portal>
      )}
      {showInstallInvoice && selectedCard && (
        <InstallInvoiceDialog
          card={selectedCard}
          currentInvoiceAmount={currentInvoiceTotal}
          isOpen={showInstallInvoice}
          onClose={() => setShowInstallInvoice(false)}
        />
      )}
      {transactionToAnticipate && (
        <Portal>
          <AnticipateInstallmentsDialog
            isOpen={!!transactionToAnticipate}
            onClose={() => setTransactionToAnticipate(null)}
            transaction={transactionToAnticipate}
          />
        </Portal>
      )}

      {/* Pay Invoice Dialog */}
      {showPayInvoice && selectedCard && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-card border-2 border-primary/20 rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex flex-col items-center text-center space-y-4 mb-8">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-lg">
                <Check className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-black tracking-tight">Pagar Fatura</h3>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest mt-1">
                  {selectedCard.name} · {format(viewDate, 'MMMM yyyy', { locale: ptBR })}
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Seleção de Conta */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Pagar com</label>
                <Select value={payInvoiceAccountId} onValueChange={setPayInvoiceAccountId}>
                  <SelectTrigger className="h-14 rounded-2xl border-2 border-muted bg-muted/30 font-bold text-sm">
                    <SelectValue placeholder="Selecione a conta" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-2 border-primary/10 bg-card">
                    {accounts
                      .filter(acc => acc.accountType !== 'investment' && acc.accountType !== 'metas')
                      .map(acc => (
                        <SelectItem key={acc.id} value={acc.id} className="rounded-xl font-bold py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: acc.color }} />
                            {acc.bank} - {acc.name}
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Valor Pago */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Valor pago</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-muted-foreground text-sm">R$</span>
                  <Input
                    type="number"
                    step="0.01"
                    value={payInvoiceAmount}
                    onChange={(e) => setPayInvoiceAmount(e.target.value)}
                    className="h-14 rounded-2xl border-2 border-muted bg-muted/30 pl-10 font-black text-xl"
                  />
                </div>
                <p className="text-xs text-muted-foreground font-bold ml-1">Total da fatura: {fmtBRL(currentInvoiceTotal)}</p>
              </div>

              {/* Data do Pagamento */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Data do pagamento</label>
                <Input
                  type="date"
                  value={payInvoiceDate}
                  onChange={(e) => setPayInvoiceDate(e.target.value)}
                  className="h-14 rounded-2xl border-2 border-muted bg-muted/30 font-bold"
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 mt-8">
              <Button
                onClick={handleConfirmPayment}
                disabled={isProcessingPayment}
                className="w-full h-14 bg-primary hover:bg-primary/90 text-white rounded-2xl font-black text-base shadow-lg shadow-primary/20"
              >
                {isProcessingPayment ? "Processando..." : "Confirmar Pagamento"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setShowPayInvoice(false)}
                className="w-full h-12 rounded-2xl font-bold text-muted-foreground hover:text-foreground"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Anticipate Payment Dialog */}
      {showAnticipatePayment && selectedCard && (
        <Portal>
          <AnticipatePaymentDialog
            card={selectedCard}
            isOpen={showAnticipatePayment}
            onClose={() => setShowAnticipatePayment(false)}
          />
        </Portal>
      )}
    </div>
  );
}

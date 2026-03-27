import { useState } from 'react';
import { format } from 'date-fns';
import { TrendingDown, Plus, Trash2, X, AlertTriangle, Edit2 } from 'lucide-react';
import { useRenegotiateDebt } from '@/hooks/useDebtMutations';
import { Debt } from '@/types/finance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface DebtsManagerProps {
  debts: Debt[];
  onAddDebt: (debt: Omit<Debt, 'id' | 'userId'>) => void;
  onUpdateDebt: (id: string, updates: Partial<Debt>) => void;
  onDeleteDebt: (id: string) => void;
}

export function DebtsManager({
  debts,
  onAddDebt,
  onUpdateDebt,
  onDeleteDebt,
}: DebtsManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [remainingAmount, setRemainingAmount] = useState('');
  const [installmentAmount, setInstallmentAmount] = useState('');
  const [totalInstallments, setTotalInstallments] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [firstInstallmentDate, setFirstInstallmentDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { mutateAsync: renegotiateDebt } = useRenegotiateDebt();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !totalAmount || !remainingAmount || !installmentAmount) return;

    const debtData = {
      name,
      totalAmount: parseFloat(totalAmount),
      remainingAmount: parseFloat(remainingAmount),
      installmentAmount: parseFloat(installmentAmount),
      interestRateMonthly: editingDebt?.interestRateMonthly || 0,
      totalInstallments: parseInt(totalInstallments) || 1,
      dueDay: parseInt(dueDay) || undefined,
      status: editingDebt?.status || 'active'
    };

    if (editingDebt) {
      onUpdateDebt(editingDebt.id, debtData);
    } else {
      onAddDebt({
        ...debtData,
        startDate: firstInstallmentDate,
      });
    }

    handleCloseForm();
  };

  const handleEdit = (debt: Debt) => {
    setEditingDebt(debt);
    setName(debt.name);
    setTotalAmount(debt.totalAmount.toString());
    setRemainingAmount(debt.remainingAmount.toString());
    setInstallmentAmount(debt.installmentAmount.toString());
    setTotalInstallments(debt.totalInstallments?.toString() || '1');
    setDueDay(debt.dueDay?.toString() || '');
    setFirstInstallmentDate(debt.startDate ? format(new Date(debt.startDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setName('');
    setTotalAmount('');
    setRemainingAmount('');
    setInstallmentAmount('');
    setTotalInstallments('');
    setDueDay('');
    setFirstInstallmentDate(format(new Date(), 'yyyy-MM-dd'));
    setEditingDebt(null);
    setShowForm(false);
  };


  const totalDebt = debts.reduce((sum, d) => sum + d.remainingAmount, 0);
  const totalMonthly = debts.reduce((sum, d) => sum + d.installmentAmount, 0);

  const toNegotiate = debts.filter(d => d.status !== 'renegotiated');
  const inPayment = debts.filter(d => d.status === 'renegotiated');

  return (
    <div className="space-y-6">
      <div className="card-elevated p-6 animate-fade-in">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-danger-light">
            <TrendingDown className="w-5 h-5 text-danger" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Controle de Acordos</h2>
            <p className="text-sm text-muted-foreground">
              Acompanhe e quite seus acordos
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-danger-light">
            <p className="text-sm text-muted-foreground">Total em Acordos</p>
            <p className="text-2xl font-bold text-danger">
              {formatCurrency(totalDebt)}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-warning-light">
            <p className="text-sm text-muted-foreground">Parcelas Mensais</p>
            <p className="text-2xl font-bold text-warning">
              {formatCurrency(totalMonthly)}
            </p>
          </div>
        </div>
      </div>

      {/* Add Button */}
      <Button
        onClick={() => {
          setEditingDebt(null);
          setShowForm(true);
        }}
        className="w-full rounded-xl py-6"
        variant="outline"
      >
        <Plus className="w-5 h-5 mr-2" />
        Adicionar Acordo
      </Button>

      {/* Debts List */}
      <div className="space-y-8">
        {debts.length === 0 ? (
          <div className="card-elevated p-12 text-center">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhum acordo cadastrado</p>
            <p className="text-sm text-muted-foreground mt-1">
              Que bom! Continue assim 🎉
            </p>
          </div>
        ) : (
          <>
            {/* Para Negociar */}
            {toNegotiate.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground ml-1">Para Negociar</h3>
                {toNegotiate.map((debt) => {
                  const instAmount = Number(debt.installmentAmount) || 0;
                  const remAmount = Number(debt.remainingAmount) || 0;
                  const monthsRemaining = instAmount > 0
                    ? Math.ceil(remAmount / instAmount)
                    : 0;

                  return (
                    <div key={debt.id} className="card-elevated p-5 space-y-4 group animate-fade-in border-l-4 border-warning">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">{debt.name}</h3>
                          <p className="text-xs text-muted-foreground uppercase font-bold tracking-tighter">
                            {debt.dueDay && `Vence dia ${debt.dueDay} • `}
                            ~{monthsRemaining} parcelas estimadas
                          </p>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={() => handleEdit(debt)} className="p-2 rounded-lg hover:bg-info/10 text-info" title="Editar">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => onDeleteDebt(debt.id)} className="p-2 rounded-lg hover:bg-danger/10 text-danger" title="Excluir">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-between items-center py-2 border-y border-border/50">
                        <div>
                          <p className="text-[10px] text-muted-foreground font-bold uppercase">Saldo Devedor</p>
                          <p className="text-xl font-black text-danger">{formatCurrency(debt.remainingAmount)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-muted-foreground font-bold uppercase">Valor Sugerido Parcela</p>
                          <p className="text-lg font-bold">{formatCurrency(debt.installmentAmount || 0)}</p>
                        </div>
                      </div>

                      <Button
                        onClick={() => renegotiateDebt({ debt, firstInstallmentDate: format(new Date(), 'yyyy-MM-dd') })}
                        className="w-full rounded-xl bg-warning hover:bg-warning/90 text-warning-foreground font-black uppercase text-[10px] tracking-widest h-11"
                      >
                        Gerar Parcelas do Acordo
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Em Pagamento */}
            {inPayment.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground ml-1">Em Pagamento (Acordos)</h3>
                {inPayment.map((debt) => {
                  const totalAmt = Number(debt.totalAmount) || 0;
                  const remAmt = Number(debt.remainingAmount) || 0;
                  const progress = totalAmt > 0
                    ? ((totalAmt - remAmt) / totalAmt) * 100
                    : 0;

                  return (
                    <div key={debt.id} className="card-elevated p-5 space-y-4 group animate-fade-in border-l-4 border-success opacity-90 hover:opacity-100 transition-opacity">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">{debt.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="px-1.5 py-0.5 rounded bg-success/10 text-success text-[8px] font-black uppercase">Acordo Ativo</span>
                            <p className="text-[10px] text-muted-foreground font-bold">
                              {debt.totalInstallments} parcelas • Dia {debt.dueDay}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={() => handleEdit(debt)} className="p-2 rounded-lg hover:bg-info/10 text-info" title="Editar">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => onDeleteDebt(debt.id)} className="p-2 rounded-lg hover:bg-danger/10 text-danger" title="Excluir">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-black uppercase">
                          <span className="text-muted-foreground">Pago: {formatCurrency(Math.max(0, (Number(debt.totalAmount) || 0) - (Number(debt.remainingAmount) || 0)))}</span>
                          <span className="text-danger">Restante: {formatCurrency(Number(debt.remainingAmount) || 0)}</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-success transition-all duration-500" style={{ width: `${progress}%` }} />
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-success/5 border border-success/10 text-center">
                        <p className="text-[10px] font-bold text-success select-none">
                          As parcelas deste acordo estão na sua Gestão de Contas para pagamento.
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/20 backdrop-blur-sm">
          <div className="bg-card rounded-3xl shadow-xl w-full max-w-md animate-scale-in">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-lg font-semibold">
                {editingDebt ? 'Editar Acordo' : 'Novo Acordo'}
              </h2>
              <button
                onClick={handleCloseForm}
                className="p-2 rounded-xl hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <Label>Nome/Descrição</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Financiamento Carro"
                  className="rounded-xl"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Valor Total (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  placeholder="50000.00"
                  className="rounded-xl"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Valor Restante (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={remainingAmount}
                  onChange={(e) => setRemainingAmount(e.target.value)}
                  placeholder="35000.00"
                  className="rounded-xl"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Parcela do Acordo (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={installmentAmount}
                    onChange={(e) => setInstallmentAmount(e.target.value)}
                    placeholder="1200.00"
                    className="rounded-xl font-bold"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nº de Parcelas</Label>
                  <Input
                    type="number"
                    min="1"
                    value={totalInstallments}
                    onChange={(e) => setTotalInstallments(e.target.value)}
                    placeholder="12"
                    className="rounded-xl font-bold"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Data da 1ª Parcela</Label>
                <Input
                  type="date"
                  value={firstInstallmentDate}
                  onChange={e => setFirstInstallmentDate(e.target.value)}
                  className="rounded-xl"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Dia de Vencimento</Label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={dueDay}
                  onChange={e => setDueDay(e.target.value)}
                  placeholder="10"
                  className="rounded-xl"
                  required
                />
              </div>
              <Button type="submit" className={cn(
                "w-full rounded-xl",
                editingDebt?.status === 'renegotiated' ? "bg-success hover:bg-success/90" : "bg-danger hover:bg-danger/90"
              )}>
                {editingDebt?.status === 'renegotiated' ? 'Atualizar Acordo' : editingDebt ? 'Atualizar Acordo' : 'Adicionar Acordo'}
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}



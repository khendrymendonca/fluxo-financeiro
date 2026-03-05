import { useState } from 'react';
import { useFinanceStore } from '@/hooks/useFinanceStore';
import { Button } from '@/components/ui/button';
import { Download, Upload, FileText, CheckCircle2, AlertCircle, HardDrive } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function ExportManager() {
    const { transactions, categories, accounts, addTransaction } = useFinanceStore();
    const [isImporting, setIsImporting] = useState(false);

    const exportToCSV = () => {
        try {
            if (transactions.length === 0) {
                toast.error("Nenhuma transação para exportar.");
                return;
            }

            const headers = ['Data', 'Descricao', 'Valor', 'Tipo', 'Categoria', 'Conta', 'Modo', 'Pago'];
            const rows = transactions.map(t => [
                t.date,
                t.description.replace(/,/g, ' '), // avoid CSV break
                t.amount,
                t.type,
                categories.find(c => c.id === t.categoryId)?.name || '',
                accounts.find(a => a.id === t.accountId)?.name || '',
                t.transactionType,
                t.isPaid ? 'Sim' : 'Não'
            ]);

            const csvContent = [
                headers.join(','),
                ...rows.map(r => r.join(','))
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `fluxo_financeiro_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            toast.success("Exportação concluída com sucesso!");
        } catch (error) {
            console.error(error);
            toast.error("Erro ao exportar dados.");
        }
    };

    const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target?.result as string;
                const lines = text.split('\n');
                const headers = lines[0].split(',');

                let importedCount = 0;

                // Basic validation of headers
                if (!headers.includes('Valor') || !headers.includes('Tipo')) {
                    toast.error("Formato de CSV inválido.");
                    return;
                }

                // Skip header and process lines
                for (let i = 1; i < lines.length; i++) {
                    if (!lines[i].trim()) continue;
                    const values = lines[i].split(',');

                    // Map basic fields (approximation)
                    await addTransaction({
                        date: values[0] || new Date().toISOString(),
                        description: values[1] || 'Importado',
                        amount: parseFloat(values[2]) || 0,
                        type: (values[3] as 'income' | 'expense') || 'expense',
                        transactionType: 'punctual',
                        isPaid: true,
                        // Simplified: we don't map cat/acc IDs perfectly yet
                        categoryId: '',
                        accountId: accounts[0]?.id || '',
                        userId: '' // Handled by store
                    });
                    importedCount++;
                }

                toast.success(`${importedCount} transações importadas!`);
            } catch (error) {
                console.error(error);
                toast.error("Erro durante a importação.");
            } finally {
                setIsImporting(false);
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="card-elevated p-8 space-y-6">
            <div className="flex items-center gap-4 mb-2">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <FileText className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="text-xl font-black">Dados e Backup</h3>
                    <p className="text-sm text-muted-foreground">Exporte seus dados para Excel ou importe arquivos externos.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Export Card */}
                <div className="p-6 rounded-3xl border-2 border-dashed border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors flex flex-col items-center text-center gap-4 group">
                    <div className="w-16 h-16 rounded-full bg-background flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <Download className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                        <h4 className="font-bold">Exportar CSV</h4>
                        <p className="text-xs text-muted-foreground px-4">Baixe todas as suas transações em formato compatível com Excel.</p>
                    </div>
                    <Button onClick={exportToCSV} className="w-full rounded-2xl h-12 font-bold gap-2">
                        Iniciar Download
                    </Button>
                </div>

                {/* Import Card */}
                <div className="p-6 rounded-3xl border-2 border-dashed border-muted bg-muted/5 hover:bg-muted/10 transition-colors flex flex-col items-center text-center gap-4 group relative">
                    <div className="w-16 h-16 rounded-full bg-background flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <Upload className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <div>
                        <h4 className="font-bold">Importar Dados</h4>
                        <p className="text-xs text-muted-foreground px-4">Sincronize transações de outros apps via arquivo CSV.</p>
                    </div>

                    <label className="w-full">
                        <input
                            type="file"
                            accept=".csv"
                            className="hidden"
                            onChange={handleImport}
                            disabled={isImporting}
                        />
                        <div className={cn(
                            "w-full rounded-2xl h-12 flex items-center justify-center font-bold gap-2 border-2 cursor-pointer transition-all",
                            isImporting ? "opacity-50 cursor-wait bg-muted" : "bg-background hover:bg-muted"
                        )}>
                            {isImporting ? "Processando..." : "Selecionar Arquivo"}
                        </div>
                    </label>
                </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-4">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                    <p className="text-xs font-bold text-amber-600 uppercase">Atenção ao Importar</p>
                    <p className="text-[10px] text-amber-800 leading-tight">
                        A importação espera um arquivo CSV com as colunas na ordem padrão: Data, Descrição, Valor, Tipo.
                        Registros duplicados não são removidos automaticamente.
                    </p>
                </div>
            </div>
        </div>
    );
}

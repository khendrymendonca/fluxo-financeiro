import { useState } from 'react';
import { useFinanceStore } from '@/hooks/useFinanceStore';
import { useCategories, useSubcategories, useCategoryGroups } from '@/hooks/useFinanceQueries';
import {
    useAddCategory,
    useDeleteCategory,
    useAddSubcategory,
    useDeleteSubcategory,
    useUpdateCategory
} from '@/hooks/useCategoryMutations';
import { BudgetGroup, Category } from '@/types/finance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    TrendingUp,
    LayoutGrid,
    Plus,
    Trash2,
    Settings2,
    Anchor,
    Pin,
    PinOff,
    Zap,
    FolderTree
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
import { ColorSelector, APP_COLORS } from '@/components/ui/ColorSelector';
import { PageHeader } from '@/components/ui/PageHeader';
import { Switch } from '@/components/ui/switch';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

export function CategoriesManager() {
    // Queries
    const { data: categories = [] } = useCategories();
    const { data: subcategories = [] } = useSubcategories();
    const { data: categoryGroups = [] } = useCategoryGroups();

    // Mutations
    const { mutate: addCategory } = useAddCategory();
    const { mutate: updateCategory } = useUpdateCategory();
    const { mutate: deleteCategory } = useDeleteCategory();
    const { mutate: addSubcategory } = useAddSubcategory();
    const { mutate: deleteSubcategory } = useDeleteSubcategory();

    // New Category State
    const [newCatName, setNewCatName] = useState('');
    const [newCatType, setNewCatType] = useState<'expense' | 'income'>('expense');
    const [newCatGroup, setNewCatGroup] = useState<string>('');
    const [newCatBudgetGroup, setNewCatBudgetGroup] = useState<BudgetGroup>('essential');
    const [newCatColor, setNewCatColor] = useState(APP_COLORS[0]);
    const [newCatIsFixed, setNewCatIsFixed] = useState(false);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);

    // New Subcategory State
    const [newSubName, setNewSubName] = useState('');
    const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);


    const handleAddCategory = () => {
        if (!newCatName) {
            toast({ title: 'Digite o nome da categoria', variant: 'destructive' });
            return;
        }

        const groupId = categoryGroups[0]?.id;
        if (!groupId) {
            toast({
                title: 'Erro de Grupo',
                description: 'Nenhum grupo de categorias encontrado. Por favor, recarregue a página ou entre em contato com o suporte.',
                variant: 'destructive'
            });
            return;
        }

        addCategory({
            name: newCatName,
            type: newCatType,
            groupId: groupId,
            budgetGroup: newCatType === 'income' ? 'income' : newCatBudgetGroup,
            icon: 'Tag',
            color: newCatColor,
            isActive: true,
            isFixed: newCatIsFixed
        }, {
            onSuccess: () => {
                setNewCatName('');
                setNewCatIsFixed(false);
                setIsModalOpen(false);
                // O toast já é disparado pelo hook da mutation
            }
        });
    };

    const handleAddSubcategory = (catId: string, name: string) => {
        if (!name) return;
        addSubcategory({
            categoryId: catId,
            name: name,
            isActive: true
        });
    };

    // Subcomponente interno para os itens da lista
    const CategoryItem = ({ cat }: { cat: Category }) => {
        const [isSubModalOpen, setIsSubModalOpen] = useState(false);
        const [subName, setSubName] = useState('');

        return (
            <div className="group border-b border-border/30 last:border-0 py-2">
                <div className="flex items-center justify-between min-h-[64px] p-4 rounded-[1.5rem] hover:bg-muted/50 transition-all">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm" style={{ backgroundColor: cat.color }}>
                            <FolderTree className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col">
                            <span className="font-bold text-base md:text-lg">{cat.name}</span>
                            {cat.isFixed && (
                                <div className="mt-1 w-fit px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                                    <Pin className="w-3 h-3" /> Conta Fixa
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 md:gap-4">
                        <div className="flex items-center gap-1 md:gap-2 mr-2 md:mr-4">
                            <button
                                onClick={() => updateCategory({ id: cat.id, updates: { isFixed: !cat.isFixed } })}
                                className={cn(
                                    "p-2.5 rounded-xl transition-all min-h-[48px] min-w-[48px] flex items-center justify-center border border-transparent hover:border-zinc-700",
                                    cat.isFixed ? "text-primary bg-primary/10" : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/60"
                                )}
                                title={cat.isFixed ? "Remover de Contas Fixas" : "Marcar como Conta Fixa"}
                            >
                                {cat.isFixed ? <Pin className="w-5 h-5 md:w-6 md:h-6" /> : <PinOff className="w-5 h-5 md:w-6 md:h-6" />}
                            </button>

                            <Dialog open={isSubModalOpen} onOpenChange={setIsSubModalOpen}>
                                <DialogTrigger asChild>
                                    <button
                                        className="p-2.5 rounded-xl min-h-[48px] min-w-[48px] flex items-center justify-center border border-transparent transition-all text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/60 hover:border-zinc-700"
                                        title="Adicionar Subcategoria"
                                    >
                                        <Plus className="w-5 h-5 md:w-6 md:h-6" />
                                    </button>
                                </DialogTrigger>
                                <DialogContent className="max-w-md rounded-3xl p-6">
                                    <DialogHeader>
                                        <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                                            <Plus className="w-5 h-5 text-info" /> Nova Subcategoria
                                        </DialogTitle>
                                        <p className="text-xs text-muted-foreground">Adicionando em: <span className="font-bold text-foreground">{cat.name}</span></p>
                                    </DialogHeader>
                                    <div className="space-y-4 mt-4">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nome da Subcategoria</Label>
                                            <Input
                                                placeholder="Ex: Aluguel, Supermercado..."
                                                value={subName}
                                                onChange={e => setSubName(e.target.value)}
                                                className="h-12 rounded-xl border-2 font-bold"
                                                autoFocus
                                            />
                                        </div>
                                        <Button
                                            className="w-full h-12 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-info/20 bg-info hover:bg-info/90"
                                            onClick={() => {
                                                handleAddSubcategory(cat.id, subName);
                                                setSubName('');
                                                setIsSubModalOpen(false);
                                            }}
                                        >
                                            Salvar Subcategoria
                                        </Button>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>

                        {['Renegociação', 'Fatura de Cartão de Crédito', 'Outros'].includes(cat.name) ? (
                            <div className="p-3 text-muted-foreground/20 cursor-not-allowed" title="Categoria do Sistema (Não pode ser excluída)">
                                <Trash2 className="w-5 h-5 md:w-6 md:h-6" />
                            </div>
                        ) : (
                            <button
                                onClick={() => {
                                    if (confirm(`Deseja realmente excluir a categoria "${cat.name}" e todas as suas subcategorias?`)) {
                                        deleteCategory(cat.id);
                                    }
                                }}
                                className="p-2.5 rounded-xl min-h-[48px] min-w-[48px] flex items-center justify-center border border-transparent transition-all text-zinc-400 hover:text-red-400 hover:bg-zinc-700/60 hover:border-zinc-700"
                                title="Excluir Categoria"
                            >
                                <Trash2 className="w-5 h-5 md:w-6 md:h-6" />
                            </button>
                        )}
                    </div>
                </div>

                <div className="ml-10 md:ml-16 space-y-2 mt-2">
                    {subcategories.filter(s => s.categoryId === cat.id).map(sub => (
                        <div key={sub.id} className="flex items-center justify-between min-h-[44px] px-4 py-2 text-sm text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted/30 group/sub transition-all border border-transparent hover:border-border/50">
                            <div className="flex items-center gap-3">
                                <span className="text-muted-foreground/40 font-mono text-lg leading-none">└─</span>
                                <span className="font-bold">{sub.name}</span>
                            </div>
                            <button
                                onClick={() => deleteSubcategory(sub.id)}
                                className="opacity-0 group-hover/sub:opacity-100 p-2 rounded-lg min-h-[40px] min-w-[40px] flex items-center justify-center transition-all text-zinc-400 hover:text-red-400 hover:bg-zinc-700/60"
                                title="Excluir Subcategoria"
                            >
                                <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-12 px-4 md:px-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
                <PageHeader title="Gestão de Categorias" icon={LayoutGrid} />

                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                    <DialogTrigger asChild>
                        <Button className="h-14 px-8 rounded-2xl font-black uppercase tracking-widest flex items-center gap-3 shadow-xl shadow-primary/20 bg-primary text-white hover:bg-primary/90 transition-all active:scale-95">
                            <Plus className="w-6 h-6" /> Nova Categoria
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="w-[92vw] max-w-md rounded-3xl p-0 overflow-y-auto max-h-[90vh] border-none shadow-2xl bg-background animate-in zoom-in-95">
                        <DialogHeader className="p-6 bg-primary/5 border-b border-primary/10">
                            <DialogTitle className="text-xl font-black uppercase tracking-tight text-primary flex items-center gap-2">
                                <Settings2 className="w-5 h-5" /> Criar Categoria
                            </DialogTitle>
                        </DialogHeader>

                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-2xl">
                                <button
                                    onClick={() => setNewCatType('expense')}
                                    className={cn(
                                        "h-10 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                                        newCatType === 'expense' ? "bg-background text-danger shadow-sm" : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    Despesa
                                </button>
                                <button
                                    onClick={() => setNewCatType('income')}
                                    className={cn(
                                        "h-10 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                                        newCatType === 'income' ? "bg-background text-success shadow-sm" : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    Receita
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nome</Label>
                                    <Input
                                        value={newCatName}
                                        onChange={e => setNewCatName(e.target.value)}
                                        placeholder="Ex: Aluguel, Salário..."
                                        className="h-12 rounded-xl border-2 bg-muted/20 focus:bg-background transition-all font-bold"
                                    />
                                </div>

                                {newCatType === 'expense' && (
                                    <div className="space-y-2 animate-in slide-in-from-top-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Grupo de Orçamento</Label>
                                        <select
                                            className="w-full h-12 rounded-xl border-2 border-input bg-muted/20 px-4 text-sm font-bold focus:border-primary transition-colors"
                                            value={newCatBudgetGroup}
                                            onChange={e => setNewCatBudgetGroup(e.target.value as BudgetGroup)}
                                        >
                                            <option value="essential">Essenciais (Custos)</option>
                                            <option value="lifestyle">Estilo de Vida (Lazer)</option>
                                            <option value="financial">Objetivos (Reserva/Dívida)</option>
                                        </select>
                                    </div>
                                )}

                                <div className="flex items-center justify-between p-4 rounded-2xl border-2 border-dashed bg-muted/10">
                                    <div className="flex flex-col">
                                        <Label className="text-[11px] font-black uppercase">Conta Fixa</Label>
                                        <span className="text-[9px] text-muted-foreground">Repete todos os meses</span>
                                    </div>
                                    <Switch checked={newCatIsFixed} onCheckedChange={setNewCatIsFixed} />
                                </div>

                                <ColorSelector
                                    label="Estética da Categoria"
                                    selectedColor={newCatColor}
                                    onSelect={setNewCatColor}
                                />
                            </div>

                            <Button
                                onClick={handleAddCategory}
                                className="w-full h-14 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 mt-4 active:scale-95 transition-transform"
                            >
                                Salvar Categoria
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Listas de Categorias - Modo Grid 3 cols */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 1. Essenciais */}
                <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm dark:shadow-none border border-zinc-200 dark:border-zinc-800 flex flex-col min-h-[120px]">
                    <h4 className="text-[11px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400 flex items-center gap-2 pb-3 border-b border-zinc-100 dark:border-zinc-800 mb-2">
                        <span className="w-2 h-2 rounded-full bg-zinc-400 dark:bg-zinc-600 inline-block" />
                        Despesas Essenciais
                    </h4>
                    <div className="flex-1 space-y-2">
                        {categories.filter(c => c.type === 'expense' && c.budgetGroup === 'essential').length === 0 ? (
                            <p className="text-sm text-muted-foreground italic text-center py-10">Nenhuma categoria essencial encontrada.</p>
                        ) : (
                            categories.filter(c => c.type === 'expense' && c.budgetGroup === 'essential').map(cat => (
                                <CategoryItem key={cat.id} cat={cat} />
                            ))
                        )}
                    </div>
                </div>

                {/* 2. Estilo de Vida */}
                <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm dark:shadow-none border border-zinc-200 dark:border-zinc-800 flex flex-col min-h-[120px]">
                    <h4 className="text-[11px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400 flex items-center gap-2 pb-3 border-b border-zinc-100 dark:border-zinc-800 mb-2">
                        <span className="w-2 h-2 rounded-full bg-zinc-400 dark:bg-zinc-600 inline-block" />
                        Estilo de Vida & Lazer
                    </h4>
                    <div className="flex-1 space-y-2">
                        {categories.filter(c => c.type === 'expense' && c.budgetGroup === 'lifestyle').length === 0 ? (
                            <p className="text-sm text-muted-foreground italic text-center py-10">Nenhuma categoria de estilo de vida encontrada.</p>
                        ) : (
                            categories.filter(c => c.type === 'expense' && c.budgetGroup === 'lifestyle').map(cat => (
                                <CategoryItem key={cat.id} cat={cat} />
                            ))
                        )}
                    </div>
                </div>

                {/* 3. Coluna Direita: Objetivos + Receitas */}
                <div className="flex flex-col gap-6">
                    {/* 3A. Objetivos */}
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm dark:shadow-none border border-zinc-200 dark:border-zinc-800 flex flex-col min-h-[120px]">
                        <h4 className="text-[11px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400 flex items-center gap-2 pb-3 border-b border-zinc-100 dark:border-zinc-800 mb-2">
                            <span className="w-2 h-2 rounded-full bg-zinc-400 dark:bg-zinc-600 inline-block" />
                            Objetivos Financeiros
                        </h4>
                        <div className="flex-1 space-y-2">
                            {categories.filter(c => c.type === 'expense' && c.budgetGroup === 'financial').length === 0 ? (
                                <p className="text-sm text-muted-foreground italic text-center py-10">Nenhum objetivo financeiro encontrado.</p>
                            ) : (
                                categories.filter(c => c.type === 'expense' && c.budgetGroup === 'financial').map(cat => (
                                    <CategoryItem key={cat.id} cat={cat} />
                                ))
                            )}
                        </div>
                    </div>

                    {/* 3B. Receitas */}
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm dark:shadow-none border border-zinc-200 dark:border-zinc-800 flex flex-col min-h-[120px]">
                        <h4 className="text-[11px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400 flex items-center gap-2 pb-3 border-b border-zinc-100 dark:border-zinc-800 mb-2">
                            <span className="w-2 h-2 rounded-full bg-zinc-400 dark:bg-zinc-600 inline-block" />
                            Fontes de Receita
                        </h4>
                        <div className="flex flex-col gap-2">
                            {categories.filter(c => c.type === 'income').map(cat => (
                                <CategoryItem key={cat.id} cat={cat} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}



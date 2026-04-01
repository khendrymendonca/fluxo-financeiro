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
        const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

        return (
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors group">
                <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 shadow-sm" style={{ backgroundColor: cat.color }}>
                            <FolderTree className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="font-medium text-sm truncate">{cat.name}</span>
                            {cat.isFixed && (
                                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                                    <Pin className="w-2.5 h-2.5" /> Fixa
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                        onClick={() => updateCategory({ id: cat.id, updates: { isFixed: !cat.isFixed } })}
                        className={cn(
                            "p-1.5 rounded-lg transition-colors",
                            cat.isFixed ? "text-primary hover:bg-muted" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                        title={cat.isFixed ? "Remover de Contas Fixas" : "Marcar como Conta Fixa"}
                    >
                        {cat.isFixed ? <Pin className="w-3.5 h-3.5" /> : <PinOff className="w-3.5 h-3.5" />}
                    </button>

                    {['Renegociação', 'Fatura de Cartão de Crédito', 'Outros'].includes(cat.name) ? null : (
                        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                            <DialogTrigger asChild>
                                <button
                                    className="p-1.5 rounded-lg text-muted-foreground hover:bg-danger/10 hover:text-danger transition-colors"
                                    title="Excluir Categoria"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md rounded-3xl p-6">
                                <DialogHeader>
                                    <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2 text-danger">
                                        <Trash2 className="w-5 h-5" /> Excluir Categoria
                                    </DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 mt-2">
                                    <p className="text-sm text-foreground">
                                        Tem certeza que deseja remover a categoria <strong>{cat.name}</strong>? Esta ação não pode ser desfeita.
                                    </p>
                                    <div className="flex gap-3 justify-end pt-2">
                                        <Button variant="outline" className="h-12 rounded-xl" onClick={() => setIsDeleteDialogOpen(false)}>
                                            Cancelar
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            className="h-12 rounded-xl"
                                            onClick={() => {
                                                deleteCategory(cat.id);
                                                setIsDeleteDialogOpen(false);
                                            }}
                                        >
                                            Sim, Excluir
                                        </Button>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    )}
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

            {/* Listas de Categorias - Modo Grid 3 cols (Flat Layout) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 mt-8">
                {/* Coluna 1 — Despesas */}
                <section>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4 px-1 flex items-center gap-2 border-b border-border/50 pb-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-danger/50 inline-block" />
                        Despesas
                    </h3>
                    <div className="space-y-2">
                        {categories.filter(c => c.type === 'expense').length === 0 ? (
                            <p className="text-sm text-muted-foreground italic px-1 py-4">Nenhuma despesa encontrada.</p>
                        ) : (
                            categories.filter(c => c.type === 'expense').map(cat => (
                                <CategoryItem key={cat.id} cat={cat} />
                            ))
                        )}
                    </div>
                </section>

                {/* Coluna 2 — Receitas */}
                <section>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4 px-1 flex items-center gap-2 border-b border-border/50 pb-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-success/50 inline-block" />
                        Receitas
                    </h3>
                    <div className="space-y-2">
                        {categories.filter(c => c.type === 'income').length === 0 ? (
                            <p className="text-sm text-muted-foreground italic px-1 py-4">Nenhuma receita encontrada.</p>
                        ) : (
                            categories.filter(c => c.type === 'income').map(cat => (
                                <CategoryItem key={cat.id} cat={cat} />
                            ))
                        )}
                    </div>
                </section>

                {/* Coluna 3 — Objetivos */}
                <section>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4 px-1 flex items-center gap-2 border-b border-border/50 pb-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-info/50 inline-block" />
                        Objetivos
                    </h3>
                    <div className="space-y-2">
                        {categories.filter(c => c.type === 'expense' && c.budgetGroup === 'financial').length === 0 ? (
                            <p className="text-sm text-muted-foreground italic px-1 py-4">Nenhum objetivo encontrado.</p>
                        ) : (
                            categories.filter(c => c.type === 'expense' && c.budgetGroup === 'financial').map(cat => (
                                <CategoryItem key={cat.id} cat={cat} />
                            ))
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}



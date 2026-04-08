import { useState } from 'react';
import { useFinanceStore } from '@/hooks/useFinanceStore';
import { useCategories, useSubcategories, useCategoryGroups } from '@/hooks/useFinanceQueries';
import {
    useAddCategory,
    useDeleteCategory,
    useAddSubcategory,
    useDeleteSubcategory,
    useUpdateCategory,
    useUpdateSubcategory
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
    FolderTree,
    Layers,
    Check,
    X,
    Pencil
} from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
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
    const { mutate: updateSubcategory } = useUpdateSubcategory();

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

    const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');


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
    const CategoryAccordionItem = ({ cat }: { cat: Category }) => {
        const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
        const [editingSubId, setEditingSubId] = useState<string | null>(null);
        const [editingSubName, setEditingSubName] = useState('');

        const catSubs = subcategories.filter(sub => sub.categoryId === cat.id);

        const confirmEdit = (subId: string) => {
            if (!editingSubName.trim()) return;
            updateSubcategory({ id: subId, name: editingSubName.trim() });
            setEditingSubId(null);
        };

        return (
            <AccordionItem value={cat.id} className="border-none bg-muted/10 rounded-2xl overflow-hidden mb-2">
                <AccordionTrigger className="hover:no-underline px-4 py-2 flex-1 hover:bg-muted/30 transition-colors group [&[data-state=open]]:bg-muted/30 [&>svg]:hidden">
                    <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 shadow-sm" style={{ backgroundColor: cat.color }}>
                                <FolderTree className="w-4 h-4" />
                            </div>
                            <div className="flex flex-col items-start min-w-0">
                                <span className="font-bold text-sm truncate">{cat.name}</span>
                                <div className="flex items-center gap-2 mt-0.5">
                                    {cat.isFixed && (
                                        <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1 bg-background px-1.5 py-0.5 rounded-full">
                                            <Pin className="w-2.5 h-2.5" /> Fixa
                                        </span>
                                    )}
                                    <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground bg-background px-1.5 py-0.5 rounded-full">
                                        {catSubs.length} subs
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={(e) => e.stopPropagation()}>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    updateCategory({ id: cat.id, updates: { isFixed: !cat.isFixed } });
                                }}
                                className={cn(
                                    "p-1.5 rounded-lg transition-colors",
                                    cat.isFixed ? "text-primary hover:bg-muted" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                                title={cat.isFixed ? "Remover de Contas Fixas" : "Marcar como Conta Fixa"}
                            >
                                {cat.isFixed ? <Pin className="w-3.5 h-3.5" /> : <PinOff className="w-3.5 h-3.5" />}
                            </button>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const name = prompt('Nome da nova subcategoria:');
                                    if (name) handleAddSubcategory(cat.id, name);
                                }}
                                className="p-1.5 rounded-lg text-muted-foreground hover:bg-success/10 hover:text-success transition-colors"
                                title="Adicionar Subcategoria"
                            >
                                <Plus className="w-3.5 h-3.5" />
                            </button>

                            {['Renegociação', 'Fatura de Cartão de Crédito', 'Outros'].includes(cat.name) ? null : (
                                <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                                    <DialogTrigger asChild>
                                        <button
                                            onClick={(e) => e.stopPropagation()}
                                            className="p-1.5 rounded-lg text-muted-foreground hover:bg-danger/10 hover:text-danger transition-colors"
                                            title="Excluir Categoria"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-md rounded-3xl p-6" onClick={(e) => e.stopPropagation()}>
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
                                                <Button variant="outline" className="h-12 rounded-xl" onClick={(e) => { e.stopPropagation(); setIsDeleteDialogOpen(false); }}>
                                                    Cancelar
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    className="h-12 rounded-xl"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
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
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                    {catSubs.length === 0 ? (
                        <div className="flex flex-col items-center py-6 text-center">
                            <Layers className="w-5 h-5 text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">Nenhuma subcategoria</p>
                            <p className="text-xs text-muted-foreground/60">Clique em + para adicionar</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                            {catSubs.map(sub => (
                                editingSubId === sub.id ? (
                                    <div key={sub.id} className="flex items-center gap-2 p-2 rounded-2xl bg-muted/50 border-2 border-primary/30">
                                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                                        <Input
                                            value={editingSubName}
                                            onChange={(e) => setEditingSubName(e.target.value)}
                                            className="h-8 rounded-lg border-0 bg-transparent font-bold text-sm focus-visible:ring-0 p-0"
                                            autoFocus
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') confirmEdit(sub.id);
                                                if (e.key === 'Escape') setEditingSubId(null);
                                            }}
                                        />
                                        <button onClick={() => confirmEdit(sub.id)} className="p-1.5 rounded-lg text-primary hover:bg-primary/10 transition-all">
                                            <Check className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={() => setEditingSubId(null)} className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-all">
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ) : (
                                    <div key={sub.id} className="flex items-center justify-between p-3 rounded-2xl bg-muted/30 border border-transparent hover:border-border/50 transition-all group/sub">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                                            <span className="font-bold text-sm">{sub.name}</span>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover/sub:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => { setEditingSubId(sub.id); setEditingSubName(sub.name); }}
                                                className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all"
                                                title="Editar Subcategoria"
                                            >
                                                <Pencil className="w-3.5 h-3.5" />
                                            </button>
                                            <button onClick={() => deleteSubcategory(sub.id)} className="p-1.5 text-muted-foreground hover:bg-danger/10 hover:text-danger rounded-lg transition-colors">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                )
                            ))}
                        </div>
                    )}
                </AccordionContent>
            </AccordionItem>
        );
    };

    const expenseCategories = categories.filter(c => c.type === 'expense');
    const incomeCategories = categories.filter(c => c.type === 'income');

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
                                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Nome</Label>
                                    <Input
                                        value={newCatName}
                                        onChange={e => setNewCatName(e.target.value)}
                                        placeholder="Ex: Aluguel, Salário..."
                                        className="h-12 rounded-xl border-2 bg-muted/20 focus:bg-background transition-all font-bold"
                                    />
                                </div>

                                {newCatType === 'expense' && (
                                    <div className="space-y-2 animate-in slide-in-from-top-2">
                                        <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Grupo de Orçamento</Label>
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
                                        <span className="text-[11px] text-muted-foreground">Repete todos os meses</span>
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

            <div className="flex flex-col gap-6">
                <div className="flex gap-1 p-1 bg-muted rounded-2xl w-fit">
                    <button onClick={() => setActiveTab('expense')} className={cn('px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest transition-all', activeTab === 'expense' ? 'bg-background shadow-sm text-danger' : 'text-muted-foreground hover:text-foreground')}>
                        Despesas <span className="ml-2 text-[11px] bg-background/50 text-foreground rounded-full px-1.5 py-0.5">{expenseCategories.length}</span>
                    </button>
                    <button onClick={() => setActiveTab('income')} className={cn('px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest transition-all', activeTab === 'income' ? 'bg-background shadow-sm text-success' : 'text-muted-foreground hover:text-foreground')}>
                        Receitas <span className="ml-2 text-[11px] bg-background/50 text-foreground rounded-full px-1.5 py-0.5">{incomeCategories.length}</span>
                    </button>
                </div>

                <Accordion type="multiple" className="w-full">
                    {(activeTab === 'expense' ? expenseCategories : incomeCategories).length === 0 ? (
                        <p className="text-sm text-muted-foreground italic px-1 py-4">Nenhuma categoria encontrada.</p>
                    ) : (
                        (activeTab === 'expense' ? expenseCategories : incomeCategories).map(cat => (
                            <CategoryAccordionItem key={cat.id} cat={cat} />
                        ))
                    )}
                </Accordion>
            </div>
        </div>
    );
}

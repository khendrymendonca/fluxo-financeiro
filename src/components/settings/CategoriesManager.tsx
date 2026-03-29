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
    Plus,
    Trash2,
    Edit2,
    Settings2,
    FolderTree,
    Anchor,
    Pin,
    PinOff,
    Zap,
    TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
import { ColorSelector, APP_COLORS } from '@/components/ui/ColorSelector';
import { PageHeader } from '@/components/ui/PageHeader';
import { Switch } from '@/components/ui/switch';

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

    // New Subcategory State
    const [newSubName, setNewSubName] = useState('');
    const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);


    const handleAddCategory = () => {
        if (!newCatName) return;

        // Auto-assign group if income (or default)
        let groupId = newCatGroup;
        if (newCatType === 'income') {
            groupId = categoryGroups.find(g => g.name === 'Essenciais')?.id || ''; // Income is typically mapped to root available group     
        } else if (!groupId) {
            toast({ title: 'Selecione um grupo para a despesa', variant: 'destructive' });
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
        });
        setNewCatName('');
        setNewCatIsFixed(false);
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
        const [isAddingSub, setIsAddingSub] = useState(false);
        const [subName, setSubName] = useState('');

        return (
            <div className="group border-b border-border/30 last:border-0 py-1">
                <div className="flex items-center justify-between min-h-[44px] p-2 rounded-xl hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">{cat.name}</span>
                        {cat.isFixed && (
                            <div className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 text-[8px] font-black uppercase tracking-tighter flex items-center gap-0.5">
                                <Pin className="w-2.5 h-2.5" /> Fixa
                            </div>
                        )}
                    </div>
                    <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={() => updateCategory({ id: cat.id, updates: { isFixed: !cat.isFixed } })}
                            className={cn("p-2 rounded-lg transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center", cat.isFixed ? "text-amber-500 hover:bg-amber-500/10" : "text-muted-foreground hover:bg-muted")}
                            title={cat.isFixed ? "Remover de Contas Fixas" : "Marcar como Conta Fixa"}
                        >
                            {cat.isFixed ? <Pin className="w-4 h-4" /> : <PinOff className="w-4 h-4" />}
                        </button>
                        <button
                            onClick={() => setIsAddingSub(!isAddingSub)}
                            className="p-2 text-info hover:bg-info/10 rounded-lg min-h-[40px] min-w-[40px] flex items-center justify-center"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                        {['Renegociação', 'Fatura de Cartão de Crédito', 'Outros'].includes(cat.name) ? (
                            <div className="p-2 text-muted-foreground/30" title="Sistema">
                                <Trash2 className="w-4 h-4" />
                            </div>
                        ) : (
                            <button
                                onClick={() => deleteCategory(cat.id)}
                                className="p-2 text-danger hover:bg-danger/10 rounded-lg min-h-[40px] min-w-[40px] flex items-center justify-center"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {isAddingSub && (
                    <div className="flex gap-2 p-3 ml-4 mb-2 bg-muted/40 rounded-xl border border-border/50 animate-in slide-in-from-top-1">
                        <Input
                            placeholder="Nova subcategoria..."
                            value={subName}
                            onChange={e => setSubName(e.target.value)}
                            className="h-10 text-xs rounded-lg"
                            autoFocus
                        />
                        <Button
                            size="sm"
                            onClick={() => {
                                handleAddSubcategory(cat.id, subName);
                                setSubName('');
                                setIsAddingSub(false);
                            }}
                            className="h-10 text-xs px-4"
                        >
                            Salvar
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setIsAddingSub(false)}
                            className="h-10 text-xs"
                        >
                            X
                        </Button>
                    </div>
                )}

                <div className="ml-6 space-y-0.5 mt-0.5">
                    {subcategories.filter(s => s.categoryId === cat.id).map(sub => (
                        <div key={sub.id} className="flex items-center justify-between min-h-[36px] p-2 text-xs text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/30 group/sub transition-all">
                            <span className="font-medium">↳ {sub.name}</span>
                            <button
                                onClick={() => deleteSubcategory(sub.id)}
                                className="opacity-0 group-hover/sub:opacity-100 p-1.5 text-danger/70 hover:text-danger hover:bg-danger/10 rounded-lg"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
            <PageHeader title="Categorias e Orçamento" icon={Settings2} />


            {/* Criar Nova Categoria */}
            <div className="card-elevated p-6 space-y-6">
                <div className="flex items-center gap-2 mb-4">
                    <Plus className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-bold">Nova Categoria</h3>
                </div>

                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Tipo</Label>
                            <select className="w-full h-12 rounded-xl border-2 border-input bg-background px-4 text-sm font-bold" value={newCatType} onChange={e => setNewCatType(e.target.value as any)}>
                                <option value="expense">Despesa</option>
                                <option value="income">Receita</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label>Nome da Categoria</Label>
                            <Input value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="Ex: Farmácia" className="h-12 rounded-xl border-2" />
                        </div>

                        {newCatType === 'expense' && (
                            <div className="space-y-2">
                                <Label>Macro-Grupo de Orçamento</Label>
                                <select
                                    className="w-full h-12 rounded-xl border-2 border-input bg-background px-4 text-sm font-bold focus:border-primary transition-colors"
                                    value={newCatBudgetGroup}
                                    onChange={e => setNewCatBudgetGroup(e.target.value as BudgetGroup)}
                                    required
                                >
                                    <option value="essential">Essenciais (Custos de Vida)</option>
                                    <option value="lifestyle">Estilo de Vida (Desejos)</option>
                                    <option value="financial">Objetivos Financeiros</option>
                                </select>
                            </div>
                        )}

                        <div className="flex flex-col justify-end pb-1">
                            <div className="flex items-center gap-3 p-3 rounded-xl border-2 bg-muted/20 h-12">
                                <Switch checked={newCatIsFixed} onCheckedChange={setNewCatIsFixed} />
                                <div className="flex flex-col">
                                    <Label className="text-[10px] font-black uppercase leading-none">Conta Fixa</Label>
                                    <span className="text-[8px] text-muted-foreground">Ex: Aluguel, Internet</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <ColorSelector
                        label="Cor da Categoria"
                        selectedColor={newCatColor}
                        onSelect={setNewCatColor}
                    />

                    <Button onClick={handleAddCategory} className="w-full h-14 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-primary/20">
                        Adicionar Categoria
                    </Button>
                </div>
            </div>

            {/* Lista de Categorias Árvore */}
            <div className="card-elevated p-6 space-y-6">
                <div className="flex items-center gap-2 mb-4">
                    <FolderTree className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-bold">Painel de Categorias</h3>
                </div>

                <div className="flex flex-col md:grid md:grid-cols-3 gap-6">
                    {/* 1. Essenciais */}
                    <div className="card-elevated p-5 space-y-4 border-t-4 border-t-info bg-info/5 flex flex-col">
                        <h4 className="text-xs font-black uppercase tracking-widest text-info flex items-center gap-2 pb-2 border-b border-info/10">
                            <Zap className="w-4 h-4 fill-info/20" /> Essenciais
                        </h4>
                        <div className="flex-1 overflow-y-auto max-h-[500px] md:max-h-none scrollbar-hide py-2">
                            {categories.filter(c => c.type === 'expense' && c.budgetGroup === 'essential').length === 0 ? (
                                <p className="text-[10px] text-muted-foreground italic text-center py-8">Nenhuma categoria essencial.</p>
                            ) : (
                                categories.filter(c => c.type === 'expense' && c.budgetGroup === 'essential').map(cat => (
                                    <CategoryItem key={cat.id} cat={cat} />
                                ))
                            )}
                        </div>
                    </div>

                    {/* 2. Estilo de Vida */}
                    <div className="card-elevated p-5 space-y-4 border-t-4 border-t-amber-500 bg-amber-500/5 flex flex-col">
                        <h4 className="text-xs font-black uppercase tracking-widest text-amber-600 flex items-center gap-2 pb-2 border-b border-amber-500/10">
                            <Anchor className="w-4 h-4 fill-amber-500/20" /> Estilo de Vida
                        </h4>
                        <div className="flex-1 overflow-y-auto max-h-[500px] md:max-h-none scrollbar-hide py-2">
                            {categories.filter(c => c.type === 'expense' && c.budgetGroup === 'lifestyle').length === 0 ? (
                                <p className="text-[10px] text-muted-foreground italic text-center py-8">Nenhuma categoria de estilo de vida.</p>
                            ) : (
                                categories.filter(c => c.type === 'expense' && c.budgetGroup === 'lifestyle').map(cat => (
                                    <CategoryItem key={cat.id} cat={cat} />
                                ))
                            )}
                        </div>
                    </div>

                    {/* 3. Objetivos Financeiros */}
                    <div className="card-elevated p-5 space-y-4 border-t-4 border-t-success bg-success/5 flex flex-col">
                        <h4 className="text-xs font-black uppercase tracking-widest text-success flex items-center gap-2 pb-2 border-b border-success/10">
                            <TrendingUp className="w-4 h-4 fill-success/20" /> Objetivos
                        </h4>
                        <div className="flex-1 overflow-y-auto max-h-[500px] md:max-h-none scrollbar-hide py-2">
                            {categories.filter(c => c.type === 'expense' && c.budgetGroup === 'financial').length === 0 ? (
                                <p className="text-[10px] text-muted-foreground italic text-center py-8">Nenhum objetivo financeiro.</p>
                            ) : (
                                categories.filter(c => c.type === 'expense' && c.budgetGroup === 'financial').map(cat => (
                                    <CategoryItem key={cat.id} cat={cat} />
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Receitas - Bloco Separado */}
                <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="card-elevated p-6 space-y-4 border-l-4 border-l-success bg-success/5">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-sm font-black uppercase tracking-widest text-success flex items-center gap-2">
                                <Plus className="w-5 h-5" /> Minhas Receitas
                            </h4>
                            <span className="text-[10px] font-bold text-muted-foreground px-2 py-1 rounded-full bg-muted/50">Fluxo de Entrada</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {categories.filter(c => c.type === 'income').length === 0 ? (
                                <p className="col-span-full text-xs text-muted-foreground italic text-center py-4">Clique no botão superior para adicionar receitas.</p>
                            ) : (
                                categories.filter(c => c.type === 'income').map(cat => (
                                    <div key={cat.id} className="flex items-center justify-between p-3 rounded-xl border-2 hover:border-success/30 transition-all group bg-background min-h-[52px] shadow-sm">
                                        <span className="font-bold text-sm">{cat.name}</span>
                                        <button onClick={() => deleteCategory(cat.id)} className="opacity-0 group-hover:opacity-100 p-2 text-danger hover:bg-danger/10 rounded-lg transition-all min-h-[40px] min-w-[40px] flex items-center justify-center">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}



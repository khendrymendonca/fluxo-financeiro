import { useState } from 'react';
import { useFinanceStore } from '@/hooks/useFinanceStore';
import { useCategories, useSubcategories, useCategoryGroups } from '@/hooks/useFinanceQueries';
import {
    useAddCategory,
    useDeleteCategory,
    useAddSubcategory,
    useDeleteSubcategory
} from '@/hooks/useCategoryMutations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Edit2, Settings2, FolderTree } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
import { ColorSelector, APP_COLORS } from '@/components/ui/ColorSelector';

export function CategoriesManager() {
    // Queries
    const { data: categories = [] } = useCategories();
    const { data: subcategories = [] } = useSubcategories();
    const { data: categoryGroups = [] } = useCategoryGroups();

    // Mutations
    const { mutate: addCategory } = useAddCategory();
    const { mutate: deleteCategory } = useDeleteCategory();
    const { mutate: addSubcategory } = useAddSubcategory();
    const { mutate: deleteSubcategory } = useDeleteSubcategory();

    // New Category State
    const [newCatName, setNewCatName] = useState('');
    const [newCatType, setNewCatType] = useState<'expense' | 'income'>('expense');
    const [newCatGroup, setNewCatGroup] = useState<string>('');
    const [newCatColor, setNewCatColor] = useState(APP_COLORS[0]);

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
            icon: 'Tag',
            color: newCatColor,
            isActive: true
        });
        setNewCatName('');
    };

    const handleAddSubcategory = () => {
        if (!newSubName || !activeCategoryId) return;
        addSubcategory({
            categoryId: activeCategoryId,
            name: newSubName,
            isActive: true
        });
        setNewSubName('');
        setActiveCategoryId(null);
    };

    return (
        <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">

            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                    <Settings2 className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold">Gestão de Categorias e Orçamento</h2>
                    <p className="text-muted-foreground">Personalize sua estrutura financeira e a regra do seu Coach.</p>
                </div>
            </div>


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
                                <Label>Grupo do Orçamento</Label>
                                <select className="w-full h-12 rounded-xl border-2 border-input bg-background px-4 text-sm font-bold" value={newCatGroup} onChange={e => setNewCatGroup(e.target.value)}>
                                    <option value="">Selecione...</option>
                                    {categoryGroups.map(g => (
                                        <option key={g.id} value={g.id}>
                                            {g.name === 'Essenciais' ? 'Essencial (Necessidade)' : g.name === 'Estilo de Vida' ? 'Desejos (Estilo de Vida)' : 'Metas (Investimentos)'}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
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

                <div className="grid md:grid-cols-2 gap-8">

                    {/* Expenses */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-bold uppercase tracking-wider text-danger flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-danger" /> Despesas
                        </h4>

                        {categoryGroups.map(group => {
                            const groupCats = categories.filter(c => c.type === 'expense' && c.groupId === group.id);
                            if (groupCats.length === 0) return null;

                            const groupNameDisplay = group.name === 'Essenciais' ? 'Essenciais (Moradia, Contas)' : group.name === 'Estilo de Vida' ? 'Estilo de Vida (Desejos)' : 'Metas (Poupança)';

                            return (
                                <div key={group.id} className="space-y-2">
                                    <p className="text-xs font-semibold text-muted-foreground bg-muted/50 p-2 rounded-lg">{groupNameDisplay}</p>
                                    <div className="space-y-2 pl-2 border-l-2 border-muted ml-2">
                                        {groupCats.map(cat => (
                                            <div key={cat.id} className="group">
                                                <div className="flex items-center justify-between p-2 rounded-xl hover:bg-muted/50 transition-colors">
                                                    <span className="font-medium text-sm">{cat.name}</span>
                                                    <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => setActiveCategoryId(cat.id)} className="p-1.5 text-info hover:bg-info/10 rounded-lg"><Plus className="w-3.5 h-3.5" /></button>
                                                        {['Renegociação', 'Fatura de Cartão de Crédito', 'Outros'].includes(cat.name) ? (
                                                            <div className="p-1.5 text-muted-foreground/30" title="Categorias de sistema não podem ser excluídas">
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </div>
                                                        ) : (
                                                            <button onClick={() => deleteCategory(cat.id)} className="p-1.5 text-danger hover:bg-danger/10 rounded-lg" title="Excluir categoria">
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Subcategories inline add */}
                                                {activeCategoryId === cat.id && (
                                                    <div className="flex gap-2 p-2 ml-4 mb-2 bg-muted/30 rounded-lg">
                                                        <Input placeholder="Nova subcategoria..." value={newSubName} onChange={e => setNewSubName(e.target.value)} className="h-8 text-xs" />
                                                        <Button size="sm" onClick={handleAddSubcategory} className="h-8 text-xs">Salvar</Button>
                                                        <Button size="sm" variant="ghost" onClick={() => setActiveCategoryId(null)} className="h-8 text-xs">Cancelar</Button>
                                                    </div>
                                                )}

                                                {/* Listed Subcategories */}
                                                <div className="ml-6 space-y-1">
                                                    {subcategories.filter(s => s.categoryId === cat.id).map(sub => (
                                                        <div key={sub.id} className="flex items-center justify-between p-1.5 text-xs text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/30 group/sub">
                                                            <span>↳ {sub.name}</span>
                                                            <button onClick={() => deleteSubcategory(sub.id)} className="opacity-100 md:opacity-0 md:group-hover/sub:opacity-100 text-danger/70 hover:text-danger pr-2 px-2"><Trash2 className="w-3 h-3" /></button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Incomes */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-bold uppercase tracking-wider text-success flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-success" /> Receitas
                        </h4>
                        <div className="space-y-2">
                            {categories.filter(c => c.type === 'income').map(cat => (
                                <div key={cat.id} className="flex items-center justify-between p-2 rounded-xl border hover:border-success/30 transition-colors group">
                                    <span className="font-medium text-sm">{cat.name}</span>
                                    {['Renegociação', 'Fatura de Cartão de Crédito', 'Outros'].includes(cat.name) ? (
                                        <div className="p-1.5 text-muted-foreground/30" title="Categorias de sistema não podem ser excluídas">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </div>
                                    ) : (
                                        <button onClick={() => deleteCategory(cat.id)} className="opacity-100 md:opacity-0 md:group-hover:opacity-100 p-1.5 text-danger hover:bg-danger/10 rounded-lg" title="Excluir categoria">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}



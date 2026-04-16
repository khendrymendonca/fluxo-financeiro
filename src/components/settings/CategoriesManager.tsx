import { useState, useMemo } from 'react';
import { useCategories, useSubcategories, useCategoryGroups } from '@/hooks/useFinanceQueries';
import {
    useAddCategory,
    useDeleteCategory,
    useAddSubcategory,
    useDeleteSubcategory,
    useUpdateCategory,
} from '@/hooks/useCategoryMutations';
import { BudgetGroup, Category } from '@/types/finance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    LayoutGrid,
    Plus,
    Trash2,
    Pin,
    Layers,
    Pencil,
    ShieldCheck,
    Heart,
    Star
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
import { ColorSelector, APP_COLORS } from '@/components/ui/ColorSelector';
import { IconSelector, IconRenderer } from '@/components/ui/IconSelector';
import { PageHeader } from '@/components/ui/PageHeader';
import { Switch } from '@/components/ui/switch';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

export function CategoriesManager() {
    const { data: categories = [] } = useCategories();
    const { data: subcategories = [] } = useSubcategories();
    const { data: categoryGroups = [] } = useCategoryGroups();

    const { mutate: addCategory } = useAddCategory();
    const { mutate: updateCategory } = useUpdateCategory();
    const { mutate: deleteCategory } = useDeleteCategory();

    const [newCatName, setNewCatName] = useState('');
    const [newCatType, setNewCatType] = useState<'expense' | 'income'>('expense');
    const [newCatBudgetGroup, setNewCatBudgetGroup] = useState<BudgetGroup>('essential');
    const [newCatColor, setNewCatColor] = useState(APP_COLORS[0]);
    const [newCatIcon, setNewCatIcon] = useState('Tag');
    const [newCatIsFixed, setNewCatIsFixed] = useState(false);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');

    const groupedCategories = useMemo(() => {
        const filtered = categories.filter(c => c.type === activeTab);
        return {
            essential: filtered.filter(c => c.budgetGroup === 'essential').sort((a, b) => a.name.localeCompare(b.name)),
            lifestyle: filtered.filter(c => c.budgetGroup === 'lifestyle').sort((a, b) => a.name.localeCompare(b.name)),
            financial: filtered.filter(c => c.budgetGroup === 'financial').sort((a, b) => a.name.localeCompare(b.name)),
            income: filtered.filter(c => c.budgetGroup === 'income').sort((a, b) => a.name.localeCompare(b.name)),
        };
    }, [categories, activeTab]);

    const handleAddCategory = () => {
        if (!newCatName) {
            toast({ title: 'Digite o nome da categoria', variant: 'destructive' });
            return;
        }
        const groupId = categoryGroups[0]?.id;
        if (!groupId) return;

        addCategory({
            name: newCatName,
            type: newCatType,
            groupId: groupId,
            budgetGroup: newCatType === 'income' ? 'income' : newCatBudgetGroup,
            icon: newCatIcon,
            color: newCatColor,
            isActive: true,
            isFixed: newCatIsFixed,
            budgetLimit: null
        }, {
            onSuccess: () => {
                setNewCatName('');
                setNewCatIsFixed(false);
                setIsModalOpen(false);
            }
        });
    };

    const CategoryCard = ({ cat }: { cat: Category }) => (
        <button 
            onClick={() => setEditingCategory(cat)}
            className="group flex flex-col items-center justify-center p-5 md:p-8 rounded-[2rem] md:rounded-[3rem] bg-background border border-border/40 hover:border-primary/40 hover:shadow-xl transition-all duration-700 active:scale-95 w-full aspect-square shadow-sm"
        >
            <div 
                className="w-14 h-14 md:w-20 md:h-20 rounded-[1.5rem] md:rounded-[2rem] flex items-center justify-center text-white mb-4 md:mb-6 transition-all duration-700 group-hover:scale-110 group-hover:rotate-6 shadow-xl"
                style={{ backgroundColor: cat.color }}
            >
                <IconRenderer iconName={cat.icon || 'Tag'} className="w-8 h-8 md:w-10 md:h-10 stroke-[2.5px]" />
            </div>
            
            <p className="font-black text-[10px] md:text-[12px] uppercase tracking-[0.2em] text-foreground text-center group-hover:text-primary transition-colors truncate w-full px-2">
                {cat.name}
            </p>
            {cat.isFixed && <div className="mt-2 md:mt-3 h-1 w-4 md:w-6 rounded-full bg-primary/20" />}
        </button>
    );

    const SectionHeader = ({ title, icon: Icon, cats, description }: { title: string, icon: any, cats: Category[], description: string }) => {
        if (cats.length === 0 && activeTab === 'expense') return null;
        if (activeTab === 'income' && title !== 'Receitas') return null;

        return (
            <div className="space-y-8 md:space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-muted/10 flex items-center justify-center text-primary border border-border/30">
                            <Icon className="w-5 h-5 md:w-6 md:h-6" />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-xs md:text-sm font-black uppercase tracking-[0.4em] text-foreground">{title}</h2>
                            <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mt-0.5">{description}</p>
                        </div>
                    </div>
                    <div className="h-px bg-gradient-to-r from-border via-border/50 to-transparent" />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-6 md:gap-12">
                    {cats.map(cat => <CategoryCard key={cat.id} cat={cat} />)}
                </div>
            </div>
        );
    };

    return (
        <div className="animate-fade-in max-w-[1800px] mx-auto pb-48 px-6 md:px-16 space-y-16 md:space-y-24">
            <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-10 pt-8 md:pt-12">
                <div className="space-y-6 md:space-y-8">
                    <PageHeader title="Arquitetura" icon={LayoutGrid} />
                    <div className="flex gap-8 md:gap-10">
                        <button onClick={() => setActiveTab('expense')} className={cn('text-[11px] md:text-[13px] font-black uppercase tracking-[0.3em] pb-3 md:pb-4 transition-all relative', activeTab === 'expense' ? 'text-danger' : 'text-muted-foreground/30 hover:text-foreground')}>
                            Despesas {activeTab === 'expense' && <div className="absolute bottom-0 left-0 right-0 h-0.5 md:h-1 bg-danger animate-in slide-in-from-left duration-700" />}
                        </button>
                        <button onClick={() => setActiveTab('income')} className={cn('text-[11px] md:text-[13px] font-black uppercase tracking-[0.3em] pb-3 md:pb-4 transition-all relative', activeTab === 'income' ? 'text-success' : 'text-muted-foreground/30 hover:text-foreground')}>
                            Receitas {activeTab === 'income' && <div className="absolute bottom-0 left-0 right-0 h-0.5 md:h-1 bg-success animate-in slide-in-from-left duration-700" />}
                        </button>
                    </div>
                </div>

                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                    <DialogTrigger asChild>
                        <Button className="h-14 md:h-16 px-10 md:px-12 rounded-full font-black uppercase tracking-[0.2em] flex items-center gap-4 bg-primary text-white shadow-xl hover:scale-105 transition-all active:scale-95">
                            <Plus className="w-5 h-5 md:w-6 md:h-6" /> Nova Categoria
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="w-[92vw] max-w-md rounded-[2.5rem] md:rounded-[4rem] p-8 md:p-12 border-none shadow-2xl bg-background overflow-y-auto max-h-[90vh] custom-scrollbar" aria-describedby={undefined}>
                        <DialogHeader className="mb-8 md:mb-10 text-center">
                            <DialogTitle className="text-xl md:text-2xl font-black uppercase tracking-[0.3em] text-primary">Nova Estrutura</DialogTitle>
                        </DialogHeader>

                        <div className="space-y-8 md:space-y-10">
                            <div className="flex p-1.5 md:p-2 bg-muted/30 rounded-full border border-border/40">
                                <button onClick={() => setNewCatType('expense')} className={cn("flex-1 py-3 md:py-4 rounded-full text-[10px] md:text-[11px] font-black uppercase tracking-widest transition-all", newCatType === 'expense' ? "bg-background text-danger shadow-xl" : "text-muted-foreground")}>Despesa</button>
                                <button onClick={() => setNewCatType('income')} className={cn("flex-1 py-3 md:py-4 rounded-full text-[10px] md:text-[11px] font-black uppercase tracking-widest transition-all", newCatType === 'income' ? "bg-background text-success shadow-xl" : "text-muted-foreground")}>Receita</button>
                            </div>

                            <div className="space-y-6 md:space-y-8">
                                <div className="space-y-3">
                                    <Label className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] opacity-40 ml-1 text-center block">Nome da Estrutura</Label>
                                    <Input value={newCatName} onChange={e => setNewCatName(e.target.value)} className="h-14 md:h-16 rounded-[1.5rem] border-none bg-muted/20 focus:bg-muted/40 font-bold text-base md:text-lg text-center" />
                                </div>

                                {newCatType === 'expense' && (
                                    <div className="space-y-3">
                                        <Label className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] opacity-40 ml-1 text-center block">Filtro de Vida</Label>
                                        <select className="w-full h-14 md:h-16 rounded-[1.5rem] border-none bg-muted/20 px-6 text-xs md:text-sm font-black uppercase tracking-widest text-center appearance-none" value={newCatBudgetGroup} onChange={e => setNewCatBudgetGroup(e.target.value as BudgetGroup)}>
                                            <option value="essential">1. Essenciais</option>
                                            <option value="lifestyle">2. Estilo de Vida</option>
                                            <option value="financial">3. Objetivos</option>
                                        </select>
                                    </div>
                                )}

                                <IconSelector label="Ícone" selectedIcon={newCatIcon} onSelect={setNewCatIcon} color={newCatColor} />
                                <ColorSelector label="Paleta" selectedColor={newCatColor} onSelect={setNewCatColor} />
                            </div>

                            <Button onClick={handleAddCategory} className="w-full h-16 md:h-20 rounded-full font-black uppercase tracking-[0.3em] shadow-2xl shadow-primary/30 text-base md:text-lg hover:scale-105 transition-all">Finalizar Registro</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </header>

            <div className="space-y-24 md:space-y-32">
                {activeTab === 'expense' ? (
                    <>
                        <CategorySection title="Essenciais" description="Base da sobrevivência e obrigações inadiáveis" icon={ShieldCheck} cats={groupedCategories.essential} />
                        <CategorySection title="Estilo de Vida" description="Prazer, missão, criatividade e lazer ajustável" icon={Heart} cats={groupedCategories.lifestyle} />
                        <CategorySection title="Objetivos" description="Patrimônio, reservas e obrigações financeiras secas" icon={Star} cats={groupedCategories.financial} />
                    </>
                ) : (
                    <CategorySection title="Receitas" description="Fontes de entrada e fluxo de caixa" icon={Star} cats={groupedCategories.income} />
                )}

                {categories.filter(c => c.type === activeTab).length === 0 && (
                    <div className="py-32 md:py-48 text-center bg-muted/5 rounded-[3rem] md:rounded-[5rem] border-2 border-dashed border-border/40">
                        <LayoutGrid className="w-16 h-16 md:w-20 md:h-20 text-muted-foreground/10 mx-auto mb-8" />
                        <p className="text-sm md:text-base font-black text-muted-foreground/30 uppercase tracking-[0.5em]">Arquitete seu fluxo</p>
                    </div>
                )}
            </div>

            {editingCategory && (
                <EditCategoryDialog 
                    category={editingCategory} 
                    onClose={() => setEditingCategory(null)} 
                />
            )}
        </div>
    );
}

function EditCategoryDialog({ category, onClose }: { category: Category; onClose: () => void; }) {
    const { mutate: updateCategory } = useUpdateCategory();
    const { mutate: deleteCategory } = useDeleteCategory();
    const { mutate: addSubcategory } = useAddSubcategory();
    const { mutate: deleteSubcategory } = useDeleteSubcategory();
    const { data: subcategories = [] } = useSubcategories();
    
    const [name, setName] = useState(category.name);
    const [color, setColor] = useState(category.color);
    const [icon, setIcon] = useState(category.icon || 'Tag');
    const [isFixed, setIsFixed] = useState(category.isFixed);
    const [budgetGroup, setBudgetGroup] = useState<BudgetGroup>(category.budgetGroup);
    const [newSubName, setNewSubName] = useState('');
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const catSubs = subcategories.filter(sub => sub.categoryId === category.id);

    const handleSave = () => {
        if (!name.trim()) return;
        updateCategory({
            id: category.id,
            updates: { name: name.trim(), color, icon, isFixed, budgetGroup }
        }, { onSuccess: onClose });
    };

    const handleAddSub = () => {
        if (!newSubName.trim()) return;
        addSubcategory({ categoryId: category.id, name: newSubName.trim(), isActive: true });
        setNewSubName('');
    };

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="w-[94vw] max-w-6xl rounded-[2.5rem] md:rounded-[4rem] p-0 overflow-hidden border-none shadow-2xl bg-background overflow-y-auto max-h-[90vh] custom-scrollbar" aria-describedby={undefined}>
                <div className="grid grid-cols-1 md:grid-cols-2 h-full">
                    <div className="p-8 md:p-16 space-y-10 bg-muted/5 border-b md:border-b-0 md:border-r border-border/30">
                        <DialogHeader>
                            <DialogTitle className="text-xl md:text-2xl font-black uppercase tracking-[0.4em] text-primary">Configuração</DialogTitle>
                        </DialogHeader>

                        <div className="space-y-8">
                            <div className="space-y-3">
                                <Label className="text-[10px] md:text-[12px] font-black uppercase tracking-[0.3em] opacity-40 ml-1">Título da Estrutura</Label>
                                <Input value={name} onChange={e => setName(e.target.value)} className="h-14 md:h-16 rounded-[1.5rem] border-none bg-background shadow-xl font-black uppercase tracking-widest text-base md:text-lg px-6 md:px-8" />
                            </div>

                            {category.type === 'expense' && (
                                <div className="space-y-3">
                                    <Label className="text-[10px] md:text-[12px] font-black uppercase tracking-[0.3em] opacity-40 ml-1">Relevância</Label>
                                    <select className="w-full h-14 md:h-16 rounded-[1.5rem] border-none bg-background shadow-xl px-6 md:px-8 text-xs md:text-sm font-black uppercase tracking-widest appearance-none" value={budgetGroup} onChange={e => setBudgetGroup(e.target.value as BudgetGroup)}>
                                        <option value="essential">1. Essenciais</option>
                                        <option value="lifestyle">2. Estilo de Vida</option>
                                        <option value="financial">3. Objetivos</option>
                                    </select>
                                </div>
                            )}

                            <div className="flex items-center justify-between p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] bg-background shadow-xl border border-border/20">
                                <Label className="text-[10px] md:text-[12px] font-black uppercase tracking-[0.2em]">Conta Fixa</Label>
                                <Switch checked={isFixed} onCheckedChange={setIsFixed} />
                            </div>

                            <IconSelector label="Ícone" selectedIcon={icon} onSelect={setIcon} color={color} />
                            <ColorSelector label="Paleta" selectedColor={color} onSelect={setColor} />
                        </div>

                        <div className="flex gap-4 pt-6">
                           <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="ghost" className="h-16 md:h-20 rounded-[1.5rem] md:rounded-[2rem] px-6 md:px-8 text-danger/20 hover:text-danger hover:bg-danger/5 transition-all"><Trash2 className="w-6 h-6" /></Button>
                                </DialogTrigger>
                                <DialogContent className="rounded-[3rem] p-10 md:p-16 text-center border-none">
                                    <DialogHeader>
                                        <DialogTitle className="text-xl md:text-3xl font-black text-danger uppercase tracking-[0.3em] mb-4">Remover?</DialogTitle>
                                        <DialogDescription className="text-xs md:text-base font-bold text-muted-foreground uppercase leading-relaxed tracking-widest px-2">
                                            A categoria <strong className="text-foreground">{category.name}</strong> será apagada.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="flex gap-4 mt-10 md:mt-16">
                                        <Button variant="outline" className="flex-1 h-14 md:h-16 rounded-full font-black uppercase tracking-widest" onClick={() => setIsDeleteDialogOpen(false)}>Manter</Button>
                                        <Button variant="destructive" className="flex-1 h-14 md:h-16 rounded-full font-black uppercase tracking-widest" onClick={() => { deleteCategory(category.id); onClose(); }}>Apagar</Button>
                                    </div>
                                </DialogContent>
                           </Dialog>
                            <Button onClick={handleSave} className="flex-1 h-16 md:h-20 rounded-[1.5rem] md:rounded-[2rem] font-black uppercase tracking-[0.4em] shadow-xl shadow-primary/20 text-base md:text-lg hover:scale-105 transition-all">Salvar</Button>
                        </div>
                    </div>

                    <div className="p-8 md:p-16 space-y-10 bg-background overflow-y-auto">
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <Label className="text-[10px] md:text-[12px] font-black uppercase tracking-[0.3em] opacity-40">Subestruturas</Label>
                                <div className="px-3 md:px-4 py-1 bg-muted rounded-full font-black text-[10px] md:text-[12px] opacity-60">{catSubs.length}</div>
                            </div>
                            <div className="flex gap-3">
                                <Input placeholder="Nova sub..." value={newSubName} onChange={e => setNewSubName(e.target.value)} className="h-14 md:h-16 rounded-[1.2rem] md:rounded-[1.5rem] bg-muted/20 border-none font-bold px-6" onKeyDown={(e) => e.key === 'Enter' && handleAddSub()} />
                                <Button onClick={handleAddSub} className="h-14 w-14 md:h-16 md:w-16 rounded-[1.2rem] md:rounded-[1.5rem] shrink-0 bg-primary/10 text-primary hover:bg-primary/20 transition-all shadow-sm"><Plus className="w-6 h-6 md:w-8 md:h-8" /></Button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3 md:gap-4 pb-12 md:pb-0">
                            {catSubs.length === 0 ? (
                                <div className="py-24 md:py-32 text-center border-2 border-dashed border-muted/20 rounded-[2.5rem] md:rounded-[3rem] opacity-20">
                                    <Layers className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-4 md:mb-6" />
                                    <span className="text-[10px] md:text-[12px] font-black uppercase tracking-[0.4em]">Arquitetura Vazia</span>
                                </div>
                            ) : (
                                catSubs.map(sub => (
                                    <div key={sub.id} className="flex items-center justify-between p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] bg-muted/5 border border-transparent hover:border-border/40 group/sub transition-all duration-500">
                                        <span className="text-sm md:text-base font-black uppercase tracking-widest pl-2 opacity-70">{sub.name}</span>
                                        <button onClick={() => deleteSubcategory(sub.id)} className="p-2 md:p-3 rounded-xl md:rounded-2xl text-muted-foreground/10 hover:text-danger hover:bg-danger/5 opacity-100 md:opacity-0 group-hover/sub:opacity-100 transition-all">
                                            <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

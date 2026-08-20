import { useState, useMemo, useEffect } from 'react';
import { useCategories, useSubcategories, useCategoryGroups } from '@/hooks/useFinanceQueries';
import {
    useAddCategory,
    useDeleteCategory,
    useAddSubcategory,
    useDeleteSubcategory,
    useUpdateCategory,
    useUpdateSubcategory,
} from '@/hooks/useCategoryMutations';
import { Category, Subcategory } from '@/types/finance';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    LayoutGrid,
    Plus,
    Trash2,
    Pin,
    Layers,
    ArrowDownCircle,
    ArrowUpCircle,
    Pencil,
    Check,
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

// ─── CARD DE CATEGORIA ────────────────────────────────────────────────────────
function CategoryCard({ cat, onClick }: { cat: Category; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="group flex flex-col items-center justify-start gap-3 p-4 md:p-5 rounded-[1.75rem] md:rounded-[2rem] bg-background border border-border/40 hover:border-primary/30 hover:shadow-xl transition-all duration-500 active:scale-95 w-full min-h-[130px] md:min-h-[150px] shadow-sm relative"
        >
            <div
                className="w-12 h-12 md:w-14 md:h-14 rounded-[1.2rem] md:rounded-[1.5rem] flex items-center justify-center text-white transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 shadow-md shrink-0 mt-1"
                style={{ backgroundColor: cat.color }}
            >
                <IconRenderer iconName={cat.icon || 'Tag'} className="w-6 h-6 md:w-7 md:h-7 stroke-[2px]" />
            </div>

            <p
                lang="pt-BR"
                className="font-black text-[9px] md:text-[10px] uppercase tracking-wider text-foreground text-center group-hover:text-primary transition-colors leading-tight line-clamp-2 break-words [hyphens:auto] [-webkit-hyphens:auto] w-full px-1"
            >
                {cat.name}
            </p>

            {cat.isFixed && (
                <div className="absolute top-2.5 right-2.5 opacity-25">
                    <Pin className="w-3 h-3 fill-current text-primary" />
                </div>
            )}
        </button>
    );
}

// ─── SEÇÃO DE CATEGORIAS ──────────────────────────────────────────────────────
function CategorySection({
    title,
    description,
    icon: Icon,
    cats,
    onSelect,
}: {
    title: string;
    description: string;
    icon: React.ElementType;
    cats: Category[];
    onSelect: (cat: Category) => void;
}) {
    if (cats.length === 0) return null;

    return (
        <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col gap-3">
                <div className="flex items-center gap-4">
                    <div className="w-9 h-9 md:w-11 md:h-11 rounded-xl md:rounded-2xl bg-muted/10 flex items-center justify-center text-primary border border-border/20 shrink-0">
                        <Icon className="w-4 h-4 md:w-5 md:h-5" />
                    </div>
                    <div>
                        <h2 className="text-[11px] md:text-sm font-black uppercase tracking-[0.3em] text-foreground">{title}</h2>
                        <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 mt-0.5">{description}</p>
                    </div>
                </div>
                <div className="h-px bg-gradient-to-r from-border/60 via-border/20 to-transparent" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                {cats.map(cat => (
                    <CategoryCard key={cat.id} cat={cat} onClick={() => onSelect(cat)} />
                ))}
            </div>
        </div>
    );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export function CategoriesManager() {
    const { data: categories = [] } = useCategories();
    const { data: categoryGroups = [] } = useCategoryGroups();

    const { mutate: addCategory } = useAddCategory();
    const { mutate: deleteCategory } = useDeleteCategory();
    const { mutate: addSubcategory } = useAddSubcategory();
    const { mutate: deleteSubcategory } = useDeleteSubcategory();

    const [newCatName, setNewCatName] = useState('');
    const [newCatType, setNewCatType] = useState<'expense' | 'income'>('expense');
    const [newCatColor, setNewCatColor] = useState(APP_COLORS[0]);
    const [newCatIcon, setNewCatIcon] = useState('Tag');
    const [newCatIsFixed, setNewCatIsFixed] = useState(false);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');

    const filteredCategories = useMemo(() => {
        return categories
            // Categorias nativas do sistema (ex: "Abatimento no Cartão") são criadas e geridas
            // automaticamente — não aparecem nem podem ser editadas nesta tela.
            .filter(c => !c.isSystem)
            .filter(c => c.type === activeTab)
            .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    }, [categories, activeTab]);

    const handleAddCategory = () => {
        if (!newCatName.trim()) {
            toast({ title: 'Digite o nome da categoria', variant: 'destructive' });
            return;
        }
        const groupId = categoryGroups[0]?.id || null;
        addCategory({
            name: newCatName.trim(),
            type: newCatType,
            groupId,
            budgetGroup: newCatType === 'income' ? 'income' : 'essential',
            icon: newCatIcon,
            color: newCatColor,
            isActive: true,
            isFixed: newCatIsFixed,
            budgetLimit: null,
        }, {
            onSuccess: () => {
                setNewCatName('');
                setNewCatIsFixed(false);
                setNewCatIcon('Tag');
                setIsModalOpen(false);
            },
        });
    };

    const hasCategories = filteredCategories.length > 0;

    return (
        <div className="animate-fade-in w-full max-w-5xl mx-auto pb-24 px-4 md:px-8 space-y-12 md:space-y-16">

            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pt-6 md:pt-10 border-b border-border/20 pb-8">
                <div className="space-y-5">
                    <div className="flex items-center gap-4">
                        <PageHeader title="Gestão de Categorias" icon={LayoutGrid} />
                    </div>

                    <div className="flex gap-8">
                        {(['expense', 'income'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={cn(
                                    'text-[11px] font-black uppercase tracking-[0.25em] pb-3 transition-all relative',
                                    activeTab === tab
                                        ? tab === 'expense' ? 'text-danger' : 'text-success'
                                        : 'text-muted-foreground/40 hover:text-foreground'
                                )}
                            >
                                {tab === 'expense' ? 'Despesas' : 'Receitas'}
                                {activeTab === tab && (
                                    <div className={cn(
                                        'absolute bottom-0 left-0 right-0 h-0.5 rounded-full',
                                        tab === 'expense' ? 'bg-danger' : 'bg-success'
                                    )} />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                    <DialogTrigger asChild>
                        <Button className="h-12 md:h-14 px-6 md:px-8 rounded-xl md:rounded-2xl font-black uppercase tracking-widest flex items-center gap-3 shadow-md bg-primary text-white hover:bg-primary/90 transition-all active:scale-95">
                            <Plus className="w-4 h-4 md:w-5 md:h-5" /> Nova Categoria
                        </Button>
                    </DialogTrigger>

                    <DialogContent
                        className="w-[92vw] max-w-sm sm:max-w-md md:max-w-lg rounded-[1.75rem] md:rounded-[2.5rem] p-0 border-none shadow-2xl bg-background overflow-hidden max-h-[90dvh] flex flex-col"
                        aria-describedby={undefined}
                    >
                        <DialogHeader className="px-6 pt-7 pb-5 border-b border-border/20 shrink-0">
                            <DialogTitle className="text-sm font-black uppercase tracking-widest text-primary">
                                Nova Categoria
                            </DialogTitle>
                        </DialogHeader>

                        <div className="px-4 sm:px-6 py-4 sm:py-6 space-y-4 flex-1 overflow-y-auto min-h-0">
                            <div className="flex p-1 bg-muted/30 rounded-xl border border-border/30">
                                {(['expense', 'income'] as const).map(t => (
                                    <button
                                        key={t}
                                        onClick={() => setNewCatType(t)}
                                        className={cn(
                                            'flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all',
                                            newCatType === t
                                                ? cn('bg-background shadow-md', t === 'expense' ? 'text-danger' : 'text-success')
                                                : 'text-muted-foreground'
                                        )}
                                    >
                                        {t === 'expense' ? 'Despesa' : 'Receita'}
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Nome</Label>
                                <Input
                                    value={newCatName}
                                    onChange={e => setNewCatName(e.target.value)}
                                    placeholder="Ex: Alimentação, Salário..."
                                    className="h-11 rounded-xl border border-border/50 bg-muted/10 focus:bg-background transition-all font-bold px-4"
                                    onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                                />
                            </div>

                            <IconSelector label="Ícone" selectedIcon={newCatIcon} onSelect={setNewCatIcon} color={newCatColor} />
                            <ColorSelector label="Cor" selectedColor={newCatColor} onSelect={setNewCatColor} />

                            <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/10 border border-border/20">
                                <Label className="text-[10px] font-black uppercase tracking-widest">Conta Fixa</Label>
                                <Switch checked={newCatIsFixed} onCheckedChange={setNewCatIsFixed} />
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-border/20 shrink-0">
                            <Button
                                onClick={handleAddCategory}
                                className="w-full h-12 rounded-xl font-black uppercase tracking-widest shadow-md hover:scale-[1.02] transition-all"
                            >
                                Criar Categoria
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {hasCategories ? (
                <div className="space-y-8">
                    <CategorySection
                        title={activeTab === 'expense' ? 'Categorias de Despesa' : 'Categorias de Receita'}
                        description={`${filteredCategories.length} ${filteredCategories.length === 1 ? 'categoria cadastrada' : 'categorias cadastradas'}`}
                        icon={activeTab === 'expense' ? ArrowDownCircle : ArrowUpCircle}
                        cats={filteredCategories}
                        onSelect={setEditingCategory}
                    />
                </div>
            ) : (
                <div className="py-28 text-center bg-muted/5 rounded-[2.5rem] border-2 border-dashed border-border/30">
                    <LayoutGrid className="w-14 h-14 text-muted-foreground/10 mx-auto mb-5" />
                    <p className="text-sm font-black text-muted-foreground/30 uppercase tracking-[0.4em]">
                        Nenhuma categoria
                    </p>
                </div>
            )}

            {editingCategory && (
                <EditCategoryDialog
                    category={editingCategory}
                    onClose={() => setEditingCategory(null)}
                />
            )}
        </div>
    );
}

// ─── LINHA DE SUBCATEGORIA (com edição de nome e ícone) ───────────────────────
function SubcategoryRow({
    sub,
    category,
    onUpdateIcon,
    onUpdateName,
    onDelete,
}: {
    sub: Subcategory;
    category: Category;
    onUpdateIcon: (iconName: string | null) => void;
    onUpdateName: (name: string) => void;
    onDelete: () => void;
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(sub.name);

    useEffect(() => {
        setName(sub.name);
    }, [sub.name]);

    const commit = () => {
        const trimmed = name.trim();
        if (trimmed && trimmed !== sub.name) {
            onUpdateName(trimmed);
        } else {
            setName(sub.name);
        }
        setIsEditing(false);
    };

    const cancel = () => {
        setName(sub.name);
        setIsEditing(false);
    };

    return (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/10 border border-border/20 hover:border-border/40 group/sub transition-all gap-2">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <Popover>
                    <PopoverTrigger asChild>
                        <button
                            type="button"
                            title="Escolher ícone da subcategoria"
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0 hover:scale-105 transition-transform"
                            style={{ backgroundColor: category.color }}
                        >
                            <IconRenderer iconName={sub.icon || category.icon || 'Tag'} className="w-3.5 h-3.5 stroke-[2.2px]" />
                        </button>
                    </PopoverTrigger>
                    <PopoverContent
                        className="w-80 max-w-[90vw] p-3 rounded-2xl"
                        align="start"
                        // Sem isso, o Radix foca automaticamente o primeiro campo focável ao abrir
                        // (a busca), o que no celular abre o teclado mesmo sem o usuário ter pedido
                        // — mesmo que ele só queira navegar pelos grupos de ícone tocando nas abas.
                        onOpenAutoFocus={(e) => e.preventDefault()}
                    >
                        <IconSelector
                            label="Ícone da subcategoria"
                            selectedIcon={sub.icon || category.icon || 'Tag'}
                            onSelect={onUpdateIcon}
                            color={category.color}
                        />
                        {sub.icon && (
                            <button
                                type="button"
                                onClick={() => onUpdateIcon(null)}
                                className="mt-2 w-full text-center text-[10px] font-bold text-muted-foreground hover:text-danger transition-colors"
                            >
                                Usar ícone da categoria
                            </button>
                        )}
                    </PopoverContent>
                </Popover>

                {isEditing ? (
                    <Input
                        autoFocus
                        value={name}
                        onChange={e => setName(e.target.value)}
                        onBlur={commit}
                        onKeyDown={e => {
                            if (e.key === 'Enter') commit();
                            if (e.key === 'Escape') cancel();
                        }}
                        className="h-8 rounded-lg border border-border/50 bg-background text-xs font-bold uppercase tracking-wide px-2.5"
                    />
                ) : (
                    <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        title="Editar nome da subcategoria"
                        className="flex items-center gap-1.5 min-w-0 text-left group/name"
                    >
                        <span className="text-xs font-bold uppercase tracking-wide opacity-70 group-hover/name:opacity-100 truncate">{sub.name}</span>
                        <Pencil className="w-3 h-3 text-muted-foreground/30 opacity-0 group-hover/sub:opacity-100 shrink-0 transition-opacity" />
                    </button>
                )}
            </div>

            {isEditing ? (
                <button
                    onClick={commit}
                    className="p-1.5 rounded-lg text-success hover:bg-success/10 transition-all shrink-0"
                    title="Salvar"
                >
                    <Check className="w-3.5 h-3.5" />
                </button>
            ) : (
                <button
                    onClick={onDelete}
                    className="p-1.5 rounded-lg text-muted-foreground/20 hover:text-danger hover:bg-danger/5 opacity-0 group-hover/sub:opacity-100 transition-all shrink-0"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            )}
        </div>
    );
}

// ─── MODAL DE EDIÇÃO ──────────────────────────────────────────────────────────
function EditCategoryDialog({
    category,
    onClose,
}: {
    category: Category;
    onClose: () => void;
}) {
    const { mutate: updateCategory } = useUpdateCategory();
    const { mutate: deleteCategory } = useDeleteCategory();
    const { mutate: addSubcategory } = useAddSubcategory();
    const { mutate: deleteSubcategory } = useDeleteSubcategory();
    const { mutate: updateSubcategory } = useUpdateSubcategory();
    const { data: subcategories = [] } = useSubcategories();
    const [name, setName] = useState(category.name);
    const [color, setColor] = useState(category.color);
    const [icon, setIcon] = useState(category.icon || 'Tag');
    const [isFixed, setIsFixed] = useState(category.isFixed);
    const [budgetLimit, setBudgetLimit] = useState<string>(category.budgetLimit ? String(category.budgetLimit) : '');
    const [newSubName, setNewSubName] = useState('');
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [mobileTab, setMobileTab] = useState<'details' | 'subs'>('details');

    const catSubs = [...subcategories.filter(sub => sub.categoryId === category.id)]
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

    const handleSave = () => {
        if (!name.trim()) return;
        updateCategory(
            { 
                id: category.id, 
                updates: { 
                    name: name.trim(), 
                    color, 
                    icon, 
                    isFixed, 
                    budgetLimit: budgetLimit ? parseFloat(budgetLimit) : null
                } 
            },
            { onSuccess: () => {
                onClose();
            }}
        );
    };

    const handleAddSub = () => {
        if (!newSubName.trim()) return;
        addSubcategory({ categoryId: category.id, name: newSubName.trim(), isActive: true });
        setNewSubName('');
    };

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent
                className="w-[94vw] max-w-4xl rounded-[1.75rem] md:rounded-[2.5rem] p-0 border-none shadow-2xl bg-background overflow-hidden max-h-[90dvh] flex flex-col"
                aria-describedby={undefined}
            >
                <div className="flex md:hidden p-2.5 border-b border-border/30 bg-muted/20 gap-1.5 shrink-0">
                    <button
                        type="button"
                        onClick={() => setMobileTab('details')}
                        className={cn(
                            "flex-1 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all",
                            mobileTab === 'details'
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "bg-background/60 text-muted-foreground hover:text-foreground"
                        )}
                    >
                        Configurações
                    </button>
                    <button
                        type="button"
                        onClick={() => setMobileTab('subs')}
                        className={cn(
                            "flex-1 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5",
                            mobileTab === 'subs'
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "bg-background/60 text-muted-foreground hover:text-foreground"
                        )}
                    >
                        Subcategorias
                        <span className={cn(
                            "text-[10px] px-1.5 py-0.2 rounded-full font-black",
                            mobileTab === 'subs' ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                        )}>
                            {catSubs.length}
                        </span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto md:overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-0 divide-y md:divide-y-0 md:divide-x divide-border/20">

                    <div className={cn(
                        "md:col-span-7 p-4 sm:p-6 md:p-8 space-y-4 md:space-y-6 md:overflow-y-auto",
                        mobileTab === 'details' ? 'block' : 'hidden md:block'
                    )}>
                        <DialogHeader>
                            <DialogTitle className="text-base sm:text-lg font-black uppercase tracking-widest text-primary">
                                Editar Categoria
                            </DialogTitle>
                        </DialogHeader>

                        <div className="space-y-2">
                            <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Nome</Label>
                            <Input
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="h-11 rounded-xl border border-border/50 bg-background focus:ring-2 focus:ring-primary/20 transition-all font-bold px-4"
                                onKeyDown={e => e.key === 'Enter' && handleSave()}
                            />
                        </div>

                        <div className="flex items-center justify-between p-3.5 rounded-xl bg-background border border-border/30">
                            <Label className="text-[10px] font-black uppercase tracking-widest">Conta Fixa</Label>
                            <Switch checked={isFixed} onCheckedChange={setIsFixed} />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Limite Mensal (R$)</Label>
                            <Input
                                type="number"
                                value={budgetLimit}
                                onChange={e => setBudgetLimit(e.target.value)}
                                placeholder="Sem limite"
                                className="h-11 rounded-xl border border-border/50 bg-background focus:ring-2 focus:ring-primary/20 transition-all font-bold px-4"
                            />
                        </div>

                        <IconSelector label="Ícone" selectedIcon={icon} onSelect={setIcon} color={color} />
                        <ColorSelector label="Cor" selectedColor={color} onSelect={setColor} />

                        <div className="flex gap-3 pt-2">
                            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        className="h-11 w-11 rounded-xl text-muted-foreground/30 hover:text-danger hover:bg-danger/5 transition-all p-0 shrink-0"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="rounded-[1.75rem] max-w-xs border-none shadow-2xl p-6">
                                    <DialogHeader className="space-y-3">
                                        <DialogTitle className="text-sm font-black uppercase tracking-widest text-danger">
                                            Excluir Categoria?
                                        </DialogTitle>
                                        <DialogDescription className="text-xs text-muted-foreground">
                                            Transações associadas ficarão sem categoria.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="flex gap-2 pt-4">
                                        <Button
                                            variant="ghost"
                                            onClick={() => setIsDeleteDialogOpen(false)}
                                            className="flex-1 h-10 rounded-xl text-xs font-black uppercase"
                                        >
                                            Não
                                        </Button>
                                        <Button
                                            onClick={() => {
                                                deleteCategory(category.id);
                                                setIsDeleteDialogOpen(false);
                                                onClose();
                                            }}
                                            className="flex-1 h-10 rounded-xl bg-danger hover:bg-danger/90 text-white font-black text-xs uppercase"
                                        >
                                            Sim
                                        </Button>
                                    </div>
                                </DialogContent>
                            </Dialog>

                            <Button
                                onClick={handleSave}
                                className="flex-1 h-11 rounded-xl font-black uppercase tracking-widest shadow-md hover:scale-[1.02] transition-all"
                            >
                                Salvar
                            </Button>
                        </div>
                    </div>

                    <div className={cn(
                        "md:col-span-5 p-4 sm:p-6 md:p-8 space-y-4 md:space-y-5 bg-muted/5 md:overflow-y-auto",
                        mobileTab === 'subs' ? 'block' : 'hidden md:block'
                    )}>
                        <div className="flex items-center justify-between">
                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                                Subcategorias
                            </Label>
                            <span className="text-[9px] font-black bg-muted px-2.5 py-1 rounded-full opacity-50">
                                {catSubs.length}
                            </span>
                        </div>

                        <div className="flex gap-2">
                            <Input
                                placeholder="Nova subcategoria..."
                                value={newSubName}
                                onChange={e => setNewSubName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAddSub()}
                                className="h-11 rounded-xl border border-border/40 bg-muted/10 focus:bg-background transition-all font-medium px-4 text-sm"
                            />
                            <Button
                                onClick={handleAddSub}
                                className="h-11 w-11 rounded-xl shrink-0 bg-primary/10 text-primary hover:bg-primary/20 transition-all p-0"
                            >
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>

                        <div className="space-y-1.5">
                            {catSubs.length === 0 ? (
                                <div className="py-14 text-center border-2 border-dashed border-border/20 rounded-2xl opacity-25">
                                    <Layers className="w-8 h-8 mx-auto mb-2" />
                                    <span className="text-[9px] font-black uppercase tracking-widest">Nenhuma subcategoria</span>
                                </div>
                            ) : (
                                catSubs.map(sub => (
                                    <SubcategoryRow
                                        key={sub.id}
                                        sub={sub}
                                        category={category}
                                        onUpdateIcon={(iconName) => updateSubcategory({ id: sub.id, icon: iconName })}
                                        onUpdateName={(name) => updateSubcategory({ id: sub.id, name })}
                                        onDelete={() => deleteSubcategory(sub.id)}
                                    />
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

import { useState, useMemo, useEffect } from 'react';
import { useCategories, useSubcategories, useCategoryGroups } from '@/hooks/useFinanceQueries';
import {
    useAddCategory,
    useDeleteCategory,
    useAddSubcategory,
    useDeleteSubcategory,
    useUpdateCategory,
} from '@/hooks/useCategoryMutations';
import { BudgetGroup, Category } from '@/types/finance';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    LayoutGrid,
    Plus,
    Trash2,
    Pin,
    Layers,
    ShieldCheck,
    Heart,
    Star,
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
// REGRAS PERMANENTES — não alterar sem motivo documentado:
//   1. Nunca usar overflow-hidden no card (corta o nome)
//   2. Nunca usar aspect-square + overflow-hidden juntos
//   3. O card tem altura mínima fixa para simetria; o texto fica abaixo do ícone sem restrição de largura
//   4. line-clamp-2 garante que nomes longos não quebram o layout mas aparecem completos em até 2 linhas
//   5. hyphens-auto (+ lang="pt-BR") + break-words no nome: nomes de uma palavra
//      só (ex: "Estacionamento") não têm espaço pra quebrar linha. hyphens-auto
//      quebra na sílaba certa com hífen visível ("ESTACIONA-" / "MENTO"), como
//      num jornal — sem isso, ou a palavra transborda e o line-clamp corta a
//      última letra sem aviso ("Estacionament"), ou break-words sozinho quebra
//      em qualquer ponto sem hífen, ficando com cara de duas palavras coladas.
//      break-words continua como rede de segurança pra quando o navegador não
//      encontra um ponto de hifenização válido pra alguma palavra.
function CategoryCard({ cat, onClick }: { cat: Category; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="group flex flex-col items-center justify-start gap-3 p-4 md:p-5 rounded-[1.75rem] md:rounded-[2rem] bg-background border border-border/40 hover:border-primary/30 hover:shadow-xl transition-all duration-500 active:scale-95 w-full min-h-[130px] md:min-h-[150px] shadow-sm relative"
        >
            {/* Ícone — tamanho fixo, nunca comprimido */}
            <div
                className="w-12 h-12 md:w-14 md:h-14 rounded-[1.2rem] md:rounded-[1.5rem] flex items-center justify-center text-white transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 shadow-md shrink-0 mt-1"
                style={{ backgroundColor: cat.color }}
            >
                <IconRenderer iconName={cat.icon || 'Tag'} className="w-6 h-6 md:w-7 md:h-7 stroke-[2px]" />
            </div>

            {/* Nome — largura total, quebra em até 2 linhas sem corte */}
            <p
                lang="pt-BR"
                className="font-black text-[9px] md:text-[10px] uppercase tracking-wider text-foreground text-center group-hover:text-primary transition-colors leading-tight line-clamp-2 break-words [hyphens:auto] [-webkit-hyphens:auto] w-full px-1"
            >
                {cat.name}
            </p>

            {/* Pin de categoria fixa */}
            {cat.isFixed && (
                <div className="absolute top-2.5 right-2.5 opacity-25">
                    <Pin className="w-3 h-3 fill-current text-primary" />
                </div>
            )}
        </button>
    );
}

// ─── SEÇÃO DE GRUPO ───────────────────────────────────────────────────────────
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
            {/* Cabeçalho da seção */}
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

            {/* Grid responsivo:
                - mobile:  2 colunas (perfeito)
                - desktop: 4 colunas (web)
            */}
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
    const { data: subcategories = [] } = useSubcategories();
    const { data: categoryGroups = [] } = useCategoryGroups();

    const { mutate: addCategory } = useAddCategory();
    const { mutate: updateCategory } = useUpdateCategory();
    const { mutate: deleteCategory } = useDeleteCategory();
    const { mutate: addSubcategory } = useAddSubcategory();
    const { mutate: deleteSubcategory } = useDeleteSubcategory();

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
        const sort = (arr: Category[]) => [...arr].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
        return {
            essential: sort(filtered.filter(c => c.budgetGroup === 'essential')),
            lifestyle:  sort(filtered.filter(c => c.budgetGroup === 'lifestyle')),
            financial:  sort(filtered.filter(c => c.budgetGroup === 'financial')),
            income:     sort(filtered.filter(c => c.budgetGroup === 'income')),
        };
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
            budgetGroup: newCatType === 'income' ? 'income' : newCatBudgetGroup,
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

    const hasCategories = categories.filter(c => c.type === activeTab).length > 0;

    return (
        <div className="animate-fade-in w-full max-w-5xl mx-auto pb-24 px-4 md:px-8 space-y-12 md:space-y-16">

            {/* Cabeçalho */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pt-6 md:pt-10 border-b border-border/20 pb-8">
                <div className="space-y-5">
                    <div className="flex items-center gap-4">
                        <PageHeader title="Gestão de Categorias" icon={LayoutGrid} />
                    </div>

                    {/* Tabs */}
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

                {/* Modal Nova Categoria */}
                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                    <DialogTrigger asChild>
                        <Button className="h-12 md:h-14 px-6 md:px-8 rounded-xl md:rounded-2xl font-black uppercase tracking-widest flex items-center gap-3 shadow-md bg-primary text-white hover:bg-primary/90 transition-all active:scale-95">
                            <Plus className="w-4 h-4 md:w-5 md:h-5" /> Nova Categoria
                        </Button>
                    </DialogTrigger>

                    <DialogContent
                        // Estrutura flex (header fixo + corpo rolável + rodapé fixo): sem
                        // "min-h-0" no corpo, o item trava no tamanho do conteúdo em vez de
                        // encolher e rolar — o rodapé (botão "Criar Categoria") ficava
                        // empurrado pra fora da área visível, no mobile e no web. max-h em
                        // dvh, não vh: em mobile "vh" ignora a barra de endereço do navegador
                        // e podia renderizar a modal mais alta que a área realmente visível.
                        className="w-[92vw] max-w-sm sm:max-w-md md:max-w-lg rounded-[1.75rem] md:rounded-[2.5rem] p-0 border-none shadow-2xl bg-background overflow-hidden max-h-[90dvh] flex flex-col"
                        aria-describedby={undefined}
                    >
                        <DialogHeader className="px-6 pt-7 pb-5 border-b border-border/20 shrink-0">
                            <DialogTitle className="text-sm font-black uppercase tracking-widest text-primary">
                                Nova Categoria
                            </DialogTitle>
                        </DialogHeader>

                        <div className="px-4 sm:px-6 py-4 sm:py-6 space-y-4 flex-1 overflow-y-auto min-h-0">
                            {/* Tipo */}
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

                            {/* Nome */}
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

                            {/* Grupo (só despesa) */}
                            {newCatType === 'expense' && (
                                <div className="space-y-2">
                                    <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Grupo</Label>
                                    <Select
                                        value={newCatBudgetGroup}
                                        onValueChange={val => setNewCatBudgetGroup(val as BudgetGroup)}
                                    >
                                        <SelectTrigger className="w-full h-11 rounded-xl border border-border/50 bg-muted/10 px-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all text-left">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl border-border/50">
                                            <SelectItem value="essential" className="font-bold">Essenciais</SelectItem>
                                            <SelectItem value="lifestyle" className="font-bold">Estilo de Vida</SelectItem>
                                            <SelectItem value="financial" className="font-bold">Objetivos</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            <IconSelector label="Ícone" selectedIcon={newCatIcon} onSelect={setNewCatIcon} color={newCatColor} />
                            <ColorSelector label="Cor" selectedColor={newCatColor} onSelect={setNewCatColor} />

                            {/* Conta fixa */}
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

            {/* Seções */}
            {hasCategories ? (
                <div className="space-y-14 md:space-y-16">
                    {activeTab === 'expense' ? (
                        <>
                            <CategorySection
                                title="Essenciais"
                                description="Base da sobrevivência e obrigações inadiáveis"
                                icon={ShieldCheck}
                                cats={groupedCategories.essential}
                                onSelect={setEditingCategory}
                            />
                            <CategorySection
                                title="Estilo de Vida"
                                description="Prazer, missão, criatividade e lazer ajustável"
                                icon={Heart}
                                cats={groupedCategories.lifestyle}
                                onSelect={setEditingCategory}
                            />
                            <CategorySection
                                title="Objetivos"
                                description="Patrimônio, reservas e obrigações financeiras secas"
                                icon={Star}
                                cats={groupedCategories.financial}
                                onSelect={setEditingCategory}
                            />
                        </>
                    ) : (
                        <CategorySection
                            title="Receitas"
                            description="Fontes de entrada e fluxo de caixa"
                            icon={Star}
                            cats={groupedCategories.income}
                            onSelect={setEditingCategory}
                        />
                    )}
                </div>
            ) : (
                <div className="py-28 text-center bg-muted/5 rounded-[2.5rem] border-2 border-dashed border-border/30">
                    <LayoutGrid className="w-14 h-14 text-muted-foreground/10 mx-auto mb-5" />
                    <p className="text-sm font-black text-muted-foreground/30 uppercase tracking-[0.4em]">
                        Nenhuma categoria
                    </p>
                </div>
            )}

            {/* Modal de edição */}
            {editingCategory && (
                <EditCategoryDialog
                    category={editingCategory}
                    onClose={() => setEditingCategory(null)}
                />
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
    const { data: subcategories = [] } = useSubcategories();
    const [name, setName] = useState(category.name);
    const [color, setColor] = useState(category.color);
    const [icon, setIcon] = useState(category.icon || 'Tag');
    const [isFixed, setIsFixed] = useState(category.isFixed);
    const [budgetGroup, setBudgetGroup] = useState<BudgetGroup>(category.budgetGroup);
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
                    budgetGroup,
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
                // max-h em dvh, não vh — ver comentário no modal "Nova Categoria" acima.
                className="w-[94vw] max-w-4xl rounded-[1.75rem] md:rounded-[2.5rem] p-0 border-none shadow-2xl bg-background overflow-hidden max-h-[90dvh] flex flex-col"
                aria-describedby={undefined}
            >
                {/* Abas no Mobile */}
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
                        <span>Subcategorias</span>
                        <span className="text-[10px] bg-background/25 px-1.5 py-0.5 rounded-full font-bold">
                            {catSubs.length}
                        </span>
                    </button>
                </div>

                <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
                    {/* Coluna esquerda: configurações */}
                    <div className={cn(
                        "md:w-[55%] overflow-y-auto p-4 md:p-6 space-y-4 border-b md:border-b-0 md:border-r border-border/20 bg-muted/5",
                        mobileTab === 'details' ? 'block' : 'hidden md:block'
                    )}>
                        <DialogHeader className="hidden md:block">
                            <DialogTitle className="text-sm font-black uppercase tracking-widest text-primary">
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

                        {category.type === 'expense' && (
                            <div className="space-y-2">
                                <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Grupo de Relatório</Label>
                                <Select
                                    value={budgetGroup}
                                    onValueChange={val => setBudgetGroup(val as BudgetGroup)}
                                >
                                    <SelectTrigger className="w-full h-11 rounded-xl border border-border/50 bg-background px-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all text-left">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-border/50">
                                        <SelectItem value="essential" className="font-bold">Essenciais</SelectItem>
                                        <SelectItem value="lifestyle" className="font-bold">Estilo de Vida</SelectItem>
                                        <SelectItem value="financial" className="font-bold">Objetivos</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

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
                            {/* Excluir */}
                            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        className="h-11 w-11 rounded-xl text-muted-foreground/30 hover:text-danger hover:bg-danger/5 transition-all p-0 shrink-0"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="w-[88vw] max-w-xs rounded-[2rem] p-7 border-none text-center">
                                    <DialogHeader>
                                        <DialogTitle className="text-base font-black text-danger uppercase tracking-widest mb-1">
                                            Excluir?
                                        </DialogTitle>
                                        <DialogDescription className="text-sm text-muted-foreground">
                                            <strong className="text-foreground">{category.name}</strong> será removida permanentemente.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="flex gap-3 mt-6">
                                        <Button variant="outline" className="flex-1 h-11 rounded-xl font-black uppercase tracking-widest text-xs" onClick={() => setIsDeleteDialogOpen(false)}>
                                            Cancelar
                                        </Button>
                                        <Button variant="destructive" className="flex-1 h-11 rounded-xl font-black uppercase tracking-widest text-xs" onClick={() => { deleteCategory(category.id); onClose(); }}>
                                            Excluir
                                        </Button>
                                    </div>
                                </DialogContent>
                            </Dialog>

                            <Button
                                onClick={handleSave}
                                className="flex-1 h-11 rounded-xl font-black uppercase tracking-widest shadow-md hover:scale-[1.02] transition-all text-sm"
                            >
                                Salvar
                            </Button>
                        </div>
                    </div>

                    {/* Coluna direita: subcategorias */}
                    <div className={cn(
                        "md:w-[45%] overflow-y-auto p-4 md:p-6 space-y-4 bg-background",
                        mobileTab === 'subs' ? 'block' : 'hidden md:block'
                    )}>
                        <div className="flex items-center justify-between">
                            <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">
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
                                    <div
                                        key={sub.id}
                                        className="flex items-center justify-between p-3.5 rounded-xl bg-muted/10 border border-border/20 hover:border-border/40 group/sub transition-all"
                                    >
                                        <span className="text-xs font-bold uppercase tracking-wide opacity-70">{sub.name}</span>
                                        <button
                                            onClick={() => deleteSubcategory(sub.id)}
                                            className="p-1.5 rounded-lg text-muted-foreground/20 hover:text-danger hover:bg-danger/5 opacity-0 group-hover/sub:opacity-100 transition-all"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
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

// Seletor de categoria/subcategoria com ícones, em popup — usado em telas onde
// o <select> nativo (lista suspensa de texto puro) ficava feio ou escondia a
// subcategoria escolhida. Se o lançamento tem subcategoria, é o nome dela que
// aparece no botão (não o da categoria-mãe) — a categoria some pra segundo
// plano, só como "trilha" acima do nome.
import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown, Tag as TagIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { IconRenderer } from '@/components/ui/IconSelector';
import { cn } from '@/lib/utils';
import { Category, Subcategory, TransactionType } from '@/types/finance';

interface CategoryPickerPopoverProps {
  categories: Category[];
  subcategories: Subcategory[];
  type?: TransactionType;
  categoryId: string | null | undefined;
  subcategoryId?: string | null;
  onSelect: (categoryId: string, subcategoryId: string | null) => void;
  placeholder?: string;
  className?: string;
}

// Se a subcategoria tem ícone próprio, ele prevalece sobre o da categoria-mãe
// (a cor sempre vem da categoria — subcategoria não tem cor própria).
function CategoryIconBadge({ category, subcategory, size = 'sm' }: { category?: Category; subcategory?: Subcategory; size?: 'sm' | 'md' }) {
  return (
    <div
      className={cn(
        "rounded-lg flex items-center justify-center text-white shrink-0",
        size === 'sm' ? "w-6 h-6" : "w-8 h-8"
      )}
      style={{ backgroundColor: category?.color || '#71717a' }}
    >
      <IconRenderer iconName={subcategory?.icon || category?.icon || 'Tag'} className={size === 'sm' ? "w-3.5 h-3.5 stroke-[2.2px]" : "w-4.5 h-4.5 stroke-[2px]"} />
    </div>
  );
}

export function CategoryPickerPopover({
  categories,
  subcategories,
  type,
  categoryId,
  subcategoryId,
  onSelect,
  placeholder = 'Selecionar categoria...',
  className,
}: CategoryPickerPopoverProps) {
  const [open, setOpen] = useState(false);

  const filteredCategories = useMemo(
    () => categories.filter(c => c.isActive !== false && (!type || c.type === type)),
    [categories, type]
  );

  const selectedCategory = categories.find(c => c.id === categoryId);
  const selectedSubcategory = subcategoryId ? subcategories.find(s => s.id === subcategoryId) : undefined;

  const subcategoriesByCategory = useMemo(() => {
    const map = new Map<string, Subcategory[]>();
    subcategories.forEach(sub => {
      if (sub.isActive === false) return;
      const list = map.get(sub.categoryId) || [];
      list.push(sub);
      map.set(sub.categoryId, list);
    });
    return map;
  }, [subcategories]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between rounded-2xl h-12 border-2 px-3", !selectedCategory && "text-muted-foreground", className)}
        >
          <span className="flex items-center gap-2.5 min-w-0">
            {selectedCategory ? (
              <CategoryIconBadge category={selectedCategory} subcategory={selectedSubcategory} />
            ) : (
              <div className="w-6 h-6 rounded-lg flex items-center justify-center text-muted-foreground bg-muted shrink-0">
                <TagIcon className="w-3.5 h-3.5" />
              </div>
            )}
            <span className="flex flex-col items-start min-w-0 leading-tight">
              {selectedSubcategory && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate max-w-[180px]">
                  {selectedCategory?.name}
                </span>
              )}
              <span className="font-bold truncate max-w-[180px]">
                {selectedSubcategory ? selectedSubcategory.name : (selectedCategory ? selectedCategory.name : placeholder)}
              </span>
            </span>
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 rounded-2xl" align="start">
        <Command>
          <CommandInput placeholder="Buscar categoria ou subcategoria..." />
          <CommandList className="max-h-72">
            <CommandEmpty>Nenhuma categoria encontrada.</CommandEmpty>
            {filteredCategories.map(cat => {
              const catSubcategories = subcategoriesByCategory.get(cat.id) || [];
              return (
                <CommandGroup key={cat.id}>
                  <CommandItem
                    value={cat.name}
                    onSelect={() => { onSelect(cat.id, null); setOpen(false); }}
                    className="gap-2.5"
                  >
                    <Check className={cn("h-4 w-4 shrink-0", categoryId === cat.id && !selectedSubcategory ? "opacity-100" : "opacity-0")} />
                    <CategoryIconBadge category={cat} />
                    <span className="font-bold">{cat.name}</span>
                  </CommandItem>
                  {catSubcategories.map(sub => (
                    <CommandItem
                      key={sub.id}
                      value={`${cat.name} ${sub.name}`}
                      onSelect={() => { onSelect(cat.id, sub.id); setOpen(false); }}
                      className="gap-2.5 pl-9"
                    >
                      <Check className={cn("h-4 w-4 shrink-0", subcategoryId === sub.id ? "opacity-100" : "opacity-0")} />
                      {sub.icon ? (
                        <CategoryIconBadge category={cat} subcategory={sub} />
                      ) : (
                        <span className="w-1 h-1 rounded-full bg-muted-foreground/40 shrink-0" />
                      )}
                      <span className="text-muted-foreground">{sub.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

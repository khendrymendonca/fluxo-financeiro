import { useState } from 'react';
import { useBudgetGroups, CustomBudgetGroup } from '@/hooks/useBudgetGroups';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Settings2, Tag } from 'lucide-react';
import { ColorSelector, APP_COLORS } from '@/components/ui/ColorSelector';

export function BudgetGroupManagerModal() {
  const { budgetGroups, addGroup, updateGroup, deleteGroup } = useBudgetGroups();
  const [isOpen, setIsOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [budgetPercent, setBudgetPercent] = useState<string>('');
  const [color, setColor] = useState(APP_COLORS[0]);

  const handleOpenNew = () => {
    setEditingGroupId(null);
    setName('');
    setBudgetPercent('');
    setColor(APP_COLORS[0]);
  };

  const handleOpenEdit = (group: CustomBudgetGroup) => {
    setEditingGroupId(group.id);
    setName(group.name);
    setBudgetPercent(group.budgetPercent ? String(group.budgetPercent) : '');
    setColor(group.color || APP_COLORS[0]);
  };

  const handleSave = () => {
    if (!name.trim()) return;

    const percent = budgetPercent ? parseFloat(budgetPercent) : null;
    
    if (editingGroupId) {
      updateGroup(editingGroupId, { name: name.trim(), budgetPercent: percent, color });
    } else {
      addGroup({ name: name.trim(), budgetPercent: percent, color });
    }
    
    setName('');
    setBudgetPercent('');
    setEditingGroupId(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 rounded-xl font-bold gap-2 text-muted-foreground" onClick={handleOpenNew}>
          <Settings2 className="w-4 h-4" /> Macrocategorias
        </Button>
      </DialogTrigger>

      <DialogContent className="w-[92vw] max-w-md rounded-[2rem] p-0 border-none shadow-2xl bg-background overflow-hidden" aria-describedby={undefined}>
        <DialogHeader className="px-6 pt-7 pb-4 border-b border-border/20">
          <DialogTitle className="text-sm font-black uppercase tracking-widest text-primary">
            Gerenciar Macrocategorias
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Formulário de Criação/Edição */}
          <div className="space-y-4 p-4 rounded-2xl bg-muted/10 border border-border/20">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              {editingGroupId ? 'Editar Macrocategoria' : 'Nova Macrocategoria'}
            </h4>
            
            <div className="space-y-2">
              <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Nome</Label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ex: Essencial, Lazer..."
                className="h-10 rounded-xl bg-background text-sm font-bold"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Teto (% da Receita)</Label>
              <Input
                type="number"
                value={budgetPercent}
                onChange={e => setBudgetPercent(e.target.value)}
                placeholder="Ex: 25"
                className="h-10 rounded-xl bg-background text-sm font-bold"
              />
            </div>

            <ColorSelector label="Cor" selectedColor={color} onSelect={setColor} />

            <div className="flex gap-2 pt-2">
              {editingGroupId && (
                <Button variant="ghost" onClick={handleOpenNew} className="h-10 rounded-xl text-xs font-bold">
                  Cancelar
                </Button>
              )}
              <Button onClick={handleSave} className="h-10 flex-1 rounded-xl font-bold uppercase tracking-widest text-[10px]">
                {editingGroupId ? 'Salvar' : 'Adicionar'}
              </Button>
            </div>
          </div>

          {/* Lista de Existentes */}
          <div className="space-y-2">
            <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">
              Macrocategorias Cadastradas
            </Label>
            
            {budgetGroups.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground opacity-50 text-xs font-bold">
                Nenhuma cadastrada.
              </div>
            ) : (
              <div className="space-y-2">
                {budgetGroups.map(group => (
                  <div key={group.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/5 border border-border/10">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: group.color || APP_COLORS[0] }} />
                      <div>
                        <p className="text-sm font-bold leading-none">{group.name}</p>
                        {group.budgetPercent && (
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1">
                            Teto: {group.budgetPercent}%
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => handleOpenEdit(group)}>
                        <Settings2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-danger hover:bg-danger/10" onClick={() => deleteGroup(group.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

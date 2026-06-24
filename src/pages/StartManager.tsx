import { useState } from 'react';
import { Plus, Trash2, Copy, Users, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useStartInvites, useGenerateStartInvite, useDeleteStartInvite, useFamilyLinks } from '@/hooks/useStartQueries';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function StartManager() {
  const { data: invites = [], isLoading: isLoadingInvites } = useStartInvites();
  const { data: familyLinks = [], isLoading: isLoadingFamily } = useFamilyLinks();
  const generateInvite = useGenerateStartInvite();
  const deleteInvite = useDeleteStartInvite();
  const { toast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleGenerate = async () => {
    try {
      await generateInvite.mutateAsync();
      toast({ title: 'Start ID gerado com sucesso!' });
    } catch (error: any) {
      toast({
        title: 'Erro ao gerar Start ID',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteInvite.mutateAsync(id);
      toast({ title: 'Convite removido' });
    } catch (error: any) {
      toast({
        title: 'Erro ao remover',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    toast({ title: 'Código copiado!' });
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in p-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#00FF5F]/10 border border-[#00FF5F]/20 p-6 rounded-3xl">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Users className="w-6 h-6 text-[#00FF5F]" />
            Fluxo <span className="text-[#00FF5F]">Start</span>
          </h1>
          <p className="text-muted-foreground mt-1">Gerencie o acesso e acompanhe a jornada financeira dos seus filhos.</p>
        </div>
        <Button 
          onClick={handleGenerate} 
          disabled={generateInvite.isPending}
          className="bg-[#00FF5F] text-black hover:bg-[#00CC4C] font-bold rounded-xl shadow-[0_0_15px_rgba(0,255,95,0.3)] transition-all"
        >
          {generateInvite.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
          Novo Start ID
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Seção de Convites Pendentes */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold">Start IDs Gerados</h2>
          <p className="text-sm text-muted-foreground">Compartilhe estes códigos para que eles possam criar suas contas.</p>
          
          {isLoadingInvites ? (
            <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : invites.filter((i: any) => !i.is_used).length === 0 ? (
            <div className="bg-card border border-border rounded-3xl p-8 text-center text-muted-foreground">
              Nenhum Start ID pendente.
            </div>
          ) : (
            <div className="space-y-3">
              {invites.filter((i: any) => !i.is_used).map((invite: any) => (
                <div key={invite.id} className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between group hover:border-[#00FF5F]/50 transition-colors">
                  <div>
                    <p className="font-mono text-xl font-black tracking-widest text-foreground">{invite.code}</p>
                    <p className="text-xs text-muted-foreground">Criado em {format(new Date(invite.created_at), "dd/MM/yyyy", { locale: ptBR })}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-xl h-9 w-9"
                      onClick={() => handleCopy(invite.code, invite.id)}
                    >
                      {copiedId === invite.id ? <Check className="w-4 h-4 text-[#00FF5F]" /> : <Copy className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-xl h-9 w-9 text-danger hover:bg-danger/10 hover:text-danger border-transparent hover:border-danger/20"
                      onClick={() => handleDelete(invite.id)}
                      disabled={deleteInvite.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Seção de Contas Vinculadas */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold">Contas Vinculadas</h2>
          <p className="text-sm text-muted-foreground">Filhos que já estão utilizando o Fluxo Start.</p>
          
          {isLoadingFamily ? (
            <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : familyLinks.length === 0 ? (
            <div className="bg-card border border-border rounded-3xl p-8 text-center text-muted-foreground">
              Nenhuma conta vinculada ainda.
            </div>
          ) : (
            <div className="space-y-3">
              {familyLinks.map((link: any) => (
                <div key={link.child_id} className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#00FF5F]/10 flex items-center justify-center">
                      <Users className="w-5 h-5 text-[#00FF5F]" />
                    </div>
                    <div>
                      {/* O nome idealmente viria de um join com auth.users no backend ou metadata */}
                      <p className="font-bold text-sm">Conta Start</p>
                      <p className="text-xs text-muted-foreground">Vinculado desde {format(new Date(link.created_at), "MMM/yyyy", { locale: ptBR })}</p>
                    </div>
                  </div>
                  {link.emancipated_at && (
                    <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-1 rounded-full">
                      Emancipado
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

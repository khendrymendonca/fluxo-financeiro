import { useState, useEffect } from 'react';
import {
  Shield,
  Search,
  Star,
  X,
  Loader2,
  ChevronLeft,
  Sparkles,
  Users,
  LayoutGrid,
  Plus,
  Pencil,
  Trash2,
  UserPlus,
  Mail,
  Lock,
  User
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { FEATURES } from '@/config/features';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import {
  useIsSuperAdmin,
  useSearchUserByCode,
  useUserOverrides,
  useToggleUserFeature,
  useSuperUserProfile,
  usePlans,
  usePlanFeatures,
  useCreatePlan,
  useUpdatePlan,
  useDeletePlan,
  useTogglePlanFeature,
  useAssignPlan,
  useGlobalFlags,
  useToggleGlobalFlag,
} from '@/hooks/useFeatureFlags';

export default function SuperPage() {
  const isSuperAdmin = useIsSuperAdmin();
  const navigate = useNavigate();

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Shield className="w-12 h-12 text-muted-foreground mx-auto opacity-20" />
          <p className="text-sm text-muted-foreground font-medium tracking-widest uppercase">
            Acesso Restrito
          </p>
          <Button variant="outline" onClick={() => navigate('/')}>
            Voltar ao Início
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground animate-in fade-in duration-500">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl hover:bg-muted transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight">Super</h1>
              <p className="text-xs text-muted-foreground">
                Controle de acesso e temas globais
              </p>
            </div>
          </div>
        </div>

        {/* Abas */}
        <Tabs defaultValue="users">
          <TabsList className="w-full grid grid-cols-3 rounded-2xl h-11">
            <TabsTrigger
              value="users"
              className="rounded-xl text-xs font-black uppercase tracking-widest"
            >
              <Users className="w-3.5 h-3.5 mr-1.5" />
              Usuários
            </TabsTrigger>
            <TabsTrigger
              value="plans"
              className="rounded-xl text-xs font-black uppercase tracking-widest"
            >
              <LayoutGrid className="w-3.5 h-3.5 mr-1.5" />
              Planos
            </TabsTrigger>
            <TabsTrigger
              value="themes"
              className="rounded-xl text-xs font-black uppercase tracking-widest"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              Temas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-6">
            <SuperUsersTab />
          </TabsContent>

          <TabsContent value="plans" className="mt-6">
            <SuperPlansTab />
          </TabsContent>

          <TabsContent value="themes" className="mt-6">
            <SuperThemesTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
function SuperUsersTab() {
  const queryClient = useQueryClient();
  const [searchCode, setSearchCode] = useState('');
  const [selectedUser, setSelectedUser] = useState<{
    id: string;
    email: string;
    full_name: string;
    user_code: string;
    plan_id: string | null;
  } | null>(null);

  // Estados para Criação
  const [showCreate, setShowCreate] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');

  // Estados para Edição Cadastral
  const [editEmail, setEditEmail] = useState('');
  const [editPass, setEditPass] = useState('');
  const [editName, setEditName] = useState('');

  // Sincronizar dados de edição quando o usuário selecionado muda
  useEffect(() => {
    if (selectedUser) {
      setEditEmail(selectedUser.email || '');
      setEditName(selectedUser.full_name || '');
      setEditPass('');
    }
  }, [selectedUser]);

  // Query: listar usuários cadastrados
  const { data: users = [], isLoading: loadingUsers, refetch: refetchUsers } = useQuery({
    queryKey: ['super_users_list'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('super_admin_list_users');
      if (error) {
        // Fallback caso a RPC ainda não exista no banco
        const { data: profiles, error: pError } = await supabase
          .from('profiles')
          .select('id, user_code, plan_id');
        if (pError) throw pError;
        return profiles.map(p => ({
          id: p.id,
          user_code: p.user_code,
          plan_id: p.plan_id,
          email: 'N/A',
          full_name: 'Usuário do Fluxo',
          created_at: new Date().toISOString()
        }));
      }
      return data ?? [];
    }
  });

  // Mutation: Criar Usuário
  const { mutate: createUser, isPending: isCreating } = useMutation({
    mutationFn: async (data: { email: string; pass: string; name: string }) => {
      const { data: newId, error } = await supabase.rpc('super_admin_create_user', {
        p_email: data.email,
        p_password: data.pass,
        p_full_name: data.name
      });
      if (error) throw error;
      return newId;
    },
    onSuccess: () => {
      toast.success('Usuário criado com sucesso!');
      setNewEmail('');
      setNewPassword('');
      setNewName('');
      setShowCreate(false);
      refetchUsers();
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao criar usuário');
    }
  });

  // Mutation: Excluir Usuário
  const { mutate: deleteUser, isPending: isDeleting } = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc('super_admin_delete_user', {
        p_user_id: userId
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Usuário excluído com sucesso!');
      if (selectedUser?.id === selectedUser?.id) {
        setSelectedUser(null);
      }
      refetchUsers();
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao excluir usuário');
    }
  });

  // Mutation: Atualizar Usuário
  const { mutate: updateUser, isPending: isUpdating } = useMutation({
    mutationFn: async (data: { id: string; email: string; pass?: string; name: string }) => {
      const { error } = await supabase.rpc('super_admin_update_user', {
        p_user_id: data.id,
        p_email: data.email,
        p_password: data.pass || '',
        p_full_name: data.name
      });
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast.success('Cadastro do usuário atualizado!');
      if (selectedUser && selectedUser.id === variables.id) {
        setSelectedUser({
          ...selectedUser,
          email: variables.email,
          full_name: variables.name
        });
      }
      setEditPass('');
      refetchUsers();
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao atualizar dados');
    }
  });

  // Fetch overrides do usuário selecionado
  const { data: overrides = [], isFetching: loadingOverrides } = useQuery({
    queryKey: ['super_user_overrides', selectedUser?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_feature_overrides')
        .select('feature_key, enabled')
        .eq('user_id', selectedUser!.id);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!selectedUser,
  });

  // Mutation: toggle feature do usuário selecionado
  const { mutate: toggleFeature, isPending: isToggling } = useMutation({
    mutationFn: async ({
      userId,
      featureKey,
      enabled,
    }: {
      userId: string;
      featureKey: string;
      enabled: boolean;
    }) => {
      const { error } = await supabase
        .from('user_feature_overrides')
        .upsert(
          {
            user_id: userId,
            feature_key: featureKey,
            enabled,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,feature_key' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['super_user_overrides', selectedUser?.id],
      });
    },
    onError: (err) => {
      toast.error('Erro ao salvar permissão');
    },
  });

  // Buscar perfil completo
  const { data: userProfile } = useQuery({
    queryKey: ['super_user_profile', selectedUser?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_code, plan_id')
        .eq('id', selectedUser!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedUser,
  });

  const { data: plans = [] } = usePlans();
  const { mutate: assignPlan } = useAssignPlan();

  const getState = (featureKey: string, defaultEnabled: boolean): boolean => {
    const override = overrides.find((o) => o.feature_key === featureKey);
    return override !== undefined ? override.enabled : defaultEnabled;
  };

  const hasOverride = (featureKey: string): boolean =>
    overrides.some((o) => o.feature_key === featureKey);

  const screens = FEATURES.filter((f) => f.type === 'screen');
  const premium = FEATURES.filter(
    (f) => f.type === 'premium' && !f.key.startsWith('theme_')
  );

  // Filtrar usuários com base na busca
  const filteredUsers = users.filter((u: any) =>
    (u.user_code || '').toLowerCase().includes(searchCode.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(searchCode.toLowerCase()) ||
    (u.full_name || '').toLowerCase().includes(searchCode.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Coluna da Esquerda: Busca + Cadastro + Lista de Usuários */}
      <div className="lg:col-span-5 space-y-4">
        {/* Bloco de Busca & Botão de Criar */}
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              placeholder="Buscar por código, nome ou e-mail..."
              className="pl-10 h-11 rounded-2xl text-sm"
            />
          </div>
          <Button
            onClick={() => setShowCreate(!showCreate)}
            className="h-11 rounded-2xl px-4 shrink-0 font-bold text-xs uppercase"
            variant={showCreate ? "outline" : "default"}
          >
            {showCreate ? <X className="w-4 h-4" /> : <UserPlus className="w-4 h-4 mr-2" />}
            {showCreate ? "Fechar" : "Novo"}
          </Button>
        </div>

        {/* Formulário de Criação de Usuário */}
        {showCreate && (
          <div className="bg-card border border-primary/20 p-5 rounded-[2rem] shadow-sm space-y-3 animate-in fade-in slide-in-from-top-3 duration-300">
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
                <UserPlus className="w-4 h-4" />
                Cadastrar Usuário
              </h3>
              <p className="text-xs text-muted-foreground">Adicione um novo usuário ao sistema</p>
            </div>
            <div className="space-y-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nome Completo (Apelido)"
                className="h-11 rounded-2xl text-sm"
              />
              <Input
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="E-mail de acesso"
                type="email"
                className="h-11 rounded-2xl text-sm"
              />
              <Input
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Senha inicial"
                type="password"
                className="h-11 rounded-2xl text-sm"
              />
              <Button
                onClick={() => {
                  if (!newEmail.trim() || !newPassword.trim() || !newName.trim()) {
                    toast.error('Preencha todos os campos!');
                    return;
                  }
                  createUser({ email: newEmail, pass: newPassword, name: newName });
                }}
                disabled={isCreating}
                className="w-full h-11 rounded-2xl font-black text-xs uppercase tracking-widest"
              >
                {isCreating ? 'Cadastrando...' : 'Cadastrar'}
              </Button>
            </div>
          </div>
        )}

        {/* Lista de Usuários */}
        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 no-scrollbar border border-border/50 rounded-[2rem] p-2 bg-muted/5">
          {loadingUsers ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-border rounded-2xl text-muted-foreground text-sm italic">
              Nenhum usuário encontrado
            </div>
          ) : (
            filteredUsers.map((u: any) => {
              const userPlan = plans.find((p) => p.id === u.plan_id);
              const isActive = selectedUser?.id === u.id;
              return (
                <div
                  key={u.id}
                  className={cn(
                    "w-full flex items-center justify-between p-4 rounded-2xl border transition-all text-left",
                    isActive
                      ? "bg-primary/5 border-primary shadow-sm"
                      : "bg-card border-border hover:border-primary/20"
                  )}
                >
                  <button
                    onClick={() => setSelectedUser(u)}
                    className="flex-1 text-left min-w-0"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-black tracking-widest text-sm text-foreground truncate">
                        {u.user_code}
                      </span>
                      {userPlan && (
                        <Badge variant="secondary" className="text-[9px] px-1.5 h-4.5 font-bold uppercase tracking-wider">
                          {userPlan.name}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs font-bold text-muted-foreground truncate mt-0.5">{u.full_name}</p>
                    <p className="text-[10px] text-muted-foreground/75 font-mono truncate">{u.email}</p>
                  </button>

                  <div className="flex items-center gap-1 ml-4 shrink-0">
                    <button
                      onClick={() => setSelectedUser(isActive ? null : u)}
                      className={cn(
                        "p-2 rounded-xl transition-colors",
                        isActive ? "bg-primary/10 text-primary" : "hover:bg-muted text-muted-foreground hover:text-foreground"
                      )}
                      title="Editar permissões e plano"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Excluir permanentemente o usuário ${u.user_code} (${u.full_name}) e todos os seus dados?`)) {
                          deleteUser(u.id);
                        }
                      }}
                      disabled={isDeleting}
                      className="p-2 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      title="Excluir usuário"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Coluna da Direita: Painel de Edição de Permissões e Cadastro */}
      <div className="lg:col-span-7 space-y-6">
        {selectedUser ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 bg-card border border-border p-6 rounded-[2.5rem] shadow-sm">
            {/* Header de Edição */}
            <div className="flex items-center justify-between p-5 rounded-[2rem] bg-primary/5 border border-primary/10">
              <div>
                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mb-1">
                  Gerenciando Acesso de
                </p>
                <p className="text-2xl font-black tracking-widest text-primary leading-none">
                  {selectedUser.user_code}
                </p>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-2 rounded-xl hover:bg-primary/10 transition-colors"
              >
                <X className="w-5 h-5 text-primary" />
              </button>
            </div>

            {/* Grid Interno: Cadastro / Plano e Telas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* Coluna Interna 1: Cadastro & Plano */}
              <div className="space-y-6">
                {/* Dados Cadastrais */}
                <div className="space-y-3 bg-muted/20 p-4 rounded-2xl border border-border/40">
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                    Dados Cadastrais
                  </p>
                  <div className="space-y-2">
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Nome Completo"
                        className="pl-9 h-10 rounded-xl text-sm font-bold"
                      />
                    </div>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        placeholder="E-mail de acesso"
                        type="email"
                        className="pl-9 h-10 rounded-xl text-sm font-bold"
                      />
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        value={editPass}
                        onChange={(e) => setEditPass(e.target.value)}
                        placeholder="Nova senha (opcional)"
                        type="password"
                        className="pl-9 h-10 rounded-xl text-sm font-bold"
                      />
                    </div>
                    <Button
                      onClick={() => {
                        if (!editName.trim() || !editEmail.trim()) {
                          toast.error('Preencha Nome e E-mail!');
                          return;
                        }
                        updateUser({
                          id: selectedUser.id,
                          email: editEmail,
                          name: editName,
                          pass: editPass || undefined
                        });
                      }}
                      disabled={isUpdating}
                      className="w-full h-10 rounded-xl font-bold text-xs uppercase"
                    >
                      {isUpdating ? 'Atualizando...' : 'Atualizar Cadastro'}
                    </Button>
                  </div>
                </div>

                {/* Plano de Acesso */}
                <div className="space-y-2">
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                    Plano de Acesso
                  </p>
                  <select
                    value={userProfile?.plan_id ?? ''}
                    onChange={(e) =>
                      assignPlan({
                        userId: selectedUser.id,
                        planId: e.target.value || null,
                      })
                    }
                    className="w-full h-11 px-4 rounded-2xl border border-border bg-card text-sm font-bold appearance-none focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
                  >
                    <option value="">Sem plano (padrão)</option>
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Coluna Interna 2: Telas */}
              {loadingOverrides ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                    Telas Disponíveis
                  </p>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 no-scrollbar border border-border/50 rounded-2xl p-2 bg-muted/5">
                    {screens.map((feature) => {
                      const isEnabled = getState(feature.key, feature.enabledByDefault);
                      const overridden = hasOverride(feature.key);
                      return (
                        <div
                          key={feature.key}
                          className={cn(
                            'flex items-center justify-between p-3 rounded-xl border transition-all duration-300',
                            isEnabled
                              ? 'border-border bg-card hover:border-primary/20'
                              : 'border-border/40 bg-muted/20 grayscale opacity-60 hover:opacity-80'
                          )}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className={cn('text-xs font-bold truncate', !isEnabled && 'text-muted-foreground')}>
                                {feature.label}
                              </p>
                              {overridden && (
                                <Badge variant="outline" className="text-[8px] font-black px-1 border-primary/30 text-primary uppercase">
                                  editado
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Switch
                            checked={isEnabled}
                            onCheckedChange={() =>
                              toggleFeature({
                                userId: selectedUser.id,
                                featureKey: feature.key,
                                enabled: !isEnabled,
                              })
                            }
                            disabled={isToggling}
                            className="scale-90"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Seção Inferior: Recursos Premium */}
            {!loadingOverrides && (
              <div className="space-y-3 border-t border-border pt-4">
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 ml-1">
                  <Star className="w-3.5 h-3.5 text-warning fill-warning/20" />
                  Premium / Recursos Adicionais
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {premium.map((feature) => {
                    const isEnabled = getState(feature.key, feature.enabledByDefault);
                    const overridden = hasOverride(feature.key);
                    return (
                      <div
                        key={feature.key}
                        className={cn(
                          'flex items-center justify-between p-3.5 rounded-xl border transition-all duration-300',
                          isEnabled
                            ? 'border-warning/35 bg-warning/5 hover:border-warning/50'
                            : 'border-border/45 bg-muted/20 grayscale opacity-60 hover:opacity-80'
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Star className={cn('w-3.5 h-3.5 shrink-0', isEnabled ? 'text-warning fill-warning' : 'text-muted-foreground')} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className={cn('text-xs font-bold truncate', !isEnabled && 'text-muted-foreground')}>
                                {feature.label}
                              </p>
                              {overridden && (
                                <Badge variant="outline" className="text-[8px] font-black px-1 border-warning/40 text-warning uppercase">
                                  editado
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={() =>
                            toggleFeature({
                              userId: selectedUser.id,
                              featureKey: feature.key,
                              enabled: !isEnabled,
                            })
                          }
                          disabled={isToggling}
                          className="scale-90"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full min-h-[400px] flex flex-col items-center justify-center border border-dashed border-border rounded-[2.5rem] bg-card p-6 text-center space-y-4">
            <div className="p-4 rounded-3xl bg-primary/10 text-primary">
              <Shield className="w-8 h-8 animate-pulse" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-foreground">Gerenciamento de Acessos</h4>
              <p className="text-xs text-muted-foreground max-w-sm mt-1">
                Selecione um usuário na lista ao lado para alterar suas informações cadastrais, definir seu plano ou personalizar suas permissões de tela e recursos.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SuperPlansTab() {
  const { data: plans = [] } = usePlans();
  const { mutate: createPlan, isPending: isCreating } = useCreatePlan();
  const { mutate: updatePlan, isPending: isUpdating } = useUpdatePlan();
  const { mutate: deletePlan } = useDeletePlan();
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newAccountsLimit, setNewAccountsLimit] = useState<number>(-1);
  const [newCardsLimit, setNewCardsLimit] = useState<number>(-1);
  const [newDebtsLimit, setNewDebtsLimit] = useState<number>(-1);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  // Estado para Edição do Plano
  const [editingPlan, setEditingPlan] = useState<{
    id: string;
    name: string;
    description: string;
    accounts_limit: number;
    cards_limit: number;
    debts_limit: number;
  } | null>(null);

  return (
    <div className="space-y-4">
      {!selectedPlanId && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start animate-in fade-in duration-200">
          {/* Coluna 1: Criar / Editar Plano */}
          <div className="space-y-3">
            {editingPlan ? (
              <div className="space-y-3 bg-card border border-primary/20 p-5 rounded-[2rem] shadow-sm">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-primary">Editar Plano</h3>
                  <p className="text-xs text-muted-foreground">Atualize as informações cadastrais do plano de acesso</p>
                </div>
                <div className="space-y-3">
                  <Input
                    value={editingPlan.name}
                    onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                    placeholder="Nome do plano (ex: Pro)"
                    className="h-11 rounded-2xl"
                  />
                  <Input
                    value={editingPlan.description}
                    onChange={(e) => setEditingPlan({ ...editingPlan, description: e.target.value })}
                    placeholder="Descrição opcional"
                    className="h-11 rounded-2xl"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground ml-1 uppercase">Contas</label>
                      <Input
                        type="number"
                        value={editingPlan.accounts_limit}
                        onChange={(e) => setEditingPlan({ ...editingPlan, accounts_limit: parseInt(e.target.value) ?? -1 })}
                        className="h-11 rounded-2xl text-xs font-bold"
                        title="-1 para ilimitado"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground ml-1 uppercase">Cartões</label>
                      <Input
                        type="number"
                        value={editingPlan.cards_limit}
                        onChange={(e) => setEditingPlan({ ...editingPlan, cards_limit: parseInt(e.target.value) ?? -1 })}
                        className="h-11 rounded-2xl text-xs font-bold"
                        title="-1 para ilimitado"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground ml-1 uppercase">Dívidas</label>
                      <Input
                        type="number"
                        value={editingPlan.debts_limit}
                        onChange={(e) => setEditingPlan({ ...editingPlan, debts_limit: parseInt(e.target.value) ?? -1 })}
                        className="h-11 rounded-2xl text-xs font-bold"
                        title="-1 para ilimitado"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button
                      variant="outline"
                      onClick={() => setEditingPlan(null)}
                      className="flex-1 h-11 rounded-2xl font-bold text-xs uppercase"
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={() => {
                        if (!editingPlan.name.trim()) return;
                        updatePlan({
                          id: editingPlan.id,
                          name: editingPlan.name,
                          description: editingPlan.description,
                          accounts_limit: editingPlan.accounts_limit,
                          cards_limit: editingPlan.cards_limit,
                          debts_limit: editingPlan.debts_limit,
                        }, {
                          onSuccess: () => {
                            setEditingPlan(null);
                            toast.success('Plano atualizado com sucesso!');
                          }
                        });
                      }}
                      disabled={isUpdating}
                      className="flex-1 h-11 rounded-2xl font-black text-xs uppercase tracking-widest"
                    >
                      Salvar
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 bg-card border border-border p-5 rounded-[2rem] shadow-sm">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-foreground">Novo Plano</h3>
                  <p className="text-xs text-muted-foreground">Crie um novo plano de acesso para os usuários</p>
                </div>
                <div className="space-y-3">
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Nome do plano (ex: Premium)"
                    className="h-11 rounded-2xl"
                  />
                  <Input
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Descrição opcional"
                    className="h-11 rounded-2xl"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground ml-1 uppercase">Contas</label>
                      <Input
                        type="number"
                        value={newAccountsLimit}
                        onChange={(e) => setNewAccountsLimit(parseInt(e.target.value) ?? -1)}
                        className="h-11 rounded-2xl text-xs font-bold"
                        title="-1 para ilimitado"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground ml-1 uppercase">Cartões</label>
                      <Input
                        type="number"
                        value={newCardsLimit}
                        onChange={(e) => setNewCardsLimit(parseInt(e.target.value) ?? -1)}
                        className="h-11 rounded-2xl text-xs font-bold"
                        title="-1 para ilimitado"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground ml-1 uppercase">Dívidas</label>
                      <Input
                        type="number"
                        value={newDebtsLimit}
                        onChange={(e) => setNewDebtsLimit(parseInt(e.target.value) ?? -1)}
                        className="h-11 rounded-2xl text-xs font-bold"
                        title="-1 para ilimitado"
                      />
                    </div>
                  </div>
                  <Button
                    onClick={() => {
                      if (!newName.trim()) return;
                      createPlan(
                        {
                          name: newName,
                          description: newDesc,
                          accounts_limit: newAccountsLimit,
                          cards_limit: newCardsLimit,
                          debts_limit: newDebtsLimit
                        },
                        {
                          onSuccess: () => {
                            setNewName('');
                            setNewDesc('');
                            setNewAccountsLimit(-1);
                            setNewCardsLimit(-1);
                            setNewDebtsLimit(-1);
                            toast.success('Plano criado com sucesso!');
                          },
                        }
                      );
                    }}
                    disabled={isCreating || !newName.trim()}
                    className="w-full h-11 rounded-2xl font-black text-xs uppercase tracking-widest"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Plano
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Coluna 2: Listar Planos */}
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-foreground">Planos Cadastrados</h3>
              <p className="text-xs text-muted-foreground">Gerencie as features de cada plano de acesso</p>
            </div>
            <div className="space-y-2 border border-border/50 rounded-[2rem] p-2 bg-muted/5">
              {plans.length === 0 ? (
                <div className="p-6 text-center border border-dashed border-border rounded-2xl text-muted-foreground text-sm italic">
                  Nenhum plano cadastrado
                </div>
              ) : (
                plans.map((plan) => (
                  <div
                    key={plan.id}
                    className="flex items-center justify-between p-4 rounded-2xl border border-border bg-card hover:border-primary/20 transition-all"
                  >
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-black text-foreground truncate">{plan.name}</p>
                      {plan.description && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {plan.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground border border-border">
                          Contas: {plan.accounts_limit === -1 ? 'Ilimitado' : plan.accounts_limit}
                        </span>
                        <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground border border-border">
                          Cartões: {plan.cards_limit === -1 ? 'Ilimitado' : plan.cards_limit}
                        </span>
                        <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground border border-border">
                          Dívidas: {plan.debts_limit === -1 ? 'Ilimitado' : plan.debts_limit}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-4 shrink-0">
                      <button
                        onClick={() => setSelectedPlanId(plan.id)}
                        className="p-2 rounded-xl hover:bg-primary/10 text-primary transition-colors"
                        title="Gerenciar telas e recursos do plano"
                      >
                        <Shield className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingPlan({
                          id: plan.id,
                          name: plan.name,
                          description: plan.description ?? '',
                          accounts_limit: plan.accounts_limit ?? -1,
                          cards_limit: plan.cards_limit ?? -1,
                          debts_limit: plan.debts_limit ?? -1
                        })}
                        className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        title="Editar nome, descrição e limites"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                            if (confirm(`Excluir plano ${plan.name}? Isso removerá a associação nos usuários.`)) {
                                deletePlan(plan.id);
                            }
                        }}
                        className="p-2 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        title="Excluir plano"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {selectedPlanId && (
        <PlanFeaturesEditor
          planId={selectedPlanId}
          planName={plans.find((p) => p.id === selectedPlanId)?.name ?? ''}
          onBack={() => {
            setSelectedPlanId(null);
            setEditingPlan(null);
          }}
        />
      )}
    </div>
  );
}

function PlanFeaturesEditor({
  planId,
  planName,
  onBack,
}: {
  planId: string;
  planName: string;
  onBack: () => void;
}) {
  const { data: planFeatures = [] } = usePlanFeatures(planId);
  const { mutate: toggleFeature, isPending } = useTogglePlanFeature();

  const getState = (featureKey: string, defaultEnabled: boolean) => {
    const pf = planFeatures.find((p) => p.feature_key === featureKey);
    return pf !== undefined ? pf.enabled : defaultEnabled;
  };

  const screens = FEATURES.filter((f) => f.type === 'screen');
  const premium = FEATURES.filter(
    (f) => f.type === 'premium' && !f.key.startsWith('theme_')
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 rounded-xl hover:bg-muted transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <p className="text-xs text-muted-foreground">Editando plano</p>
          <p className="text-lg font-black">{planName}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Coluna 1: Telas */}
        <div className="space-y-3">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
            Telas
          </p>
          <div className="space-y-2">
            {screens.map((feature) => {
              const isEnabled = getState(feature.key, feature.enabledByDefault);
              return (
                <div
                  key={feature.key}
                  className="flex items-center justify-between p-4
                             rounded-2xl border border-border bg-card hover:border-primary/20 transition-colors"
                >
                  <div>
                    <p className="text-sm font-bold">{feature.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={() =>
                      toggleFeature({
                        planId,
                        featureKey: feature.key,
                        enabled: !isEnabled,
                      })
                    }
                    disabled={isPending}
                    className="shrink-0 ml-4"
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Coluna 2: Premium */}
        <div className="space-y-3">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 ml-1">
            <Star className="w-3.5 h-3.5 text-warning fill-warning/20" />
            Premium
          </p>
          <div className="space-y-2">
            {premium.map((feature) => {
              const isEnabled = getState(feature.key, feature.enabledByDefault);
              return (
                <div
                  key={feature.key}
                  className={cn(
                    'flex items-center justify-between p-4 rounded-2xl border transition-all duration-300',
                    isEnabled
                      ? 'border-warning/35 bg-warning/5 hover:border-warning/50'
                      : 'border-border/40 bg-muted/20 grayscale opacity-60 hover:opacity-80'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Star
                      className={cn(
                        'w-4 h-4',
                        isEnabled ? 'text-warning fill-warning' : 'text-muted-foreground'
                      )}
                    />
                    <div>
                      <p className="text-sm font-bold">{feature.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={() =>
                      toggleFeature({
                        planId,
                        featureKey: feature.key,
                        enabled: !isEnabled,
                      })
                    }
                    disabled={isPending}
                    className="shrink-0 ml-4"
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// Definição dos temas disponíveis no sistema
const THEME_DEFINITIONS = [
  { id: 'copa', label: 'Copa do Mundo' },
  { id: 'easter', label: 'Páscoa' },
  { id: 'christmas', label: 'Natal' },
  { id: 'halloween', label: 'Halloween' },
] as const;

function SuperThemesTab() {
  const queryClient = useQueryClient();
  const { data: flags = [] } = useGlobalFlags();
  const { mutate: toggleFlag, isPending } = useToggleGlobalFlag();
  const [isSeeding, setIsSeeding] = useState(false);

  // Mapear flags do banco por key para acesso rápido
  const flagMap = new Map(flags.map(f => [f.key, f]));

  // Verificar quais temas possuem ambas as flags (login + internal)
  const getLoginKey = (id: string) => `theme_${id}`;
  const getInternalKey = (id: string) => `theme_${id}_internal`;

  const missingFlags = THEME_DEFINITIONS.flatMap(t => {
    const missing: { key: string; label: string }[] = [];
    if (!flagMap.has(getLoginKey(t.id)))
      missing.push({ key: getLoginKey(t.id), label: `${t.label} - Login` });
    if (!flagMap.has(getInternalKey(t.id)))
      missing.push({ key: getInternalKey(t.id), label: `${t.label} - Interno` });
    return missing;
  });

  const seedMissingFlags = async () => {
    setIsSeeding(true);
    try {
      for (const flag of missingFlags) {
        await supabase.from('global_feature_flags').upsert(
          { key: flag.key, label: flag.label, enabled: false },
          { onConflict: 'key' }
        );
      }
      toast.success('Flags criadas com sucesso');
      queryClient.invalidateQueries({ queryKey: ['global_feature_flags'] });
    } catch (e: any) {
      toast.error(e.message || 'Erro ao criar flags');
    } finally {
      setIsSeeding(false);
    }
  };

  const ThemeRow = ({ themeId, label }: { themeId: string; label: string }) => {
    const flag = flagMap.get(themeId);
    if (!flag) return null;
    return (
      <div
        className={cn(
          'flex items-center justify-between p-4 rounded-2xl border transition-all duration-200',
          flag.enabled
            ? 'border-primary/25 bg-primary/5'
            : 'border-border/40 bg-muted/10'
        )}
      >
        <p className={cn(
          'text-sm font-bold truncate',
          !flag.enabled && 'text-muted-foreground'
        )}>
          {label}
        </p>
        <Switch
          checked={flag.enabled}
          onCheckedChange={() => toggleFlag({ key: flag.key, enabled: !flag.enabled })}
          disabled={isPending}
          className="shrink-0 ml-4"
        />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Alerta de flags faltando */}
      {missingFlags.length > 0 && (
        <div className="flex items-center justify-between p-4 rounded-2xl border border-dashed border-border bg-muted/10">
          <p className="text-xs font-bold text-muted-foreground">
            {missingFlags.length} {missingFlags.length === 1 ? 'flag pendente' : 'flags pendentes'}
          </p>
          <Button
            onClick={seedMissingFlags}
            disabled={isSeeding}
            variant="outline"
            className="h-9 rounded-xl px-4 font-bold text-xs uppercase tracking-widest"
          >
            {isSeeding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar'}
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Coluna: Tela de Login */}
        <div className="space-y-3">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
            Tela de Login
          </p>
          <div className="space-y-2 border border-border/50 rounded-[2rem] p-2 bg-muted/5">
            {THEME_DEFINITIONS.map(t => (
              <ThemeRow key={getLoginKey(t.id)} themeId={getLoginKey(t.id)} label={t.label} />
            ))}
          </div>
        </div>

        {/* Coluna: Interface Interna */}
        <div className="space-y-3">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
            Interface Interna
          </p>
          <div className="space-y-2 border border-border/50 rounded-[2rem] p-2 bg-muted/5">
            {THEME_DEFINITIONS.map(t => (
              <ThemeRow key={getInternalKey(t.id)} themeId={getInternalKey(t.id)} label={t.label} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

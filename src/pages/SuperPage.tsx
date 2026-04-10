import { useState } from 'react';
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
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { FEATURES } from '@/config/features';
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
      <div className="max-w-lg mx-auto p-6 space-y-6">
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
  const [searchCode, setSearchCode] = useState('');
  const [selectedUser, setSelectedUser] = useState<{
    id: string;
    user_code: string;
  } | null>(null);

  const { data: searchResults = [], isFetching: isSearching } =
    useSearchUserByCode(searchCode);
  const { data: overrides = [], isFetching: loadingOverrides } =
    useUserOverrides(selectedUser?.id ?? null);
  const { mutate: toggleFeature, isPending: isToggling } =
    useToggleUserFeature();

  const { data: userProfile } = useSuperUserProfile(selectedUser?.id ?? null);
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

  return (
    <div className="space-y-6">
      {!selectedUser && (
        <div className="space-y-3">
          <p
            className="text-xs font-black uppercase tracking-widest
                          text-muted-foreground"
          >
            Buscar Usuário
          </p>
          <div className="relative">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2
                                  w-4 h-4 text-muted-foreground"
            />
            {isSearching && (
              <Loader2
                className="absolute right-3.5 top-1/2 -translate-y-1/2
                                     w-4 h-4 animate-spin text-muted-foreground"
              />
            )}
            <Input
              value={searchCode}
              onChange={(e) =>
                setSearchCode(e.target.value.toUpperCase().slice(0, 8))
              }
              placeholder="FLX-XXXX"
              className="pl-10 h-12 rounded-2xl font-black text-base
                           tracking-widest text-center"
            />
          </div>

          {searchResults.length > 0 && (
            <div className="grid grid-cols-1 gap-2">
              {searchResults.map((u) => (
                <button
                  key={u.id}
                  onClick={() => {
                    setSelectedUser(u);
                    setSearchCode('');
                  }}
                  className="w-full flex items-center justify-between
                               p-4 rounded-2xl border border-border
                               hover:border-primary/40 hover:bg-primary/5
                               transition-all text-left group"
                >
                  <span
                    className="font-black tracking-widest text-sm
                                     group-hover:text-primary transition-colors"
                  >
                    {u.user_code}
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">
                    {u.id.slice(0, 8)}...
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedUser && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div
            className="flex items-center justify-between p-5
                            rounded-[2rem] bg-primary/5 border border-primary/10"
          >
            <div>
              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mb-1">
                Editando acesso de
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

          <div className="space-y-2">
            <p
              className="text-xs font-black uppercase tracking-widest
                          text-muted-foreground"
            >
              Plano
            </p>
            <select
              value={userProfile?.plan_id ?? ''}
              onChange={(e) =>
                assignPlan({
                  userId: selectedUser.id,
                  planId: e.target.value || null,
                })
              }
              className="w-full h-12 px-4 rounded-2xl border border-border
                         bg-card text-sm font-bold appearance-none
                         focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Sem plano (padrão)</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {loadingOverrides ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground opacity-20" />
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                  Telas Disponíveis
                </p>
                <div className="space-y-2">
                  {screens.map((feature) => {
                    const isEnabled = getState(
                      feature.key,
                      feature.enabledByDefault
                    );
                    const overridden = hasOverride(feature.key);

                    return (
                      <div
                        key={feature.key}
                        className={cn(
                          'flex items-center justify-between',
                          'p-4 rounded-2xl border transition-all duration-300',
                          isEnabled
                            ? 'border-border bg-card'
                            : 'border-border/40 bg-muted/20 grayscale opacity-60'
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p
                                className={cn(
                                  'text-sm font-bold transition-colors',
                                  !isEnabled && 'text-muted-foreground'
                                )}
                              >
                                {feature.label}
                              </p>
                              {overridden && (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] font-black px-1.5 h-4
                                               border-primary/30 text-primary
                                               uppercase tracking-widest"
                                >
                                  editado
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate font-medium">
                              {feature.description}
                            </p>
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
                          className="shrink-0 ml-4"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 ml-1">
                  <Star className="w-3.5 h-3.5 text-warning fill-warning/20" />
                  Premium / Recursos
                </p>
                <div className="space-y-2">
                  {premium.map((feature) => {
                    const isEnabled = getState(
                      feature.key,
                      feature.enabledByDefault
                    );
                    const overridden = hasOverride(feature.key);

                    return (
                      <div
                        key={feature.key}
                        className={cn(
                          'flex items-center justify-between',
                          'p-4 rounded-2xl border transition-all duration-300',
                          isEnabled
                            ? 'border-warning/30 bg-warning/5'
                            : 'border-border/40 bg-muted/20 grayscale opacity-60'
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Star
                            className={cn(
                              'w-4 h-4 shrink-0 transition-colors',
                              isEnabled
                                ? 'text-warning fill-warning'
                                : 'text-muted-foreground'
                            )}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p
                                className={cn(
                                  'text-sm font-bold transition-colors',
                                  !isEnabled && 'text-muted-foreground'
                                )}
                              >
                                {feature.label}
                              </p>
                              {overridden && (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] font-black px-1.5 h-4
                                               border-warning/40 text-warning
                                               uppercase tracking-widest"
                                >
                                  editado
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate font-medium">
                              {feature.description}
                            </p>
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
                          className="shrink-0 ml-4"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function SuperPlansTab() {
  const { data: plans = [] } = usePlans();
  const { mutate: createPlan, isPending: isCreating } = useCreatePlan();
  const { mutate: deletePlan } = useDeletePlan();
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {!selectedPlanId && (
        <>
          <div className="space-y-2">
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
            <Button
              onClick={() => {
                if (!newName.trim()) return;
                createPlan(
                  { name: newName, description: newDesc },
                  {
                    onSuccess: () => {
                      setNewName('');
                      setNewDesc('');
                    },
                  }
                );
              }}
              disabled={isCreating || !newName.trim()}
              className="w-full h-11 rounded-2xl font-black text-xs
                         uppercase tracking-widest"
            >
              <Plus className="w-4 h-4 mr-2" />
              Criar Plano
            </Button>
          </div>

          <div className="space-y-2">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="flex items-center justify-between p-4
                           rounded-2xl border border-border bg-card"
              >
                <button
                  onClick={() => setSelectedPlanId(plan.id)}
                  className="flex-1 text-left"
                >
                  <p className="text-sm font-black">{plan.name}</p>
                  {plan.description && (
                    <p className="text-xs text-muted-foreground">
                      {plan.description}
                    </p>
                  )}
                </button>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => setSelectedPlanId(plan.id)}
                    className="p-2 rounded-xl hover:bg-muted transition-colors"
                    aria-label="Editar features do plano"
                  >
                    <Pencil className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => {
                        if (confirm('Excluir este plano?')) {
                            deletePlan(plan.id);
                        }
                    }}
                    className="p-2 rounded-xl hover:bg-destructive/10
                               transition-colors"
                    aria-label="Excluir plano"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {selectedPlanId && (
        <PlanFeaturesEditor
          planId={selectedPlanId}
          planName={plans.find((p) => p.id === selectedPlanId)?.name ?? ''}
          onBack={() => setSelectedPlanId(null)}
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
                           rounded-2xl border border-border bg-card"
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
                    ? 'border-warning/30 bg-warning/5'
                    : 'border-border/40 bg-muted/20 grayscale opacity-60'
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
  );
}

function SuperThemesTab() {
  const { data: flags = [] } = useGlobalFlags();
  const { mutate: toggleFlag, isPending } = useToggleGlobalFlag();

  const themeIcons: Record<string, string> = {
    theme_easter: '🐣',
    theme_christmas: '🎄',
    theme_halloween: '🎃',
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground leading-relaxed">
        Temas globais são exibidos para <strong>todos os usuários</strong> quando
        habilitados. Cada usuário pode escolher aplicar ou não.
      </p>

      <div className="space-y-2">
        {flags.map((flag) => (
          <div
            key={flag.key}
            className={cn(
              'flex items-center justify-between p-4 rounded-2xl border',
              'transition-all',
              flag.enabled
                ? 'border-purple-400/30 bg-purple-400/5'
                : 'border-border/40 bg-muted/20'
            )}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{themeIcons[flag.key] ?? '✨'}</span>
              <div>
                <p
                  className={cn(
                    'text-sm font-bold transition-colors',
                    !flag.enabled && 'text-muted-foreground'
                  )}
                >
                  {flag.label ?? flag.key}
                </p>
                <p className="text-xs text-muted-foreground">
                  {flag.enabled ? 'Visível para todos' : 'Oculto'}
                </p>
              </div>
            </div>
            <Switch
              checked={flag.enabled}
              onCheckedChange={() =>
                toggleFlag({ key: flag.key, enabled: !flag.enabled })
              }
              disabled={isPending}
              className="shrink-0 ml-4"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

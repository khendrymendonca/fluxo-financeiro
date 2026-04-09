import { useState } from 'react';
import { Shield, Search, Star, X, Loader2, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
} from '@/hooks/useFeatureFlags';

export default function SuperPage() {
  const isSuperAdmin = useIsSuperAdmin();
  const navigate = useNavigate();

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

  if (!isSuperAdmin) {
    // Usar useEffect para redirecionar se necessário, 
    // ou apenas retornar null se o hook de auth ainda estiver carregando
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

  const getState = (featureKey: string, defaultEnabled: boolean): boolean => {
    const override = overrides.find((o) => o.feature_key === featureKey);
    return override !== undefined ? override.enabled : defaultEnabled;
  };

  const hasOverride = (featureKey: string): boolean =>
    overrides.some((o) => o.feature_key === featureKey);

  const screens = FEATURES.filter((f) => f.type === 'screen');
  const premium = FEATURES.filter((f) => f.type === 'premium');

  return (
    <div className="min-h-screen bg-background text-foreground animate-in fade-in duration-500">
      <div className="max-w-lg mx-auto p-6 space-y-8">

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
                Controle de acesso por usuário
              </p>
            </div>
          </div>
        </div>

        {/* Busca */}
        {!selectedUser && (
          <div className="space-y-3">
            <p className="text-xs font-black uppercase tracking-widest
                          text-muted-foreground">
              Buscar Usuário
            </p>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2
                                  w-4 h-4 text-muted-foreground" />
              {isSearching && (
                <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2
                                     w-4 h-4 animate-spin text-muted-foreground" />
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

            {/* Resultados */}
            {searchResults.length > 0 && (
              <div className="grid grid-cols-1 gap-2 animate-in fade-in duration-150">
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
                    <span className="font-black tracking-widest text-sm
                                     group-hover:text-primary transition-colors">
                      {u.user_code}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">
                      {u.id.slice(0, 8)}...
                    </span>
                  </button>
                ))}
              </div>
            )}

            {searchCode.length >= 3 && searchResults.length === 0 &&
              !isSearching && (
              <p className="text-xs text-muted-foreground text-center py-4 italic">
                Nenhum usuário encontrado com este código.
              </p>
            )}
          </div>
        )}

        {/* Usuário selecionado */}
        {selectedUser && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">

            {/* Card do usuário */}
            <div className="flex items-center justify-between p-5
                            rounded-[2rem] bg-primary/5 border border-primary/10">
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

            {loadingOverrides ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground opacity-20" />
              </div>
            ) : (
              <>
                {/* Telas */}
                <div className="space-y-3">
                  <p className="text-xs font-black uppercase tracking-widest
                                text-muted-foreground ml-1">
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
                                <p className={cn(
                                  'text-sm font-bold transition-colors',
                                  !isEnabled && 'text-muted-foreground'
                                )}>
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

                {/* Premium */}
                <div className="space-y-3">
                  <p className="text-xs font-black uppercase tracking-widest
                                text-muted-foreground flex items-center gap-2 ml-1">
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
                            <Star className={cn(
                              'w-4 h-4 shrink-0 transition-colors',
                              isEnabled ? 'text-warning fill-warning' : 'text-muted-foreground'
                            )} />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className={cn(
                                  'text-sm font-bold transition-colors',
                                  !isEnabled && 'text-muted-foreground'
                                )}>
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

                {/* Reset overrides */}
                {overrides.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={async () => {
                      // Restaura todos os padrões
                      overrides.forEach(o => {
                         const feature = FEATURES.find(f => f.key === o.feature_key);
                         if (feature && o.enabled !== feature.enabledByDefault) {
                             toggleFeature({
                                userId: selectedUser.id,
                                featureKey: o.feature_key,
                                enabled: feature.enabledByDefault,
                             });
                         }
                      });
                    }}
                    className="w-full h-12 rounded-2xl font-black text-[10px]
                               uppercase tracking-widest text-muted-foreground
                               border-dashed hover:bg-muted transition-colors"
                  >
                    Restaurar padrões deste usuário
                  </Button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

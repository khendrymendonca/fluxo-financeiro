import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/hooks/useTheme';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useMobileShortcuts, ShortcutId } from '@/hooks/useMobileShortcuts';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useDeleteUserAccount } from '@/hooks/useAccountMutations';
import { useFeatureFlag, useUserProfile, useGlobalFlag } from '@/hooks/useFeatureFlags';
import { BandeiraBrasil } from '@/components/branding/BandeiraBrasil';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
    User,
    Mail,
    Lock,
    Palette,
    Info,
    Sun,
    Moon,
    Zap,
    Monitor,
    CheckCircle2,
    LayoutDashboard,
    ArrowUpDown,
    Receipt,
    CreditCard,
    Wallet,
    Star,
    Rocket,
    Smartphone,
    AlertCircle,
    Loader2,
    HelpCircle,
    Plus
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { AppLogo } from '@/components/branding/AppLogo';
import { VisualColorPicker } from '@/components/ui/VisualColorPicker';

// BandeiraBrasil importada de @/components/branding/BandeiraBrasil

export function ProfileSettings() {
    const { user } = useAuth();
    const { theme, setTheme } = useTheme();
    const { accentColor, setAccentColor, accentColors, modoTorcida, setModoTorcida, customPalette, setCustomPalette } = useThemeColor();
    const copaInternalEnabled = useGlobalFlag('theme_copa_internal');
    const easterInternalEnabled = useGlobalFlag('theme_easter_internal');
    const christmasInternalEnabled = useGlobalFlag('theme_christmas_internal');
    const halloweenInternalEnabled = useGlobalFlag('theme_halloween_internal');
    const { shortcuts, saveShortcuts } = useMobileShortcuts();
    const isMobile = useIsMobile();
    const [searchParams, setSearchParams] = useSearchParams();

    const buildDate = useState(() => {
        try {
            return __BUILD_DATE__ ? new Date(__BUILD_DATE__) : null;
        } catch {
            return null;
        }
    })[0];

    const appVersion = `${__APP_VERSION__}${__GIT_SHA__ ? ` (${__GIT_SHA__})` : ''}`;

    // Feature Flags & Profile
    const hasThemeCustomizationAccess = useFeatureFlag('theme_customization');
    const themeCustomizationTemporarilyUnlocked = true;
    const canCustomizeTheme = themeCustomizationTemporarilyUnlocked || hasThemeCustomizationAccess;
    const { data: profile } = useUserProfile();

    // Estados para o formulário
    const [name, setName] = useState(user?.user_metadata?.full_name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [fluxoScoreEnabled, setFluxoScoreEnabled] = useState(() => {
        try {
            if (!user?.id) return true;
            const raw = localStorage.getItem(`fluxo_score_enabled:${user.id}`);
            return raw === null ? true : raw === 'true';
        } catch {
            return true;
        }
    });

    // LGPD — Estados de exclusão de conta
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const { mutate: deleteUserAccount, isPending: isDeletingAccount } = useDeleteUserAccount();

    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [helpTab, setHelpTab] = useState<'lancamentos' | 'transferencias' | 'score'>('lancamentos');

    const toggleShortcut = async (id: ShortcutId) => {
        let newShortcuts: ShortcutId[];
        if (shortcuts.includes(id)) {
            newShortcuts = shortcuts.filter(s => s !== id);
        } else {
            if (shortcuts.length >= 4) {
                toast.error('Máximo de 4 atalhos permitidos');
                return;
            }
            newShortcuts = [...shortcuts, id];
        }
        await saveShortcuts(newShortcuts);
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // Atualizar Perfil Completo (Nome, Tema, Cor)
            const { error } = await supabase.auth.updateUser({
                data: {
                    ...user?.user_metadata,
                    full_name: name,
                    theme: theme,
                    accent_color: accentColor
                }
            });
            if (error) throw error;

            // Se o email mudou
            if (email !== user?.email) {
                const { error: emailError } = await supabase.auth.updateUser({ email });
                if (emailError) throw emailError;
                toast.info('Confirmação enviada para o novo e-mail.');
            }

            // Atualizar Senha
            if (password) {
                const { error: errorPass } = await supabase.auth.updateUser({ password });
                if (errorPass) throw errorPass;
                setPassword('');
            }

            toast.success('Perfil atualizado com sucesso!');
        } catch (error: any) {
            toast.error(error.message || 'Erro ao atualizar perfil');
        } finally {
            setIsLoading(false);
        }
    };

    const toggleFluxoScore = (enabled: boolean) => {
        setFluxoScoreEnabled(enabled);
        try {
            if (user?.id) {
                localStorage.setItem(`fluxo_score_enabled:${user.id}`, String(enabled));
            }
        } catch {
            // Preferência local não é crítica.
        }
    };

    const availableShortcuts: { id: ShortcutId; label: string; icon: any }[] = [
        { id: 'transactions', label: 'Lançamentos', icon: ArrowUpDown },
        { id: 'cards', label: 'Cartões', icon: CreditCard },
        { id: 'bills', label: 'Fixas', icon: Receipt },
        { id: 'accounts', label: 'Contas', icon: Wallet },
        { id: 'goals', label: 'Projetos', icon: Rocket },
    ];

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 md:pb-10">
            {/* Header */}
            <div className="flex flex-col gap-1 px-4 md:px-0">
                <h1 className="text-3xl font-black tracking-tight">Ajustes e Perfil</h1>
                <p className="text-zinc-500 dark:text-zinc-400 font-medium">Gerencie sua conta e as preferências do seu Fluxo.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-4 md:px-0">
                {/* Card 1: Meus Dados */}
                <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-8 border border-gray-100 dark:border-zinc-800 shadow-sm space-y-6 md:col-span-2">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                            <User className="w-5 h-5" />
                        </div>
                        <h2 className="text-xl font-bold">Meus Dados</h2>
                    </div>

                    {profile?.user_code && (
                        <div className="flex items-center justify-between p-5 rounded-2xl bg-gray-50/50 dark:bg-zinc-950/50 border border-gray-100 dark:border-zinc-800 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div>
                                <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mb-1">
                                    Seu código de acesso
                                </p>
                                <p className="text-2xl font-black tracking-widest text-foreground leading-none">
                                    {profile.user_code}
                                </p>
                            </div>
                            <Badge variant="outline" className="font-bold text-[10px] uppercase tracking-widest border-zinc-200 dark:border-zinc-700">
                                Fluxo ID
                            </Badge>
                        </div>
                    )}

                    <form onSubmit={handleUpdateProfile} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-xs font-black uppercase tracking-widest text-zinc-500 ml-1">Apelido</Label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                <Input
                                    id="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="pl-11 h-12 rounded-2xl border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-950/50 font-bold"
                                    placeholder="Como quer ser chamado?"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-xs font-black uppercase tracking-widest text-zinc-500 ml-1">E-mail da Conta</Label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                <Input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="pl-11 h-12 rounded-2xl border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-950/50 font-bold"
                                    placeholder="seu@email.com"
                                />
                            </div>
                            <p className="text-xs text-zinc-400 dark:text-zinc-500 font-bold italic ml-1">
                                Uma confirmação será enviada para o novo e-mail.
                            </p>
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="pass" className="text-xs font-black uppercase tracking-widest text-zinc-500 ml-1">Deseja mudar a senha?</Label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                <Input
                                    id="pass"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="pl-11 h-12 rounded-2xl border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-950/50 font-bold"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="md:col-span-2 h-14 rounded-3xl bg-primary text-white font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20"
                        >
                            {isLoading ? 'Salvando...' : 'Salvar Alterações'}
                        </Button>
                    </form>
                </div>

                {/* Card Premium: Atalhos Mobile */}
                <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-8 border border-gray-100 dark:border-zinc-800 shadow-sm space-y-6 md:col-span-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                                <Smartphone className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold">Menu Inferior (Mobile)</h2>
                                <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Escolha até 4 atalhos para sua barra de navegação</p>
                            </div>
                        </div>
                        <div className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-black uppercase">
                            {shortcuts.length}/4
                        </div>
                    </div>

                    {shortcuts.length === 0 && (
                        <div className="bg-amber-500/10 text-amber-600 dark:text-amber-500 p-4 rounded-2xl flex items-start gap-3 border border-amber-500/20 animate-in fade-in slide-in-from-top-2">
                            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-bold">Barra de navegação inativa</p>
                                <p className="text-xs mt-0.5 opacity-80">Como não há atalhos selecionados, o menu inferior ficará oculto no celular para maximizar o espaço da tela.</p>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {availableShortcuts.map((item) => (
                            <div
                                key={item.id}
                                className={cn(
                                    "flex items-center justify-between p-4 rounded-3xl border transition-all duration-300",
                                    shortcuts.includes(item.id)
                                        ? "bg-primary/5 border-primary/20 shadow-sm"
                                        : "bg-gray-50/50 dark:bg-zinc-950/50 border-gray-100 dark:border-zinc-800 opacity-60"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-10 h-10 rounded-2xl flex items-center justify-center transition-colors",
                                        shortcuts.includes(item.id) ? "bg-primary text-white" : "bg-muted text-zinc-400"
                                    )}>
                                        <item.icon className="w-5 h-5" />
                                    </div>
                                    <span className="font-bold text-sm">{item.label}</span>
                                </div>
                                <Switch
                                    checked={shortcuts.includes(item.id)}
                                    onCheckedChange={() => toggleShortcut(item.id)}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Card 2: Aparência */}
                <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-8 border border-gray-100 dark:border-zinc-800 shadow-sm space-y-6 md:col-span-2">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                            <Palette className="w-5 h-5" />
                        </div>
                        <h2 className="text-xl font-bold">Aparência</h2>
                    </div>

                    <div className="rounded-3xl border border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-950/40 p-5">
                        <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                                <p className="text-sm font-bold text-foreground">Fluxo Score</p>
                                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                    Exibe o card de Score na tela de Relatórios.
                                </p>
                            </div>
                            <Switch checked={fluxoScoreEnabled} onCheckedChange={toggleFluxoScore} />
                        </div>
                    </div>

                    {(() => {
                        const themeOptions = [
                            { id: 'light', icon: Sun, label: 'Claro' },
                            { id: 'dark', icon: Moon, label: 'Escuro' },
                            { id: 'amoled', icon: Zap, label: 'AMOLED' },
                            { id: 'system', icon: Monitor, label: 'Sistema' },
                        ].filter(t => isMobile || t.id !== 'amoled');
                        
                        return (
                            <div className={cn(
                                "grid gap-3",
                                themeOptions.length === 4 ? "grid-cols-2" : "grid-cols-3"
                            )}>
                                {themeOptions.map((t) => (
                                    <button
                                        key={t.id}
                                        onClick={() => setTheme(t.id as any)}
                                        className={cn(
                                            "flex flex-col items-center justify-center gap-2 p-4 rounded-3xl border-2 transition-all duration-300",
                                            theme === t.id
                                                ? "bg-primary/10 border-primary text-primary shadow-inner"
                                                : "bg-gray-50 dark:bg-zinc-950/50 border-transparent text-zinc-500 dark:text-zinc-400 hover:border-gray-200 dark:hover:border-zinc-800"
                                        )}
                                    >
                                        <t.icon className={cn("w-6 h-6", theme === t.id ? "scale-110" : "")} />
                                        <span className="text-xs font-black uppercase tracking-widest">{t.label}</span>
                                    </button>
                                ))}
                            </div>
                        );
                    })()}

                    {/* Modo Torcida Copa do Mundo */}
                    {copaInternalEnabled && (
                        <div className="relative overflow-hidden rounded-3xl border-2 border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-amber-500/10 to-blue-500/10 p-6 shadow-sm group">
                            {/* Efeitos de fundo sutis */}
                            <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-amber-400/20 rounded-full blur-2xl group-hover:scale-110 transition-transform duration-500" />
                            <div className="absolute -left-10 -top-10 w-32 h-32 bg-emerald-400/20 rounded-full blur-2xl group-hover:scale-110 transition-transform duration-500" />
                            
                            <div className="relative flex items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <BandeiraBrasil />
                                        <h3 className="font-black text-sm uppercase tracking-widest text-foreground">
                                            Modo Torcida Copa
                                        </h3>
                                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-500 text-white animate-pulse">
                                            Copa 2026
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-relaxed max-w-[260px]">
                                        Deixe o app verde, amarelo e azul em clima de Copa! Mantém o fundo chumbo, preto ou branco.
                                    </p>
                                </div>
                                <Switch 
                                    id="modo-torcida-switch"
                                    checked={modoTorcida} 
                                    onCheckedChange={setModoTorcida}
                                    className="data-[state=checked]:bg-emerald-500"
                                />
                            </div>
                        </div>
                    )}

                    <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-zinc-800">
                        <Label className="text-xs font-black uppercase tracking-widest text-zinc-500 ml-1">Cor de Destaque</Label>
                        
                        {canCustomizeTheme ? (
                            <div className="space-y-3">
                                {modoTorcida && (
                                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider animate-fade-in flex items-center gap-1.5">
                                        <BandeiraBrasil />
                                        Cores pré-definidas suspensas no Modo Torcida
                                    </p>
                                )}
                                <div className={cn("flex flex-wrap gap-2 transition-opacity duration-300", (modoTorcida || customPalette.active) ? "opacity-40 pointer-events-none" : "")}>
                                    {accentColors.map((color) => (
                                        <button
                                            key={color.id}
                                            disabled={modoTorcida || customPalette.active}
                                            onClick={() => setAccentColor(color.id)}
                                            className={cn(
                                                "relative w-6 h-6 rounded-full transition-all duration-300 flex items-center justify-center overflow-hidden border-2",
                                                accentColor === color.id
                                                    ? "scale-105 shadow-md border-white dark:border-zinc-800 ring-2 ring-primary/40"
                                                    : "hover:scale-105 border-transparent opacity-80 hover:opacity-100"
                                            )}
                                            style={{ backgroundColor: `hsl(${color.hsl})` }}
                                            title={color.name}
                                        >
                                            {accentColor === color.id && (
                                                <div className="bg-white/30 backdrop-blur-sm w-full h-full flex items-center justify-center">
                                                    <CheckCircle2 className="w-3 h-3 text-white drop-shadow-md" />
                                                </div>
                                            )}
                                        </button>
                                    ))}

                                    {/* Botões sazonais se ativados internamente */}
                                    {easterInternalEnabled && (
                                        <button
                                            disabled={modoTorcida || customPalette.active}
                                            onClick={() => setAccentColor('pascoa')}
                                            className={cn(
                                                "relative w-6 h-6 rounded-full transition-all duration-300 flex items-center justify-center overflow-hidden border-2",
                                                accentColor === 'pascoa'
                                                    ? "scale-105 shadow-md border-white dark:border-zinc-800 ring-2 ring-primary/40"
                                                    : "hover:scale-105 border-transparent opacity-80 hover:opacity-100"
                                            )}
                                            style={{ backgroundColor: 'hsl(20 90% 55%)' }}
                                            title="Modo Páscoa"
                                        >
                                            {accentColor === 'pascoa' && (
                                                <div className="bg-white/30 backdrop-blur-sm w-full h-full flex items-center justify-center">
                                                    <CheckCircle2 className="w-3 h-3 text-white drop-shadow-md" />
                                                </div>
                                            )}
                                        </button>
                                    )}
                                    {christmasInternalEnabled && (
                                        <button
                                            disabled={modoTorcida || customPalette.active}
                                            onClick={() => setAccentColor('christmas')}
                                            className={cn(
                                                "relative w-6 h-6 rounded-full transition-all duration-300 flex items-center justify-center overflow-hidden border-2",
                                                accentColor === 'christmas'
                                                    ? "scale-105 shadow-md border-white dark:border-zinc-800 ring-2 ring-primary/40"
                                                    : "hover:scale-105 border-transparent opacity-80 hover:opacity-100"
                                            )}
                                            style={{ backgroundColor: 'hsl(0 72% 35%)' }}
                                            title="Modo Natal"
                                        >
                                            {accentColor === 'christmas' && (
                                                <div className="bg-white/30 backdrop-blur-sm w-full h-full flex items-center justify-center">
                                                    <CheckCircle2 className="w-3 h-3 text-white drop-shadow-md" />
                                                </div>
                                            )}
                                        </button>
                                    )}
                                    {halloweenInternalEnabled && (
                                        <button
                                            disabled={modoTorcida || customPalette.active}
                                            onClick={() => setAccentColor('halloween')}
                                            className={cn(
                                                "relative w-6 h-6 rounded-full transition-all duration-300 flex items-center justify-center overflow-hidden border-2",
                                                accentColor === 'halloween'
                                                    ? "scale-105 shadow-md border-white dark:border-zinc-800 ring-2 ring-primary/40"
                                                    : "hover:scale-105 border-transparent opacity-80 hover:opacity-100"
                                            )}
                                            style={{ backgroundColor: 'hsl(24 100% 50%)' }}
                                            title="Modo Halloween"
                                        >
                                            {accentColor === 'halloween' && (
                                                <div className="bg-white/30 backdrop-blur-sm w-full h-full flex items-center justify-center">
                                                    <CheckCircle2 className="w-3 h-3 text-white drop-shadow-md" />
                                                </div>
                                            )}
                                        </button>
                                    )}
                                </div>

                                {/* Seção: Paleta Customizada (RGB Picker) */}
                                <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-zinc-800">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label htmlFor="custom-palette-switch" className="text-xs font-black uppercase tracking-widest text-zinc-500">
                                                Criar Minha Paleta
                                            </Label>
                                            <p className="text-[10px] text-muted-foreground mt-0.5">
                                                Defina suas próprias cores RGB para o aplicativo
                                            </p>
                                        </div>
                                        <Switch
                                            id="custom-palette-switch"
                                            disabled={modoTorcida}
                                            checked={customPalette.active}
                                            onCheckedChange={(checked) => {
                                                setCustomPalette({
                                                    ...customPalette,
                                                    active: checked
                                                });
                                            }}
                                        />
                                    </div>

                                    {customPalette.active && !modoTorcida && (
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1 animate-in fade-in slide-in-from-top-2 duration-300">
                                            <VisualColorPicker
                                                label="Destaque"
                                                value={customPalette.primary}
                                                onChange={(val) => {
                                                    setCustomPalette({
                                                        ...customPalette,
                                                        primary: val
                                                    });
                                                }}
                                            />
                                            <VisualColorPicker
                                                label="Contornos"
                                                value={customPalette.border}
                                                onChange={(val) => {
                                                    setCustomPalette({
                                                        ...customPalette,
                                                        border: val
                                                    });
                                                }}
                                            />
                                            <VisualColorPicker
                                                label="Ícones"
                                                value={customPalette.icon}
                                                onChange={(val) => {
                                                    setCustomPalette({
                                                        ...customPalette,
                                                        icon: val
                                                    });
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 rounded-2xl bg-gray-50/50 dark:bg-zinc-950/50 border border-gray-100 dark:border-zinc-800 flex items-center gap-4 animate-in fade-in duration-300">
                                <div className="w-10 h-10 rounded-full shrink-0 shadow-lg border-4 border-white dark:border-zinc-800"
                                     style={{ backgroundColor: '#0d9488' }} />
                                <div>
                                    <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Verde Água (Padrão)</p>
                                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                                        Personalização de cores é um recurso premium
                                    </p>
                                </div>
                                <Star className="w-4 h-4 text-warning ml-auto" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Card 4: Central de Ajuda */}
                <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-8 border border-gray-100 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                                <HelpCircle className="w-5 h-5" />
                            </div>
                            <h2 className="text-xl font-bold">Central de Ajuda</h2>
                        </div>

                        <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
                            Aprenda a lançar estornos, abatimentos de fatura, realizar Pix no crédito e descubra como o Score é calculado.
                        </p>

                        <Button 
                            type="button"
                            onClick={() => setIsHelpOpen(true)}
                            className="w-full h-12 rounded-2xl bg-primary/10 hover:bg-primary/20 text-primary font-bold text-sm transition-all"
                        >
                            Ver Tutoriais & FAQ
                        </Button>
                    </div>
                </div>

                {/* Card 5: Sobre */}
                <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-8 border border-gray-100 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                                <Info className="w-5 h-5" />
                            </div>
                            <h2 className="text-xl font-bold">Sobre o Fluxo</h2>
                        </div>

                        <div className="flex flex-col items-center py-4 bg-gray-50/50 dark:bg-zinc-950/50 rounded-3xl border border-gray-100 dark:border-zinc-800 w-full">
                            <div className="text-primary mb-4 flex items-center justify-center">
                                <AppLogo className="h-12 w-36" />
                            </div>
                            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Gestão Inteligente</p>
                        </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-gray-100 dark:border-zinc-800 space-y-3">
                        <div className="flex flex-col gap-1">
                            <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest">
                                <span className="text-zinc-400 dark:text-zinc-600">Versão</span>
                                <span className="text-zinc-600 dark:text-zinc-400">{appVersion}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest">
                                <span className="text-zinc-400 dark:text-zinc-600">Atualização</span>
                                <span className="text-zinc-600 dark:text-zinc-400">
                                    {buildDate ? buildDate.toLocaleDateString('pt-BR') : '—'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ZONA DE PERIGO — LGPD Art. 18 VI */}
                <div className="mt-8 pt-8 border-t border-danger/20 md:col-span-2">
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-widest text-danger">
                                Zona de Perigo
                            </h3>
                            <p className="text-xs text-muted-foreground mt-1">
                                Ações irreversíveis. Leia com atenção antes de prosseguir.
                            </p>
                        </div>

                        <div className="p-5 rounded-2xl border border-danger/20 bg-danger/5 space-y-4">
                            <div>
                                <p className="text-sm font-bold text-foreground">
                                    Excluir minha conta permanentemente
                                </p>
                                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                    Remove <strong>todos os seus dados</strong> do Fluxo:
                                    transações, contas, cartões, metas, dívidas e categorias.
                                    Esta ação é <strong>irreversível</strong> e está em
                                    conformidade com a{' '}
                                    <strong>LGPD (Art. 18, VI)</strong>.
                                </p>
                            </div>

                            {!showDeleteConfirm ? (
                                <Button
                                    variant="outline"
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="h-10 rounded-xl border-danger/30 text-danger
                                             hover:bg-danger/10 hover:border-danger/50
                                             font-bold text-xs uppercase tracking-widest"
                                >
                                    Excluir minha conta
                                </Button>
                            ) : (
                                <div className="space-y-3 animate-in fade-in duration-200">
                                    <p className="text-xs font-bold text-danger">
                                        Para confirmar, digite{' '}
                                        <strong className="font-black">EXCLUIR</strong> abaixo:
                                    </p>
                                    <Input
                                        value={deleteConfirmText}
                                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                                        placeholder="Digite EXCLUIR para confirmar"
                                        className="h-10 rounded-xl border-danger/30 focus:border-danger
                                                   font-bold text-sm"
                                        autoFocus
                                    />
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setShowDeleteConfirm(false);
                                                setDeleteConfirmText('');
                                            }}
                                            className="flex-1 h-10 rounded-xl font-bold text-xs"
                                            disabled={isDeletingAccount}
                                        >
                                            Cancelar
                                        </Button>
                                        <Button
                                            onClick={() => {
                                                if (deleteConfirmText === 'EXCLUIR' && user?.id) {
                                                    deleteUserAccount(user.id);
                                                }
                                            }}
                                            disabled={
                                                deleteConfirmText !== 'EXCLUIR' || isDeletingAccount
                                            }
                                            className="flex-1 h-10 rounded-xl font-black text-xs
                                                       uppercase tracking-widest bg-danger
                                                       hover:bg-danger/90 text-white
                                                       disabled:opacity-40"
                                        >
                                            {isDeletingAccount ? (
                                                <>
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                                                    Excluindo...
                                                </>
                                            ) : (
                                                'Confirmar Exclusão'
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal Central de Ajuda */}
            {isHelpOpen && (
                <Portal>
                    <div 
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
                        onClick={() => setIsHelpOpen(false)}
                    >
                        <div 
                            className="bg-card rounded-[2rem] shadow-2xl w-full max-w-xl animate-in zoom-in-95 duration-200 border border-border/50 max-h-[85vh] flex flex-col overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="px-6 py-5 border-b border-border bg-muted/5 flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-extrabold tracking-tight">Central de Ajuda</h2>
                                    <p className="text-xs text-muted-foreground font-medium">Entenda as regras e aprenda a usar o app.</p>
                                </div>
                                <Button 
                                    variant="ghost" 
                                    onClick={() => setIsHelpOpen(false)} 
                                    className="p-2.5 rounded-2xl hover:bg-muted text-muted-foreground"
                                >
                                    <Plus className="w-5 h-5 rotate-45" />
                                </Button>
                            </div>

                            {/* Tabs Navigation */}
                            <div className="flex p-2 bg-muted/30 border-b border-border gap-1">
                                {(['lancamentos', 'transferencias', 'score'] as const).map(tab => (
                                    <button
                                        key={tab}
                                        onClick={() => setHelpTab(tab)}
                                        className={cn(
                                            "flex-1 py-2 text-xs font-bold rounded-xl transition-all uppercase tracking-wider",
                                            helpTab === tab 
                                                ? "bg-background text-foreground shadow-sm font-black" 
                                                : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        {tab === 'lancamentos' ? 'Lançamentos' : tab === 'transferencias' ? 'Transferências' : 'Fluxo Score'}
                                    </button>
                                ))}
                            </div>

                            {/* Tab Content */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                {helpTab === 'lancamentos' && (
                                    <div className="space-y-5 animate-in fade-in duration-300">
                                        <div className="space-y-2">
                                            <h3 className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-primary" /> Como lançar Estorno no Cartão
                                            </h3>
                                            <p className="text-xs text-muted-foreground leading-relaxed pl-4">
                                                Ao receber o reembolso de uma compra cancelada no cartão de crédito, você deve registrar uma <strong>Receita</strong>. No formulário:
                                            </p>
                                            <ul className="list-disc text-xs text-muted-foreground pl-8 space-y-1">
                                                <li>Escolha a categoria <strong className="text-foreground">Estorno</strong> (ou Reembolso).</li>
                                                <li>Defina o destino como o <strong className="text-foreground">Cartão de Crédito</strong> de origem.</li>
                                                <li>Isso abaterá o valor diretamente na fatura do mês correspondente, liberando o limite.</li>
                                            </ul>
                                        </div>

                                        <div className="space-y-2">
                                            <h3 className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-primary" /> Como lançar Abatimento de Fatura
                                            </h3>
                                            <p className="text-xs text-muted-foreground leading-relaxed pl-4">
                                                Se você recebeu créditos de cashback ou ajustes manuais do banco na fatura do cartão:
                                            </p>
                                            <ul className="list-disc text-xs text-muted-foreground pl-8 space-y-1">
                                                <li>Registre uma <strong className="text-foreground">Receita</strong> no app.</li>
                                                <li>Selecione a categoria <strong className="text-foreground">Abatimento Fatura</strong>.</li>
                                                <li>Defina o destino como o <strong className="text-foreground">Cartão de Crédito</strong>.</li>
                                                <li>Esse crédito reduzirá o valor final bruto cobrado no vencimento da fatura.</li>
                                            </ul>
                                        </div>
                                    </div>
                                )}

                                {helpTab === 'transferencias' && (
                                    <div className="space-y-5 animate-in fade-in duration-300">
                                        <div className="space-y-2">
                                            <h3 className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-primary" /> Transferências entre Contas
                                            </h3>
                                            <p className="text-xs text-muted-foreground leading-relaxed pl-4">
                                                Para mover saldo de uma conta corrente para outra conta poupança ou carteira, use a aba <strong className="text-foreground">Transferência</strong> no formulário principal de lançamentos. Ambas as contas são atualizadas ao mesmo tempo.
                                            </p>
                                        </div>

                                        <div className="space-y-2">
                                            <h3 className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-primary" /> Transferências via Cartão de Crédito
                                            </h3>
                                            <p className="text-xs text-muted-foreground leading-relaxed pl-4">
                                                Se você realizou um <strong className="text-foreground">Pix no crédito</strong> ou pagou um boleto usando o limite do cartão:
                                            </p>
                                            <ul className="list-disc text-xs text-muted-foreground pl-8 space-y-1">
                                                <li>Acesse a aba de <strong className="text-foreground">Transferência</strong>.</li>
                                                <li>No campo "Origem", selecione a opção <strong className="text-foreground">Cartão</strong>.</li>
                                                <li>Selecione o cartão de crédito e a conta de destino.</li>
                                                <li>O sistema lançará automaticamente uma despesa na fatura do cartão (com vencimento futuro) e uma receita imediata na conta de destino, ambas vinculadas à categoria automática de <strong className="text-foreground">Transferência</strong>.</li>
                                            </ul>
                                        </div>
                                    </div>
                                )}

                                {helpTab === 'score' && (
                                    <div className="space-y-5 animate-in fade-in duration-300">
                                        <div className="space-y-2">
                                            <h3 className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-primary" /> O que é o Fluxo Score?
                                            </h3>
                                            <p className="text-xs text-muted-foreground leading-relaxed pl-4">
                                                O Fluxo Score é uma pontuação de <strong className="text-foreground">0 a 1000</strong> baseada no seu comportamento financeiro no aplicativo. Ele mede sua pontualidade e o progresso na quitação de dívidas para incentivar hábitos saudáveis.
                                            </p>
                                        </div>

                                        <div className="space-y-2">
                                            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider pl-4">Como aumentar seu Score</h3>
                                            <ul className="list-disc text-xs text-muted-foreground pl-8 space-y-1">
                                                <li><strong className="text-foreground">Quitação de Acordos</strong>: Acordos de renegociação concluídos (com todas as parcelas pagas) eliminam por completo as penalidades, elevando o seu score.</li>
                                                <li><strong className="text-foreground">Bônus Mensal (+10)</strong>: No primeiro dia útil de cada mês, se você não tiver nenhuma despesa atrasada pendente, receberá uma bonificação especial no Score.</li>
                                                <li><strong className="text-foreground">Contas em Dia</strong>: Pagar despesas fixas e faturas até a data de vencimento preserva seu Score em 1000 pontos.</li>
                                            </ul>
                                        </div>

                                        <div className="space-y-2">
                                            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider pl-4">O que penaliza seu Score</h3>
                                            <ul className="list-disc text-xs text-muted-foreground pl-8 space-y-1">
                                                <li><strong className="text-foreground">Atrasos</strong>: Contas vencidas e não pagas deduzem pontos progressivamente conforme a quantidade de dias em atraso.</li>
                                                <li><strong className="text-foreground">Acordos Ativos</strong>: Renegociações ativas geram uma penalidade temporária de -100 pontos, que diminui proporcionalmente à medida que você paga as parcelas do acordo.</li>
                                            </ul>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="px-6 py-4 border-t border-border bg-muted/10 sticky bottom-0 rounded-b-[2rem]">
                                <Button 
                                    onClick={() => setIsHelpOpen(false)} 
                                    className="w-full h-11 rounded-xl bg-foreground text-background font-bold text-xs uppercase tracking-wider"
                                >
                                    Fechar Ajuda
                                </Button>
                            </div>
                        </div>
                    </div>
                </Portal>
            )}
        </div>
    );
}

export default ProfileSettings;

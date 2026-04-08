import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/hooks/useTheme';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useMobileShortcuts, ShortcutId } from '@/hooks/useMobileShortcuts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
    Bell,
    LayoutDashboard,
    ArrowUpDown,
    Receipt,
    CreditCard,
    Wallet,
    Rocket,
    Smartphone,
    AlertCircle
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

export function ProfileSettings() {
    const { user } = useAuth();
    const { theme, setTheme } = useTheme();
    const { accentColor, setAccentColor, accentColors } = useThemeColor();
    const { shortcuts, saveShortcuts } = useMobileShortcuts();

    // Lógica de Versão Dinâmica
    const lastUpdateDate = new Date('2026-03-30');
    const dayVersion = String(lastUpdateDate.getUTCDate()).padStart(2, '0');
    const monthVersion = String(lastUpdateDate.getUTCMonth() + 1).padStart(2, '0');
    const yearVersion = String(lastUpdateDate.getUTCFullYear()).slice(-2);
    const appVersion = `${dayVersion}07${monthVersion}08${yearVersion}12`;

    // Estados para o formulário
    const [name, setName] = useState(user?.user_metadata?.full_name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Estados de Notificações
    const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>(
        typeof window !== 'undefined' ? Notification.permission : 'default'
    );
    const [remindersEnabled, setRemindersEnabled] = useState(() =>
        localStorage.getItem('push_reminders') === 'true'
    );
    const [projectUpdatesEnabled, setProjectUpdatesEnabled] = useState(() =>
        localStorage.getItem('push_projects') === 'true'
    );

    const handleUpdatePermission = async () => {
        if (!('Notification' in window)) {
            toast.error('Notificações não são suportadas neste navegador.');
            return;
        }

        try {
            const permission = await Notification.requestPermission();
            setPermissionStatus(permission);
            if (permission === 'granted') {
                toast.success('Notificações ativadas com sucesso!');
            } else if (permission === 'denied') {
                toast.error('Você bloqueou as notificações. Libere nas configurações do seu navegador.');
            }
        } catch (error) {
            console.error('Erro ao pedir permissão:', error);
            toast.error('Erro ao solicitar permissão.');
        }
    };

    const toggleReminder = (checked: boolean) => {
        setRemindersEnabled(checked);
        localStorage.setItem('push_reminders', String(checked));
    };

    const toggleProjects = (checked: boolean) => {
        setProjectUpdatesEnabled(checked);
        localStorage.setItem('push_projects', String(checked));
    };

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
                <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-8 border border-gray-100 dark:border-zinc-800 shadow-sm space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                            <Palette className="w-5 h-5" />
                        </div>
                        <h2 className="text-xl font-bold">Aparência</h2>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { id: 'light', icon: Sun, label: 'Claro' },
                            { id: 'dark', icon: Moon, label: 'Escuro' },
                            { id: 'amoled', icon: Zap, label: 'AMOLED' },
                            { id: 'system', icon: Monitor, label: 'Sistema' },
                        ].map((t) => (
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

                    <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-zinc-800">
                        <Label className="text-xs font-black uppercase tracking-widest text-zinc-500 ml-1">Cor de Destaque</Label>
                        <div className="grid grid-cols-6 gap-3">
                            {accentColors.map((color) => (
                                <button
                                    key={color.id}
                                    onClick={() => setAccentColor(color.id)}
                                    className={cn(
                                        "relative w-full aspect-square rounded-full transition-all duration-300 flex items-center justify-center overflow-hidden border-4",
                                        accentColor === color.id
                                            ? "scale-110 shadow-lg border-white dark:border-zinc-800"
                                            : "hover:scale-105 border-transparent opacity-80 hover:opacity-100"
                                    )}
                                    style={{ backgroundColor: `hsl(${color.hsl})` }}
                                    title={color.name}
                                >
                                    {accentColor === color.id && (
                                        <div className="bg-white/30 backdrop-blur-sm w-full h-full flex items-center justify-center">
                                            <CheckCircle2 className="w-5 h-5 text-white drop-shadow-md" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Card 3: Notificações */}
                <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-8 border border-gray-100 dark:border-zinc-800 shadow-sm space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
                            <Bell className="w-5 h-5" />
                        </div>
                        <h2 className="text-xl font-bold">Notificações</h2>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-gray-50/50 dark:bg-zinc-950/50 rounded-3xl border border-gray-100 dark:border-zinc-800 transition-all hover:border-gray-200 dark:hover:border-zinc-700">
                            <div className="space-y-0.5">
                                <Label className="text-sm font-black">Lembretes de Vencimento</Label>
                                <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Avisa 1 dia antes da conta vencer</p>
                            </div>
                            <Switch
                                checked={remindersEnabled}
                                onCheckedChange={toggleReminder}
                            />
                        </div>

                        <div className="flex items-center justify-between p-4 bg-gray-50/50 dark:bg-zinc-950/50 rounded-3xl border border-gray-100 dark:border-zinc-800 transition-all hover:border-gray-200 dark:hover:border-zinc-700">
                            <div className="space-y-0.5">
                                <Label className="text-sm font-black">Atualizações de Projetos</Label>
                                <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Avisos sobre prazos de sonhos</p>
                            </div>
                            <Switch
                                checked={projectUpdatesEnabled}
                                onCheckedChange={toggleProjects}
                            />
                        </div>
                    </div>

                    {permissionStatus !== 'granted' ? (
                        <div className="pt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                            <Button
                                onClick={handleUpdatePermission}
                                className="w-full h-12 rounded-2xl bg-rose-500 text-white font-black uppercase tracking-widest text-xs shadow-lg shadow-rose-500/20 gap-2"
                            >
                                <Zap className="w-4 h-4 fill-white" />
                                Ativar Notificações no Dispositivo
                            </Button>
                            {!('Notification' in window) && (
                                <p className="text-[11px] text-center mt-3 text-zinc-400 font-bold italic leading-tight">
                                    Notificações não suportadas. No iOS, use "Adicionar à Tela de Início" pelo Safari.
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="pt-4 flex items-center justify-center gap-2 text-emerald-500 bg-emerald-500/5 py-3 rounded-2xl border border-emerald-500/10">
                            <CheckCircle2 className="w-4 h-4" />
                            <span className="text-xs font-black uppercase tracking-widest">Notificações Ativadas</span>
                        </div>
                    )}
                </div>

                {/* Card 4: Sobre */}
                <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-8 border border-gray-100 dark:border-zinc-800 shadow-sm flex flex-col justify-between md:col-span-2">
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                                <Info className="w-5 h-5" />
                            </div>
                            <h2 className="text-xl font-bold">Sobre o Fluxo</h2>
                        </div>

                        <div className="flex flex-col items-center py-4 bg-gray-50/50 dark:bg-zinc-950/50 rounded-3xl border border-gray-100 dark:border-zinc-800">
                            <div className="w-16 h-16 rounded-3xl bg-primary flex items-center justify-center mb-4 shadow-xl shadow-primary/30">
                                <span className="text-white font-black text-3xl">F</span>
                            </div>
                            <h3 className="text-xl font-black text-primary">Fluxo</h3>
                            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Gestão Inteligente</p>
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-gray-100 dark:border-zinc-800 space-y-3">
                        <div className="flex flex-col gap-1">
                            <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest">
                                <span className="text-zinc-400 dark:text-zinc-600">Versão</span>
                                <span className="text-zinc-600 dark:text-zinc-400">{appVersion} | Estável</span>
                            </div>
                            <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest">
                                <span className="text-zinc-400 dark:text-zinc-600">Última Atualização</span>
                                <span className="text-zinc-600 dark:text-zinc-400">{lastUpdateDate.toLocaleDateString('pt-BR')}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ProfileSettings;

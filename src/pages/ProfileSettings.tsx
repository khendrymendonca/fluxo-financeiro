import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/hooks/useTheme';
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
    AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function ProfileSettings() {
    const { user } = useAuth();
    const { theme, setTheme } = useTheme();

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

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const updates: any = {};

            // Atualizar Nome
            if (name !== user?.user_metadata?.full_name) {
                const { error } = await supabase.auth.updateUser({
                    data: { full_name: name }
                });
                if (error) throw error;
            }

            // Atualizar Email
            if (email !== user?.email) {
                const { error } = await supabase.auth.updateUser({ email });
                if (error) throw error;
                toast.info('Confirmação enviada para o novo e-mail.');
            }

            // Atualizar Senha
            if (password) {
                const { error } = await supabase.auth.updateUser({ password });
                if (error) throw error;
                setPassword('');
            }

            toast.success('Perfil atualizado com sucesso!');
        } catch (error: any) {
            toast.error(error.message || 'Erro ao atualizar perfil');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 md:pb-10">
            {/* Header */}
            <div className="flex flex-col gap-1">
                <h1 className="text-3xl font-black tracking-tight">Ajustes e Perfil</h1>
                <p className="text-zinc-500 dark:text-zinc-400 font-medium">Gerencie sua conta e as preferências do seu Fluxo.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold italic ml-1">
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
                                <span className="text-[10px] font-black uppercase tracking-widest">{t.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Card 3: Sobre */}
                <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-8 border border-gray-100 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
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
                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                <span className="text-zinc-400 dark:text-zinc-600">Versão</span>
                                <span className="text-zinc-600 dark:text-zinc-400">{appVersion}</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
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

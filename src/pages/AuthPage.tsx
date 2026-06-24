import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Sun, Moon, Monitor, Laptop } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useTheme } from '@/hooks/useTheme';
import { useIsMobile } from '@/hooks/useIsMobile';
import { cn } from '@/lib/utils';
import { AppLogo } from '@/components/branding/AppLogo';
import { BandeiraBrasil } from '@/components/branding/BandeiraBrasil';
import { useGlobalFlag } from '@/hooks/useFeatureFlags';

// UTF-8 Integrity Check: Áéíóú Ç ñ

// UTF-8 Integrity Check: Áéíóú Ç ñ
export default function AuthPage() {
    const copaEnabled = useGlobalFlag('theme_copa');
    const easterEnabled = useGlobalFlag('theme_easter');
    const christmasEnabled = useGlobalFlag('theme_christmas');
    const halloweenEnabled = useGlobalFlag('theme_halloween');
    const [loading, setLoading] = useState(false);
    const [isSendingRecovery, setIsSendingRecovery] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [nickname, setNickname] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [consentAccepted, setConsentAccepted] = useState(false);
    
    // --- Fluxo Start States ---
    const [isStartMode, setIsStartMode] = useState(false);
    const [startId, setStartId] = useState('');
    const [username, setUsername] = useState('');
    // --------------------------

    const { theme, setTheme } = useTheme();
    const { toast } = useToast();
    const isMobile = useIsMobile();

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (isStartMode) {
                if (isSignUp) {
                    const { data, error } = await supabase.functions.invoke('create-start-user', {
                        body: { username, password, startId }
                    });
                    
                    if (error) throw new Error(data?.error || error.message || 'Erro ao criar conta Start');
                    
                    // Fazer login automaticamente com o email falso retornado pela Edge Function
                    const { error: signInError } = await supabase.auth.signInWithPassword({
                        email: data.email,
                        password,
                    });
                    if (signInError) throw signInError;
                } else {
                    // Login Start: constrói o email falso apenas com o username
                    const safeUsername = username.toLowerCase().replace(/[^a-z0-9_]/g, '');
                    const fakeEmail = `start_${safeUsername}@fluxo.start`;
                    const { error } = await supabase.auth.signInWithPassword({
                        email: fakeEmail,
                        password,
                    });
                    if (error) throw new Error("Usuário ou senha incorretos.");
                }
                return;
            }

            if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: `${window.location.origin}/auth/confirmado`,
                        data: {
                            full_name: nickname
                        }
                    }
                });
                if (error) throw error;
                toast({
                    title: "Verifique seu email",
                    description: "Enviamos um link de confirmação para você.",
                });
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
            }
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Erro",
                description: error.message,
            });
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!email.trim()) {
            toast({
                variant: "destructive",
                title: "Email obrigatório",
                description: "Informe seu email para receber o link de recuperação.",
            });
            return;
        }

        setIsSendingRecovery(true);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
                redirectTo: `${window.location.origin}/auth/redefinir-senha`,
            });
            if (error) throw error;

            toast({
                title: "Link enviado",
                description: "Enviamos um link de recuperação para o seu email.",
            });
        } catch {
            toast({
                variant: "destructive",
                title: "Não foi possível enviar o link",
                description: "Tente novamente em instantes.",
            });
        } finally {
            setIsSendingRecovery(false);
        }
    };

    return (
        <div className={cn("min-h-screen flex flex-col items-center justify-center p-4 animate-fade-in relative transition-colors duration-500", 
            isStartMode ? "bg-black text-white" : "bg-background",
            copaEnabled ? "theme-copa" : 
            christmasEnabled ? "theme-christmas" : 
            halloweenEnabled ? "theme-halloween" : 
            easterEnabled ? "theme-easter" : "")}>
            
            <div className="absolute top-6 left-6 z-10">
                <button
                    type="button"
                    onClick={() => {
                        setIsStartMode(!isStartMode);
                        setIsSignUp(false);
                    }}
                    className={cn(
                        "px-4 py-2 rounded-full font-black text-xs md:text-sm uppercase tracking-widest transition-all",
                        isStartMode 
                            ? "bg-[#00FF5F] text-black hover:bg-[#00CC4C] shadow-[0_0_15px_rgba(0,255,95,0.4)]" 
                            : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
                    )}
                >
                    {isStartMode ? 'Voltar ao Fluxo' : 'Fluxo Start'}
                </button>
            </div>

            <div className={cn(
                "w-full max-w-sm p-8 rounded-3xl shadow-xl transition-all duration-500 relative overflow-hidden",
                isStartMode 
                    ? "bg-zinc-950 border border-zinc-800 shadow-[0_0_50px_rgba(0,255,95,0.05)]" 
                    : "bg-card border border-border"
            )}>
                {isStartMode && (
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#00FF5F] to-transparent opacity-50" />
                )}
                <div className="text-center mb-8">
                    {copaEnabled || christmasEnabled || halloweenEnabled || easterEnabled ? (
                        <div className="flex flex-col items-center justify-center mb-6">
                            <div className={cn("w-fit mx-auto text-primary", copaEnabled ? "-mb-6" : "mb-4")}>
                                <AppLogo isLoginScreen={true} className={copaEnabled ? "h-28 w-72" : "h-14 w-40"} />
                            </div>
                            <h1 className="text-2xl font-bold mt-1 text-foreground">Fluxo</h1>
                            <p className="text-muted-foreground text-sm mt-2 max-w-xs mx-auto">
                                {isSignUp ? 'Comece a controlar suas finanças hoje' : 
                                 copaEnabled ? (
                                    <span>
                                        Com o Fluxo, você economiza o dinheiro e guarda o fôlego para gritar é{' '}
                                        <span className="inline-block font-black select-none">
                                            <span className="text-[#009b3a]">G</span>
                                            <span className="text-[#009b3a]">O</span>
                                            <span className="text-[#d9a700] dark:text-[#fedf00]">O</span>
                                            <span className="text-[#d9a700] dark:text-[#fedf00]">O</span>
                                            <span className="text-[#d9a700] dark:text-[#fedf00]">O</span>
                                            <span className="text-[#002776] dark:text-[#3b82f6]">O</span>
                                            <span className="text-[#002776] dark:text-[#3b82f6]">L</span>
                                            <span className="text-[#002776] dark:text-[#3b82f6]">!</span>
                                        </span>
                                    </span>
                                 ) :
                                 christmasEnabled ? 'A parte fácil de organizar a sua vida financeira e celebrar um Natal próspero e iluminado!' :
                                 halloweenEnabled ? 'Sem sustos no fim do mês! A parte fácil de organizar a sua vida financeira.' :
                                 easterEnabled ? 'A parte fácil de organizar a sua vida financeira e garantir uma Páscoa recheada de prosperidade!' : ''}
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className={cn("w-fit mx-auto mb-4", isStartMode ? "text-[#00FF5F]" : "text-primary")}>
                                <AppLogo isLoginScreen={true} className="h-14 w-40" />
                            </div>
                            {isStartMode ? (
                                <>
                                    <h1 className="text-2xl font-black tracking-tight text-white uppercase">Start</h1>
                                    <p className="text-zinc-500 text-xs font-bold tracking-widest uppercase mt-2">
                                        {isSignUp ? 'Vincular Conta' : 'Acesse seu controle'}
                                    </p>
                                </>
                            ) : (
                                <>
                                    <h1 className="text-2xl font-bold">{isSignUp ? 'Criar Conta' : 'Fluxo'}</h1>
                                    <p className="text-muted-foreground text-sm mt-2">
                                        {isSignUp ? 'Comece a controlar suas finanças hoje' : 'A parte fácil de organizar a sua vida financeira.'}
                                    </p>
                                </>
                            )}
                        </>
                    )}
                </div>

                <form onSubmit={handleAuth} className="space-y-4">
                    {isStartMode && isSignUp && (
                        <div className="space-y-2">
                            <Label htmlFor="startId" className="text-zinc-400">Start ID</Label>
                            <Input
                                id="startId"
                                type="text"
                                placeholder="Código fornecido pelos seus pais"
                                value={startId}
                                onChange={(e) => setStartId(e.target.value)}
                                required
                                className="rounded-xl bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-700 focus-visible:ring-[#00FF5F]"
                            />
                        </div>
                    )}
                    
                    {!isStartMode ? (
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="seu@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="rounded-xl"
                            />
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <Label htmlFor="username" className="text-zinc-400">Usuário</Label>
                            <Input
                                id="username"
                                type="text"
                                placeholder="Seu nome de usuário"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                className="rounded-xl bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-700 focus-visible:ring-[#00FF5F]"
                            />
                        </div>
                    )}

                    {!isStartMode && isSignUp && (
                        <div className="space-y-2">
                            <Label htmlFor="nickname">Apelido</Label>
                            <Input
                                id="nickname"
                                type="text"
                                placeholder="Como quer ser chamado?"
                                value={nickname}
                                onChange={(e) => setNickname(e.target.value)}
                                required
                                className="rounded-xl"
                            />
                        </div>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="password" className={isStartMode ? "text-zinc-400" : ""}>Senha</Label>
                        <div className="relative">
                            <Input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                                className={cn("rounded-xl pr-10", isStartMode ? "bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-700 focus-visible:ring-[#00FF5F]" : "")}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className={cn("absolute right-3 top-1/2 -translate-y-1/2 transition-colors", isStartMode ? "text-zinc-600 hover:text-[#00FF5F]" : "text-muted-foreground hover:text-foreground")}
                                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                                tabIndex={-1}
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                    {!isSignUp && (
                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={handleForgotPassword}
                                className={cn("text-xs hover:underline", isStartMode ? "text-[#00FF5F]" : "text-primary")}
                                disabled={loading || isSendingRecovery}
                            >
                                {isStartMode ? 'Esqueci minha senha' : (isSendingRecovery ? 'Enviando...' : 'Esqueci minha senha')}
                            </button>
                        </div>
                    )}

                    {/* Renderizar APENAS no modo cadastro para contas normais */}
                    {!isStartMode && isSignUp && (
                        <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/30 border border-border/50 animate-in fade-in slide-in-from-top-2 duration-300">
                            <input
                                type="checkbox"
                                id="lgpd-consent"
                                checked={consentAccepted}
                                onChange={(e) => setConsentAccepted(e.target.checked)}
                                className="mt-0.5 w-4 h-4 rounded accent-primary cursor-pointer shrink-0"
                            />
                            <label
                                htmlFor="lgpd-consent"
                                className="text-xs text-muted-foreground leading-relaxed cursor-pointer"
                            >
                                Concordo com o tratamento dos meus dados financeiros para
                                fins de gestão financeira pessoal, conforme a{' '}
                                <strong className="text-foreground">
                                    LGPD (Lei 13.709/2018)
                                </strong>
                                . Você pode solicitar a exclusão dos seus dados a qualquer
                                momento em Configurações → Zona de Perigo.
                            </label>
                        </div>
                    )}

                    <Button 
                        type="submit" 
                        className={cn("w-full rounded-xl py-6 font-semibold transition-all duration-300", 
                            isStartMode 
                                ? "bg-[#00FF5F] text-black hover:bg-[#00CC4C] hover:shadow-[0_0_20px_rgba(0,255,95,0.3)]" 
                                : "")} 
                        disabled={loading || isSendingRecovery || (!isStartMode && isSignUp && !consentAccepted)}
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (isSignUp ? 'Criar Conta' : 'Entrar')}
                    </Button>
                </form>

                <div className="mt-6 text-center text-sm">
                    <button
                        type="button"
                        onClick={() => {
                            setIsSignUp(!isSignUp);
                            setConsentAccepted(false);
                        }}
                        className={cn("hover:underline transition-colors", isStartMode ? "text-[#00FF5F]" : "text-primary")}
                    >
                        {isStartMode
                            ? (isSignUp ? 'Já tem sua conta? Entrar' : 'Recebeu um Start ID? Criar conta')
                            : (isSignUp ? 'Já tem uma conta? Entrar' : 'Não tem conta? Criar agora')}
                    </button>
                </div>

                <div className="mt-8 pt-6 border-t border-border/50">
                    <p className="text-xs uppercase font-black tracking-widest text-muted-foreground text-center mb-4">Aparência do Sistema</p>
                    <div className="flex items-center justify-center gap-2">
                        {[
                            { id: 'light', icon: Sun, label: 'Claro' },
                            { id: 'dark', icon: Moon, label: 'Escuro' },
                            { id: 'amoled', icon: Laptop, label: 'OLED' },
                            { id: 'system', icon: Monitor, label: 'Sistema' }
                        ].filter((t) => isMobile || t.id !== 'amoled').map((t) => (
                            <button
                                key={t.id}
                                onClick={() => setTheme(t.id as any)}
                                className={cn(
                                    "flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all border-2",
                                    theme === t.id
                                        ? "bg-primary/10 border-primary text-primary"
                                        : "bg-transparent border-transparent text-muted-foreground hover:bg-muted/50"
                                )}
                                title={t.label}
                            >
                                <t.icon className="w-5 h-5" />
                                <span className="text-[11px] font-black uppercase tracking-tighter">{t.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

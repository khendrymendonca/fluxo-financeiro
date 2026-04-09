import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Sun, Moon, Monitor, Laptop } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

// UTF-8 Integrity Check: Áéíóú Ç ñ
export default function AuthPage() {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [nickname, setNickname] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [consentAccepted, setConsentAccepted] = useState(false);
    const { theme, setTheme } = useTheme();
    const { toast } = useToast();

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
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

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4 animate-fade-in">
            <div className="w-full max-w-sm bg-card p-8 rounded-3xl shadow-xl border border-border">
                <div className="text-center mb-8">
                    <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mx-auto mb-4">
                        <span className="text-primary-foreground font-bold text-xl">F</span>
                    </div>
                    <h1 className="text-2xl font-bold">{isSignUp ? 'Criar Conta' : 'Bem-vindo de volta'}</h1>
                    <p className="text-muted-foreground text-sm mt-2">
                        {isSignUp ? 'Comece a controlar suas finanças hoje' : 'Entre para acessar seu dashboard'}
                    </p>
                </div>

                <form onSubmit={handleAuth} className="space-y-4">
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
                    {isSignUp && (
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
                        <Label htmlFor="password">Senha</Label>
                        <Input
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                            className="rounded-xl"
                        />
                    </div>

                    {/* Renderizar APENAS no modo cadastro */}
                    {isSignUp && (
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
                        className="w-full rounded-xl py-6 font-semibold" 
                        disabled={loading || (isSignUp && !consentAccepted)}
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
                        className="text-primary hover:underline"
                    >
                        {isSignUp ? 'Já tem uma conta? Entrar' : 'Não tem conta? Criar agora'}
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
                        ].map((t) => (
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

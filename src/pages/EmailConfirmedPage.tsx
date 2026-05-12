import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

export default function EmailConfirmedPage() {
    const navigate = useNavigate();
    const [isRedirecting, setIsRedirecting] = useState(false);

    const handleBackToLogin = async () => {
        setIsRedirecting(true);

        try {
            await supabase.auth.signOut();
        } finally {
            navigate('/', { replace: true });
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4 animate-fade-in">
            <div className="w-full max-w-md bg-card p-8 rounded-3xl shadow-xl border border-border text-center space-y-5">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                </div>

                <div className="space-y-2">
                    <h1 className="text-2xl font-bold">Email confirmado com sucesso!</h1>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        Deu tudo certo. Agora e so seguir o Fluxo e controlar suas contas com mais clareza.
                    </p>
                </div>

                <Button
                    type="button"
                    className="w-full rounded-xl py-6 font-semibold"
                    onClick={handleBackToLogin}
                    disabled={isRedirecting}
                >
                    {isRedirecting ? (
                        <span className="inline-flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Redirecionando...
                        </span>
                    ) : (
                        'Voltar para a tela de login'
                    )}
                </Button>
            </div>
        </div>
    );
}

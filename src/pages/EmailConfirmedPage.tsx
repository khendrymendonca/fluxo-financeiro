import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthActionCard } from '@/components/auth/AuthActionCard';
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
        <AuthActionCard
            icon={<CheckCircle2 className="w-8 h-8" />}
            title="Email confirmado com sucesso"
            description="Deu tudo certo. Agora e so seguir o Fluxo e controlar suas contas com mais clareza."
            actions={(
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
                        'Voltar para o login'
                    )}
                </Button>
            )}
        />
    );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthActionCard } from '@/components/auth/AuthActionCard';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export default function EmailChangedPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [isSigningOut, setIsSigningOut] = useState(false);

    const handleBackToLogin = async () => {
        setIsSigningOut(true);
        try {
            await supabase.auth.signOut();
        } finally {
            navigate('/', { replace: true });
        }
    };

    return (
        <AuthActionCard
            icon={<MailCheck className="w-8 h-8" />}
            title="Email alterado com sucesso"
            description="Seu novo email foi confirmado e ja esta vinculado a sua conta."
            actions={(
                <>
                    {user ? (
                        <Button
                            type="button"
                            className="w-full rounded-xl py-6 font-semibold"
                            onClick={() => navigate('/?view=profile', { replace: true })}
                            disabled={isSigningOut}
                        >
                            Ir para o perfil
                        </Button>
                    ) : null}

                    <Button
                        type="button"
                        variant={user ? 'outline' : 'default'}
                        className="w-full rounded-xl py-6 font-semibold"
                        onClick={handleBackToLogin}
                        disabled={isSigningOut}
                    >
                        {isSigningOut ? (
                            <span className="inline-flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Redirecionando...
                            </span>
                        ) : (
                            'Voltar para o login'
                        )}
                    </Button>
                </>
            )}
        />
    );
}

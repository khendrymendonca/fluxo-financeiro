import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthActionCard } from '@/components/auth/AuthActionCard';
import { supabase } from '@/lib/supabase';

export default function MagicLinkAccessPage() {
    const navigate = useNavigate();
    const redirectTimeoutRef = useRef<number | null>(null);
    const [isCheckingSession, setIsCheckingSession] = useState(true);
    const [isAutoRedirecting, setIsAutoRedirecting] = useState(false);

    useEffect(() => {
        const scheduleRedirect = () => {
            if (redirectTimeoutRef.current) {
                window.clearTimeout(redirectTimeoutRef.current);
            }

            setIsAutoRedirecting(true);
            redirectTimeoutRef.current = window.setTimeout(() => {
                navigate('/', { replace: true });
            }, 1200);
        };

        const checkSession = async () => {
            const { data } = await supabase.auth.getSession();
            if (data.session) {
                scheduleRedirect();
            }
            setIsCheckingSession(false);
        };

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session) {
                scheduleRedirect();
            }
        });

        checkSession();

        return () => {
            subscription.unsubscribe();
            if (redirectTimeoutRef.current) {
                window.clearTimeout(redirectTimeoutRef.current);
            }
        };
    }, [navigate]);

    return (
        <AuthActionCard
            icon={isAutoRedirecting ? <CheckCircle2 className="w-8 h-8" /> : <Sparkles className="w-8 h-8" />}
            title="Acesso confirmado"
            description="Seu acesso foi validado com sucesso."
            actions={(
                <Button
                    type="button"
                    className="w-full rounded-xl py-6 font-semibold"
                    onClick={() => navigate('/', { replace: true })}
                    disabled={isCheckingSession}
                >
                    {isCheckingSession ? (
                        <span className="inline-flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Validando acesso...
                        </span>
                    ) : isAutoRedirecting ? (
                        'Entrando no app...'
                    ) : (
                        'Entrar no app'
                    )}
                </Button>
            )}
        />
    );
}

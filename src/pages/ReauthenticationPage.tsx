import { useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthActionCard } from '@/components/auth/AuthActionCard';
import { useAuth } from '@/contexts/AuthContext';

export default function ReauthenticationPage() {
    const navigate = useNavigate();
    const { user } = useAuth();

    const handleContinue = () => {
        if (user) {
            navigate('/?view=profile', { replace: true });
            return;
        }

        navigate('/', { replace: true });
    };

    return (
        <AuthActionCard
            icon={<ShieldCheck className="w-8 h-8" />}
            title="Identidade confirmada"
            description="Sua verificacao foi concluida. Agora voce pode continuar com seguranca."
            actions={(
                <Button
                    type="button"
                    className="w-full rounded-xl py-6 font-semibold"
                    onClick={handleContinue}
                >
                    Continuar
                </Button>
            )}
        />
    );
}

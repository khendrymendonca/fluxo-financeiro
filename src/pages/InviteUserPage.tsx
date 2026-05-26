import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthActionCard } from '@/components/auth/AuthActionCard';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';

export default function InviteUserPage() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [fullName, setFullName] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const validate = () => {
        if (!password) {
            return 'A senha é obrigatória.';
        }

        if (!confirmPassword) {
            return 'A confirmação da senha é obrigatória.';
        }

        if (password.length < 6) {
            return 'A senha deve ter pelo menos 6 caracteres.';
        }

        if (password !== confirmPassword) {
            return 'Senha e confirmação precisam ser iguais.';
        }

        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const validationError = validate();
        if (validationError) {
            toast({
                variant: 'destructive',
                title: 'Revise os campos',
                description: validationError,
            });
            return;
        }

        setIsSubmitting(true);

        try {
            const trimmedName = fullName.trim();
            const { error } = await supabase.auth.updateUser({
                password,
                data: trimmedName ? { full_name: trimmedName } : undefined,
            });
            if (error) throw error;

            toast({
                title: 'Convite aceito',
                description: 'Seu acesso foi finalizado com sucesso.',
            });
            navigate('/', { replace: true });
        } catch {
            toast({
                variant: 'destructive',
                title: 'Não foi possível concluir o convite',
                description: 'Este link pode estar expirado. Solicite um novo convite.',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AuthActionCard
            icon={<UserPlus className="w-8 h-8" />}
            title="Você foi convidado para entrar no Fluxo"
            description="Finalize seu acesso para começar a organizar suas contas com segurança."
            contentClassName="text-left"
            actions={(
                <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => navigate('/', { replace: true })}
                    disabled={isSubmitting}
                >
                    Voltar para o login
                </Button>
            )}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="invite-full-name">Nome</Label>
                    <Input
                        id="invite-full-name"
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Como você quer ser chamado"
                        className="rounded-xl"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="invite-password">Senha</Label>
                    <Input
                        id="invite-password"
                        type="password"
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="********"
                        required
                        className="rounded-xl"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="invite-confirm-password">Confirmar senha</Label>
                    <Input
                        id="invite-confirm-password"
                        type="password"
                        minLength={6}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="********"
                        required
                        className="rounded-xl"
                    />
                </div>

                <Button
                    type="submit"
                    className="w-full rounded-xl py-6 font-semibold"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? (
                        <span className="inline-flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Processando...
                        </span>
                    ) : (
                        'Aceitar convite e entrar'
                    )}
                </Button>
            </form>
        </AuthActionCard>
    );
}

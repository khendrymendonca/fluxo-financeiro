import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthActionCard } from '@/components/auth/AuthActionCard';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';

export default function EmailResetPasswordPage() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const validate = () => {
        if (!newPassword) {
            return 'A nova senha e obrigatoria.';
        }

        if (!confirmPassword) {
            return 'A confirmacao da senha e obrigatoria.';
        }

        if (newPassword.length < 6) {
            return 'A senha deve ter pelo menos 6 caracteres.';
        }

        if (newPassword !== confirmPassword) {
            return 'Senha e confirmacao precisam ser iguais.';
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
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;

            toast({
                title: 'Senha redefinida com sucesso',
                description: 'Sua senha foi atualizada. Faca login novamente para continuar.',
            });

            await supabase.auth.signOut();
            navigate('/', { replace: true });
        } catch {
            toast({
                variant: 'destructive',
                title: 'Nao foi possivel redefinir sua senha',
                description: 'Solicite um novo link de recuperacao e tente novamente.',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AuthActionCard
            icon={<LockKeyhole className="w-8 h-8" />}
            title="Redefinir senha"
            description="Digite sua nova senha para continuar usando o Fluxo com seguranca."
            contentClassName="text-left"
            actions={(
                <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => navigate('/', { replace: true })}
                    disabled={isSubmitting}
                >
                    Ir para o login
                </Button>
            )}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="new-password">Nova senha</Label>
                    <Input
                        id="new-password"
                        type="password"
                        minLength={6}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="********"
                        required
                        className="rounded-xl"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirmar nova senha</Label>
                    <Input
                        id="confirm-password"
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
                            Salvando...
                        </span>
                    ) : (
                        'Salvar nova senha'
                    )}
                </Button>
            </form>
        </AuthActionCard>
    );
}

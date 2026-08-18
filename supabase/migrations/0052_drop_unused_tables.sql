-- Limpeza: tabelas sem nenhuma referência no código-fonte atual.
-- user_habits/habit_logs: 0 linhas, recurso que nunca chegou a ter tela.
-- backup_*_before_0034: backup da correção de saldo da migração 0034,
-- já validada em produção há tempo -- usuário confirmou remoção.

DROP TABLE IF EXISTS public.habit_logs;
DROP TABLE IF EXISTS public.user_habits;
DROP TABLE IF EXISTS public.backup_accounts_before_0034;
DROP TABLE IF EXISTS public.backup_transactions_before_0034;

NOTIFY pgrst, 'reload schema';

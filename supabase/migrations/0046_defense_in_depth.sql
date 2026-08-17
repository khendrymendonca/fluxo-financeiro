-- Reforço de "menor privilégio possível" — nenhuma dessas funções
-- precisa ser chamável por quem não está logado.

-- can_parent_view / is_child_of: já eram seguras (retornam false pra
-- anon, pois auth.uid() é NULL), mas não há motivo pra deixar
-- executáveis por quem não tem sessão.
REVOKE EXECUTE ON FUNCTION public.can_parent_view(uuid, timestamptz) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_child_of(uuid) FROM anon;

-- handle_new_user só deve rodar como trigger em auth.users (isso não
-- depende de grant de EXECUTE); bloquear chamada direta via RPC.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;

-- Tabelas de backup vazias (migração 0034), sem uso e sem policy —
-- reduzem a superfície de ataque só existindo. Confirmar 0 linhas
-- antes de derrubar.
DO $$
BEGIN
  IF (SELECT count(*) FROM public.backup_accounts_before_0034) = 0
     AND (SELECT count(*) FROM public.backup_transactions_before_0034) = 0 THEN
    DROP TABLE public.backup_accounts_before_0034;
    DROP TABLE public.backup_transactions_before_0034;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';

-- A revogação anterior (0046) tirou o EXECUTE direto de "anon", mas o
-- grant para o pseudo-role PUBLIC continuava valendo — e "anon" herda
-- tudo que é concedido a PUBLIC. Por isso o advisor continuava
-- acusando essas funções como executáveis por anon. Corrigindo:
-- revoga de PUBLIC e recria só o grant que faz sentido.

REVOKE EXECUTE ON FUNCTION public.can_parent_view(uuid, timestamptz) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_child_of(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.can_parent_view(uuid, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_child_of(uuid) TO authenticated;
-- handle_new_user roda só via trigger em auth.users; ninguém precisa
-- chamá-la diretamente por RPC (nem anon, nem authenticated).

NOTIFY pgrst, 'reload schema';

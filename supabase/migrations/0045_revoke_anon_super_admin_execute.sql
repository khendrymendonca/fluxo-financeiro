-- O anon tinha grant DIRETO de EXECUTE (fora do PUBLIC) nessas RPCs,
-- por isso REVOKE ALL ... FROM PUBLIC (migração 0044) não bastou.
-- Como defesa em profundidade, revogamos explicitamente do "anon"
-- (a checagem auth.uid() IS NULL já bloqueava a exploração, mas
-- aqui fechamos a permissão na camada de grants também).
REVOKE EXECUTE ON FUNCTION public.super_admin_create_user(TEXT, TEXT, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.super_admin_delete_user(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.super_admin_update_user(UUID, TEXT, TEXT, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.super_admin_list_users() FROM anon;

NOTIFY pgrst, 'reload schema';

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('delete_user_data RPC', () => {
  it('mantem o hook chamando a RPC com a assinatura esperada', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/hooks/useAccountMutations.ts'), 'utf8');

    expect(source).toContain("supabase.rpc('delete_user_data', {");
    expect(source).toContain('target_user_id: userId');
  });

  it('define a migration incremental com assinatura e guardas corretas', () => {
    const migration = readFileSync(
      resolve(process.cwd(), 'supabase/migrations/0035_fix_delete_user_data_rpc.sql'),
      'utf8'
    );

    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.delete_user_data(target_user_id UUID)');
    expect(migration).toContain('SECURITY DEFINER');
    expect(migration).toContain('SET search_path = public, pg_catalog');
    expect(migration).toContain('IF auth.uid() IS NULL OR auth.uid() <> target_user_id THEN');
    expect(migration).toContain("RAISE EXCEPTION 'not allowed';");
    expect(migration).toContain('DELETE FROM public.transactions');
    expect(migration).toContain("IF to_regclass('public.bills') IS NOT NULL THEN");
    expect(migration).toContain('DELETE FROM public.bills');
    expect(migration).toContain('DELETE FROM public.savings_goals');
    expect(migration).toContain('DELETE FROM public.user_feature_overrides');
    expect(migration).toContain('DELETE FROM public.profiles');
    expect(migration).toContain('DELETE FROM auth.users');
    expect(migration).toContain('GRANT EXECUTE ON FUNCTION public.delete_user_data(UUID) TO authenticated;');
    expect(migration).toContain("NOTIFY pgrst, 'reload schema';");
  });
});

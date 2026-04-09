import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, logSafeError } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { FEATURES } from '@/config/features';

const SUPER_USER_ID = import.meta.env.VITE_SUPER_USER_ID as string;

// ── Super Admin ─────────────────────────────────────────────
export function useIsSuperAdmin(): boolean {
  const { user } = useAuth();
  return !!user && !!SUPER_USER_ID && user.id === SUPER_USER_ID;
}

// ── Overrides do usuário atual ──────────────────────────────
function useMyOverrides() {
  const { user } = useAuth();
  const isSuperAdmin = useIsSuperAdmin();

  return useQuery({
    queryKey: ['my_feature_overrides', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_feature_overrides')
        .select('feature_key, enabled')
        .eq('user_id', user!.id);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user && !isSuperAdmin,
    staleTime: 1000 * 60 * 5,
  });
}

// ── Hook principal: verificar se uma feature está ativa ─────
export function useFeatureFlag(featureKey: string): boolean {
  const isSuperAdmin = useIsSuperAdmin();
  const { data: overrides = [] } = useMyOverrides();

  // Super admin: acesso total, sem consulta ao banco
  if (isSuperAdmin) return true;

  const feature = FEATURES.find((f) => f.key === featureKey);
  if (!feature) return false;

  const override = overrides.find((o) => o.feature_key === featureKey);
  if (override) return override.enabled;

  return feature.enabledByDefault;
}

// ── Perfil do usuário atual (código FLX-XXXX) ───────────────
export function useUserProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my_profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_code')
        .eq('id', user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 60,
  });
}

// ── SUPER ADMIN: buscar usuário por código ──────────────────
export function useSearchUserByCode(code: string) {
  const isSuperAdmin = useIsSuperAdmin();
  return useQuery({
    queryKey: ['super_search', code],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_code')
        .ilike('user_code', `%${code}%`)
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
    enabled: isSuperAdmin && code.trim().length >= 3,
    staleTime: 0,
  });
}

// ── SUPER ADMIN: overrides de um usuário específico ─────────
export function useUserOverrides(userId: string | null) {
  const isSuperAdmin = useIsSuperAdmin();
  return useQuery({
    queryKey: ['super_user_overrides', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_feature_overrides')
        .select('feature_key, enabled')
        .eq('user_id', userId!);
      if (error) throw error;
      return data ?? [];
    },
    enabled: isSuperAdmin && !!userId,
    staleTime: 0,
  });
}

// ── SUPER ADMIN: toglar feature de um usuário ───────────────
export function useToggleUserFeature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      featureKey,
      enabled,
    }: {
      userId: string;
      featureKey: string;
      enabled: boolean;
    }) => {
      const { error } = await supabase
        .from('user_feature_overrides')
        .upsert(
          {
            user_id: userId,
            feature_key: featureKey,
            enabled,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,feature_key' }
        );
      if (error) throw error;
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({
        queryKey: ['super_user_overrides', userId],
      });
    },
    onError: (err) => {
      logSafeError('useToggleUserFeature', err);
    },
  });
}

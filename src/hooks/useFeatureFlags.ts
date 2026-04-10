import { useState } from 'react';
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

// ── Plano do usuário atual ───────────────────────────────────
function useMyPlanFeatures() {
  const { user } = useAuth();
  const isSuperAdmin = useIsSuperAdmin();

  return useQuery({
    queryKey: ['my_plan_features', user?.id],
    queryFn: async () => {
      // Buscar plan_id do perfil
      const { data: profile } = await supabase
        .from('profiles')
        .select('plan_id')
        .eq('id', user!.id)
        .single();

      if (!profile?.plan_id) return [];

      // Buscar features do plano
      const { data, error } = await supabase
        .from('plan_features')
        .select('feature_key, enabled')
        .eq('plan_id', profile.plan_id);

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user && !isSuperAdmin,
    staleTime: 1000 * 60 * 5,
  });
}

// ── Flags globais (temas especiais) ─────────────────────────
export function useGlobalFlags() {
  return useQuery({
    queryKey: ['global_feature_flags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('global_feature_flags')
        .select('key, enabled, label');
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 1000 * 60 * 5,
  });
}

// ── Verificar flag global específica ────────────────────────
export function useGlobalFlag(key: string): boolean {
  const { data: flags = [] } = useGlobalFlags();
  return flags.find((f) => f.key === key)?.enabled ?? false;
}

// ── Hook principal: verificar se uma feature está ativa ─────
// Prioridade:
// 1. user_feature_overrides (override individual)
// 2. plan_features (plano do usuário)
// 3. feature.enabledByDefault (padrão do código)
export function useFeatureFlag(featureKey: string): boolean {
  const isSuperAdmin = useIsSuperAdmin();
  const { data: overrides = [] } = useMyOverrides();
  const { data: planFeatures = [] } = useMyPlanFeatures();

  // Super admin: acesso total, sem consulta ao banco
  if (isSuperAdmin) return true;
  if (!featureKey) return true;

  const feature = FEATURES.find((f) => f.key === featureKey);
  if (!feature) return false;

  // 1. Override individual
  const override = overrides.find((o) => o.feature_key === featureKey);
  if (override !== undefined) return override.enabled;

  // 2. Plano do usuário
  const planFeature = planFeatures.find(
    (p) => p.feature_key === featureKey
  );
  if (planFeature !== undefined) return planFeature.enabled;

  // 3. Default
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

// ── SUPER ADMIN: listar todos os planos ─────────────────────
export function usePlans() {
  return useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plans')
        .select('id, name, description, created_at')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 0,
  });
}

// ── SUPER ADMIN: features de um plano específico ─────────────
export function usePlanFeatures(planId: string | null) {
  return useQuery({
    queryKey: ['plan_features', planId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plan_features')
        .select('feature_key, enabled')
        .eq('plan_id', planId!);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!planId,
    staleTime: 0,
  });
}

// ── SUPER ADMIN: criar plano ─────────────────────────────────
export function useCreatePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const { data: plan, error } = await supabase
        .from('plans')
        .insert({ name: data.name.trim(), description: data.description?.trim() })
        .select()
        .single();
      if (error) throw error;
      return plan;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['plans'] }),
    onError: (err) => logSafeError('useCreatePlan', err),
  });
}

// ── SUPER ADMIN: atualizar plano ─────────────────────────────
export function useUpdatePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      id: string;
      name: string;
      description?: string;
    }) => {
      const { error } = await supabase
        .from('plans')
        .update({
          name: data.name.trim(),
          description: data.description?.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', data.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['plans'] }),
    onError: (err) => logSafeError('useUpdatePlan', err),
  });
}

// ── SUPER ADMIN: deletar plano ───────────────────────────────
export function useDeletePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (planId: string) => {
      const { error } = await supabase
        .from('plans')
        .delete()
        .eq('id', planId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['plans'] }),
    onError: (err) => logSafeError('useDeletePlan', err),
  });
}

// ── SUPER ADMIN: toggle feature de um plano ─────────────────
export function useTogglePlanFeature() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      planId: string;
      featureKey: string;
      enabled: boolean;
    }) => {
      const { error } = await supabase
        .from('plan_features')
        .upsert(
          {
            plan_id: data.planId,
            feature_key: data.featureKey,
            enabled: data.enabled,
          },
          { onConflict: 'plan_id,feature_key' }
        );
      if (error) throw error;
    },
    onSuccess: (_, { planId }) => {
      queryClient.invalidateQueries({ queryKey: ['plan_features', planId] });
    },
    onError: (err) => logSafeError('useTogglePlanFeature', err),
  });
}

// ── SUPER ADMIN: atribuir plano a usuário ────────────────────
export function useAssignPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      userId: string;
      planId: string | null;
    }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ plan_id: data.planId })
        .eq('id', data.userId);
      if (error) throw error;
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({
        queryKey: ['super_user_profile', userId],
      });
    },
    onError: (err) => logSafeError('useAssignPlan', err),
  });
}

// ── SUPER ADMIN: buscar perfil completo de um usuário ────────
export function useSuperUserProfile(userId: string | null) {
  return useQuery({
    queryKey: ['super_user_profile', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_code, plan_id')
        .eq('id', userId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    staleTime: 0,
  });
}

// ── SUPER ADMIN: toggle flag global ─────────────────────────
export function useToggleGlobalFlag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { key: string; enabled: boolean }) => {
      const { error } = await supabase
        .from('global_feature_flags')
        .update({
          enabled: data.enabled,
          updated_at: new Date().toISOString(),
        })
        .eq('key', data.key);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global_feature_flags'] });
    },
    onError: (err) => logSafeError('useToggleGlobalFlag', err),
  });
}

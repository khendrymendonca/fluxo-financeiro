import type { User } from '@supabase/supabase-js';

function normalizeName(user: User | null | undefined) {
  const metadataName = user?.user_metadata?.full_name || user?.user_metadata?.name;
  if (typeof metadataName === 'string' && metadataName.trim()) {
    return metadataName.trim();
  }

  if (user?.email) {
    return user.email.split('@')[0];
  }

  return 'Usuário';
}

export function getUserDisplayName(user: User | null | undefined) {
  return normalizeName(user);
}

export function getUserFirstName(user: User | null | undefined) {
  const displayName = normalizeName(user);
  return displayName.split(/\s+/).filter(Boolean)[0] || 'Usuário';
}

export function getUserInitial(user: User | null | undefined) {
  return normalizeName(user).slice(0, 1).toUpperCase() || 'U';
}

export function getUserInitials(user: User | null | undefined) {
  const displayName = normalizeName(user);
  const parts = displayName.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  return displayName.slice(0, 1).toUpperCase() || 'U';
}

export function getGreetingForHour(hour: number) {
  if (hour >= 5 && hour < 12) return 'Bom dia';
  if (hour >= 12 && hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

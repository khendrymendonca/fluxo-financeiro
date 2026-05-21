import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider, useTheme } from '@/hooks/useTheme';
import { ThemeColorProvider, useThemeColor } from '@/hooks/useThemeColor';

const authState = vi.hoisted(() => ({
  user: null as any,
}));

const featureFlagState = vi.hoisted(() => ({
  easterEnabled: true,
}));

const updateUserMock = vi.hoisted(() => vi.fn(async () => ({ data: {}, error: null })));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => authState,
}));

vi.mock('@/hooks/useFeatureFlags', () => ({
  useGlobalFlag: () => featureFlagState.easterEnabled,
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      updateUser: updateUserMock,
    },
  },
}));

function createThemeWrapper() {
  return function ThemeWrapper({ children }: { children: ReactNode }) {
    return <ThemeProvider>{children}</ThemeProvider>;
  };
}

function createThemeColorWrapper() {
  return function ThemeColorWrapper({ children }: { children: ReactNode }) {
    return <ThemeColorProvider>{children}</ThemeColorProvider>;
  };
}

describe('preferencias visuais', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    document.documentElement.className = '';
    document.documentElement.style.removeProperty('--primary');
    authState.user = null;
    featureFlagState.easterEnabled = true;
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 1440,
    });
  });

  it('mantem a ultima escolha de tema ao alternar rapidamente e nao reverte para metadado antigo', async () => {
    authState.user = {
      id: 'user-1',
      user_metadata: {
        theme: 'light',
      },
    };

    const { result, rerender } = renderHook(() => useTheme(), {
      wrapper: createThemeWrapper(),
    });

    await act(async () => {
      result.current.setTheme('dark');
      result.current.setTheme('light');
      result.current.setTheme('dark');
    });

    rerender();

    expect(result.current.theme).toBe('dark');
    expect(localStorage.getItem('app-theme')).toBe('dark');

    await waitFor(() => {
      expect(updateUserMock).toHaveBeenCalledTimes(3);
    });
  });

  it('normaliza AMOLED salvo no desktop para Escuro uma unica vez sem loop', () => {
    localStorage.setItem('app-theme', 'amoled');

    const { result } = renderHook(() => useTheme(), {
      wrapper: createThemeWrapper(),
    });

    expect(result.current.theme).toBe('dark');
    expect(localStorage.getItem('app-theme')).toBe('dark');
    expect(updateUserMock).not.toHaveBeenCalled();
  });

  it('mantem a ultima cor de destaque ao trocar rapidamente e nao reverte para valor remoto antigo', async () => {
    authState.user = {
      id: 'user-1',
      user_metadata: {
        accent_color: 'blue',
      },
    };

    const { result, rerender } = renderHook(() => useThemeColor(), {
      wrapper: createThemeColorWrapper(),
    });

    await act(async () => {
      result.current.setAccentColor('rose');
      result.current.setAccentColor('emerald');
      result.current.setAccentColor('cyan');
    });

    rerender();

    expect(result.current.accentColor).toBe('cyan');
    expect(localStorage.getItem('accent-color')).toBe('cyan');
    expect(document.documentElement.style.getPropertyValue('--primary')).toBe('188.7 94.5% 42.7%');

    await waitFor(() => {
      expect(updateUserMock).toHaveBeenCalledTimes(3);
    });
  });

  it('remove a cor de pascoa quando a flag global estiver desligada sem voltar ao valor antigo', async () => {
    authState.user = {
      id: 'user-1',
      user_metadata: {
        accent_color: 'pascoa',
      },
    };
    localStorage.setItem('accent-color', 'pascoa');
    featureFlagState.easterEnabled = false;

    const { result } = renderHook(() => useThemeColor(), {
      wrapper: createThemeColorWrapper(),
    });

    await waitFor(() => {
      expect(result.current.accentColor).toBe('teal');
    });

    expect(localStorage.getItem('accent-color')).toBe('teal');
  });
});

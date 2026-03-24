import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

// âœ… FIX: contexto sem valor padrão â€” força uso dentro do Provider
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // âœ… FIX: apenas onAuthStateChange â€” ele já dispara INITIAL_SESSION
    // eliminando a race condition com getSession
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // âœ… FIX: limpa o estado local imediatamente antes do listener processar
  const signOut = useCallback(async () => {
    setSession(null);
    setUser(null);
    await supabase.auth.signOut();
  }, []);

  const value = useMemo(() => ({
    session,
    user,
    loading,
    signOut
  }), [session, user, loading, signOut]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// âœ… FIX: lança erro se usado fora do Provider â€” falha rápida e explícita
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};



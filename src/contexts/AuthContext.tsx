import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useStandaloneAuth(enabled = true): AuthContextValue {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
    });

    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [enabled]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    try {
      const { clearInviteAccess } = await import('@/lib/inviteCode');
      clearInviteAccess();
    } catch (error) {
      console.error('Failed to clear invite access during sign out:', error);
    }
  }, []);

  return useMemo(() => ({ session, user, loading, signOut }), [session, user, loading, signOut]);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const value = useStandaloneAuth();
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue | null {
  return useContext(AuthContext);
}

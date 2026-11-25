import { useAuthContext, useStandaloneAuth, type AuthContextValue } from '@/contexts/AuthContext';

export function useAuth(): AuthContextValue {
  const ctx = useAuthContext();
  const standalone = useStandaloneAuth(ctx === null);
  return ctx ?? standalone;
}

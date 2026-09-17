import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export const USERNAME_RE = /^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])?$/;

/**
 * The handle that makes `@you/thing` addresses work. One per account, claimed
 * once, changeable while nobody else has taken the new one.
 */
export function useUsername() {
  const { user } = useAuth();
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) { setUsername(null); return; }
    setLoading(true);
    try {
      const { data } = await db.from('usernames').select('username').eq('user_id', user.id).maybeSingle();
      setUsername(data?.username ?? null);
    } catch {
      setUsername(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const available = useCallback(async (candidate: string) => {
    const { data } = await db.from('usernames').select('user_id').eq('username', candidate).maybeSingle();
    return !data || data.user_id === user?.id;
  }, [user]);

  const claim = useCallback(async (candidate: string) => {
    if (!user) throw new Error('Sign in first.');
    const handle = candidate.trim().toLowerCase();
    if (!USERNAME_RE.test(handle)) {
      throw new Error('Use 2–32 characters: lowercase letters, numbers and dashes.');
    }
    if (!(await available(handle))) throw new Error(`@${handle} is taken.`);
    const { error } = await db.from('usernames').upsert(
      { user_id: user.id, username: handle },
      { onConflict: 'user_id' },
    );
    if (error) throw new Error(error.message ?? 'Could not save that handle.');
    setUsername(handle);
    return handle;
  }, [user, available]);

  return { username, loading, claim, available, refresh };
}

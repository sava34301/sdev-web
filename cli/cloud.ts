/**
 * Cloud access helpers for the CLI, backed by `~/.sdev/session.json`.
 */
import './env';
import { supabase } from '@/integrations/supabase/client';
import { currentUser, requireUser, signOut } from './auth';

/* Dialect/library/extension tables ship ahead of generated Supabase types. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db = supabase as any;

export { currentUser, requireUser, signOut };

export async function myUsername(userId: string): Promise<string | null> {
  const { data, error } = await db.from('usernames').select('username').eq('user_id', userId).maybeSingle();
  if (error) return null;
  return data?.username ?? null;
}

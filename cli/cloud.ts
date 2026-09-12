/**
 * Cloud access for the CLI — the same backend the web IDE uses.
 * Sessions live in ~/.sdev/session.json and are restored by cli/auth.ts.
 */
import './env';
import { supabase } from '@/integrations/supabase/client';
import { currentUser, requireUser, signInWithPassword, signOut } from './auth';

/* Dialect/library/extension tables ship ahead of the generated types. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db = supabase as any;

export { currentUser, requireUser, signOut };

export async function signIn(email: string, password: string) {
  return signInWithPassword(email, password);
}

export async function myUsername(userId: string): Promise<string | null> {
  const { data } = await db.from('usernames').select('username').eq('user_id', userId).maybeSingle();
  return data?.username ?? null;
}

/**
 * Cloud access for the CLI — the same backend the web IDE uses.
 * The session is persisted in ~/.sdev/store.json via the localStorage shim.
 */
import './env';
import { supabase } from '@/integrations/supabase/client';

/* Dialect/library/extension tables ship ahead of the generated types. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db = supabase as any;

export async function currentUser() {
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

export async function requireUser() {
  const user = await currentUser();
  if (!user) throw new Error('Not signed in. Run: sdev auth login <email>');
  return user;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return data.user;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function myUsername(userId: string): Promise<string | null> {
  const { data } = await db.from('usernames').select('username').eq('user_id', userId).maybeSingle();
  return data?.username ?? null;
}

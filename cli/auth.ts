/**
 * Sign-in for the command line.
 *
 * The CLI talks to the same backend as the web IDE, but a terminal has no
 * browser: no redirect, no popup, no shared cookie jar. So the session is
 * kept in ~/.sdev/session.json (owner-readable only), restored into the
 * shared client on every command, and refreshed when it has expired.
 *
 * Three ways in:
 *   sdev auth login <email>     email + password
 *   sdev auth code <email>      one-time code delivered by email
 *   sdev auth token             paste an access/refresh token pair
 */
import './env';
import { SDEV_HOME } from './env';
import { readFileSync, writeFileSync, existsSync, rmSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

const SESSION_PATH = join(SDEV_HOME, 'session.json');

interface StoredSession {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  email?: string | null;
}

/* ------------------------------------------------------------------ */
/* session file                                                        */
/* ------------------------------------------------------------------ */

export function saveSession(session: Session | null): void {
  if (!session) return clearSession();
  const payload: StoredSession = {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at,
    email: session.user?.email ?? null,
  };
  writeFileSync(SESSION_PATH, JSON.stringify(payload, null, 2));
  try { chmodSync(SESSION_PATH, 0o600); } catch { /* windows */ }
}

export function clearSession(): void {
  try { if (existsSync(SESSION_PATH)) rmSync(SESSION_PATH); } catch { /* ignore */ }
}

function readStored(): StoredSession | null {
  try {
    const s = JSON.parse(readFileSync(SESSION_PATH, 'utf8')) as StoredSession;
    return s.access_token && s.refresh_token ? s : null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* restoring                                                           */
/* ------------------------------------------------------------------ */

let restored = false;

/**
 * Make sure the shared client carries a live session before any cloud call.
 * Returns the session, or null when nobody is signed in.
 */
export async function ensureSession(): Promise<Session | null> {
  if (!restored) {
    restored = true;
    const stored = readStored();
    const { data } = await supabase.auth.getSession();
    if (!data.session && stored) {
      const { data: set } = await supabase.auth.setSession({
        access_token: stored.access_token,
        refresh_token: stored.refresh_token,
      });
      if (set.session) saveSession(set.session);
    }
  }

  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session) return null;

  // Refresh a little before the token actually expires.
  const expiresAt = (session.expires_at ?? 0) * 1000;
  if (expiresAt && expiresAt - Date.now() < 60_000) {
    const { data: refreshed, error } = await supabase.auth.refreshSession();
    if (error || !refreshed.session) {
      clearSession();
      return null;
    }
    saveSession(refreshed.session);
    return refreshed.session;
  }
  return session;
}

export async function currentUser(): Promise<User | null> {
  const session = await ensureSession();
  if (!session) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    clearSession();
    return null;
  }
  return data.user ?? null;
}

export async function requireUser(): Promise<User> {
  const user = await currentUser();
  if (!user) {
    throw new Error(
      'Not signed in.\n' +
      '  sdev auth login <email>   email and password\n' +
      '  sdev auth code <email>    one-time code by email',
    );
  }
  return user;
}

/* ------------------------------------------------------------------ */
/* readable failures                                                   */
/* ------------------------------------------------------------------ */

export function explain(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) {
    return 'That email and password combination was not accepted.\n' +
      'If you signed up with Google, set a password on the website first, or use: sdev auth code <email>';
  }
  if (m.includes('email not confirmed')) {
    return 'This account still needs email confirmation. Open the link we emailed you, then try again.';
  }
  if (m.includes('email logins are disabled') || m.includes('signups not allowed') || m.includes('email provider')) {
    return 'Password sign-in is not enabled for this account type. Try: sdev auth code <email>';
  }
  if (m.includes('token has expired') || m.includes('invalid token')) {
    return 'That code is no longer valid. Request a fresh one with: sdev auth code <email>';
  }
  if (m.includes('fetch failed') || m.includes('network') || m.includes('enotfound')) {
    return 'Could not reach the sdev backend. Check your internet connection or proxy settings.';
  }
  return message;
}

/* ------------------------------------------------------------------ */
/* the ways in                                                         */
/* ------------------------------------------------------------------ */

export async function signInWithPassword(email: string, password: string): Promise<User> {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw new Error(explain(error.message));
  saveSession(data.session);
  return data.user!;
}

export async function signUpWithPassword(email: string, password: string, displayName?: string): Promise<{ user: User | null; needsConfirmation: boolean }> {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { display_name: displayName || email.split('@')[0] } },
  });
  if (error) throw new Error(explain(error.message));
  if (data.session) saveSession(data.session);
  return { user: data.user, needsConfirmation: !data.session };
}

export async function sendEmailCode(email: string, allowCreate: boolean): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: { shouldCreateUser: allowCreate },
  });
  if (error) throw new Error(explain(error.message));
}

export async function verifyEmailCode(email: string, code: string): Promise<User> {
  const { data, error } = await supabase.auth.verifyOtp({
    email: email.trim(),
    token: code.trim(),
    type: 'email',
  });
  if (error) throw new Error(explain(error.message));
  saveSession(data.session);
  return data.user!;
}

export async function signInWithTokens(accessToken: string, refreshToken: string): Promise<User> {
  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken.trim(),
    refresh_token: refreshToken.trim(),
  });
  if (error) throw new Error(explain(error.message));
  saveSession(data.session);
  return data.user!;
}

export async function sendPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: 'https://web.sdev.codes/reset-password',
  });
  if (error) throw new Error(explain(error.message));
}

export async function signOut(): Promise<void> {
  try { await supabase.auth.signOut(); } catch { /* offline: local clear is enough */ }
  clearSession();
}

export function sessionFile(): string {
  return SESSION_PATH;
}

export function storedSummary(): StoredSession | null {
  return readStored();
}

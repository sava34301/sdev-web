import { supabase } from '@/integrations/supabase/client';

const KEY = 'sdev_invite_ok';
const CODE_KEY = 'sdev_invite_code';

export function hasInviteAccess(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(KEY) === '1';
}

export function clearInviteAccess() {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(CODE_KEY);
  } catch (error) {
    console.error('Failed to clear invite access from localStorage', error);
  }
}

export async function redeemInviteCode(code: string): Promise<{ ok: boolean; error?: string }> {
  const trimmed = code.trim();
  if (!trimmed) return { ok: false, error: 'empty' };
  const { data, error } = await supabase.rpc('redeem_invite', { _code: trimmed });
  if (error) return { ok: false, error: error.message };
  if (data === true) {
    try {
      localStorage.setItem(KEY, '1');
      localStorage.setItem(CODE_KEY, trimmed);
    } catch (err) {
      console.error('Failed to save invite access to localStorage', err);
    }
    return { ok: true };
  }
  return { ok: false, error: 'invalid' };
}

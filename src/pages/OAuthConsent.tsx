import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SiteNav } from '@/components/site/SiteNav';
import { SdevMark } from '@/components/site/SdevMark';

type OAuthDetails = {
  redirect_url?: string;
  redirect_to?: string;
  client?: { name?: string };
};

type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: OAuthDetails | null; error: { message: string } | null }>;
  approveAuthorization: (id: string) => Promise<{ data: OAuthDetails | null; error: { message: string } | null }>;
  denyAuthorization: (id: string) => Promise<{ data: OAuthDetails | null; error: { message: string } | null }>;
};
const oauth = () => (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get('authorization_id') ?? '';
  const [details, setDetails] = useState<OAuthDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) return setError('Missing authorization_id');
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = '/auth?next=' + encodeURIComponent(next);
        return;
      }
      const { data, error } = await oauth().getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) return setError(error.message);
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) { window.location.href = immediate; return; }
      setDetails(data);
    })();
    return () => { active = false; };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error } = approve
      ? await oauth().approveAuthorization(authorizationId)
      : await oauth().denyAuthorization(authorizationId);
    if (error) { setBusy(false); return setError(error.message); }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) { setBusy(false); return setError('No redirect returned by the authorization server.'); }
    window.location.href = target;
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col" data-testid="oauth-consent-page">
      <SiteNav />
      <main className="wrap flex-1 py-20 flex items-center justify-center">
        <div className="max-w-md w-full rounded-2xl border border-border bg-card p-8 space-y-5">
          <div className="flex items-center gap-3">
            <SdevMark size={32} />
            <span className="label">OAuth Authorization</span>
          </div>
          {error ? (
            <p className="text-sm text-destructive">Could not load this authorization request: {error}</p>
          ) : !details ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading authorization details…</p>
          ) : (
            <>
              <h1 className="font-display text-3xl font-bold leading-tight">Connect {details.client?.name ?? 'an application'} to sdev</h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Approving lets <strong className="text-foreground">{details.client?.name ?? 'the application'}</strong> read and save your sdev workspace files and browse dialects on your behalf.
              </p>
              <div className="flex gap-3 pt-2">
                <button disabled={busy} onClick={() => decide(true)} className="btn-ink flex-1 justify-center disabled:opacity-50">
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />} Approve
                </button>
                <button disabled={busy} onClick={() => decide(false)} className="btn-line flex-1 justify-center disabled:opacity-50">
                  Deny
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

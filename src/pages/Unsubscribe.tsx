import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { SEO } from '@/components/SEO';
import { SiteNav } from '@/components/site/SiteNav';
import { SiteFooter } from '@/components/site/SiteFooter';

type State = 'validating' | 'ready' | 'confirming' | 'success' | 'already' | 'invalid';

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [state, setState] = useState<State>('validating');

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  useEffect(() => {
    if (!token) { setState('invalid'); return; }
    (async () => {
      try {
        const r = await fetch(`${supabaseUrl}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`, {
          headers: { apikey: supabaseAnonKey },
        });
        const j = await r.json();
        if (j.valid) setState('ready');
        else if (j.reason === 'already_unsubscribed') setState('already');
        else setState('invalid');
      } catch { setState('invalid'); }
    })();
  }, [token, supabaseUrl, supabaseAnonKey]);

  const confirm = async () => {
    if (!token) return;
    setState('confirming');
    try {
      const r = await fetch(`${supabaseUrl}/functions/v1/handle-email-unsubscribe`, {
        method: 'POST',
        headers: { apikey: supabaseAnonKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const j = await r.json();
      if (j.success) setState('success');
      else if (j.reason === 'already_unsubscribed') setState('already');
      else setState('invalid');
    } catch { setState('invalid'); }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col" data-testid="unsubscribe-page">
      <SEO title="Unsubscribe — sdev" description="Manage your sdev email subscription: confirm unsubscribe from sdev product updates, launch news, and release announcements." path="/unsubscribe" />
      <SiteNav />

      <main className="wrap flex-1 py-20 flex items-center justify-center">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center">
          {state === 'validating' && (
            <>
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
              <h1 className="font-display text-2xl font-bold">Checking your link…</h1>
              <p className="mt-2 text-sm text-muted-foreground">Validating your email preferences.</p>
            </>
          )}
          {state === 'ready' && (
            <>
              <p className="label mb-2">Email preferences</p>
              <h1 className="font-display text-3xl font-bold">Unsubscribe from sdev emails?</h1>
              <p className="mt-3 text-sm text-muted-foreground">You will stop receiving product and release updates. Essential account security emails are unaffected.</p>
              <button onClick={confirm} className="btn-ink mt-6 w-full justify-center">Confirm unsubscribe</button>
            </>
          )}
          {state === 'confirming' && (
            <>
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Updating preferences…</p>
            </>
          )}
          {state === 'success' && (
            <>
              <CheckCircle2 className="h-10 w-10 mx-auto mb-4 text-primary" />
              <h1 className="font-display text-3xl font-bold">You're unsubscribed</h1>
              <p className="mt-2 text-sm text-muted-foreground">You won't receive more product emails from sdev.</p>
              <Link to="/" className="btn-line mt-6">Back home</Link>
            </>
          )}
          {state === 'already' && (
            <>
              <CheckCircle2 className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
              <h1 className="font-display text-3xl font-bold">Already unsubscribed</h1>
              <p className="mt-2 text-sm text-muted-foreground">This unsubscribe link has already been used.</p>
              <Link to="/" className="btn-line mt-6">Back home</Link>
            </>
          )}
          {state === 'invalid' && (
            <>
              <XCircle className="h-10 w-10 mx-auto mb-4 text-destructive" />
              <h1 className="font-display text-3xl font-bold">Invalid or expired link</h1>
              <p className="mt-2 text-sm text-muted-foreground">We couldn't verify this unsubscribe token.</p>
              <Link to="/" className="btn-line mt-6">Back home</Link>
            </>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

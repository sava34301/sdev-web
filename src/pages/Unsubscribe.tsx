import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { SEO } from '@/components/SEO';

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
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <SEO title="Unsubscribe — SDEV" description="Manage your SDEV email subscription: confirm unsubscribe from sdev product updates, launch news, and release announcements, or re-subscribe anytime." path="/unsubscribe" />
      <Card className="w-full max-w-md p-8 border-border/50 text-center">
        {state === 'validating' && (<><h1 className="text-2xl font-bold mb-2">Unsubscribe from SDEV emails</h1><Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" /><p className="text-muted-foreground">Checking your link…</p></>)}
        {state === 'ready' && (
          <>
            <h1 className="text-2xl font-bold mb-2">Unsubscribe from SDEV emails?</h1>
            <p className="text-muted-foreground mb-6">You'll stop receiving updates from us. You can re-subscribe anytime.</p>
            <Button onClick={confirm} className="w-full">Confirm unsubscribe</Button>
          </>
        )}
        {state === 'confirming' && (<><Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" /><p>Processing…</p></>)}
        {state === 'success' && (
          <>
            <CheckCircle2 className="h-10 w-10 mx-auto mb-4 text-primary" />
            <h1 className="text-2xl font-bold mb-2">You're unsubscribed</h1>
            <p className="text-muted-foreground mb-6">You won't receive more emails from SDEV.</p>
            <Link to="/"><Button variant="outline">Back to home</Button></Link>
          </>
        )}
        {state === 'already' && (
          <>
            <CheckCircle2 className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
            <h1 className="text-2xl font-bold mb-2">Already unsubscribed</h1>
            <p className="text-muted-foreground mb-6">This link has already been used.</p>
            <Link to="/"><Button variant="outline">Back to home</Button></Link>
          </>
        )}
        {state === 'invalid' && (
          <>
            <XCircle className="h-10 w-10 mx-auto mb-4 text-destructive" />
            <h1 className="text-2xl font-bold mb-2">Invalid link</h1>
            <p className="text-muted-foreground mb-6">This unsubscribe link is invalid or expired.</p>
            <Link to="/"><Button variant="outline">Back to home</Button></Link>
          </>
        )}
      </Card>
    </main>
  );
}

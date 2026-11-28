import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { SEO } from '@/components/SEO';
import { SiteNav } from '@/components/site/SiteNav';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SdevCode } from '@/components/home/SdevCode';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { hasInviteAccess } from '@/lib/inviteCode';
import { isLaunched } from '@/lib/launchGate';

const SYNC_SAMPLE = `// Publish & import under your @handle
use "@yourname/mathkit@1.0.0"

forge answer be clamp(128, 0, 100)
speak("Ready everywhere: " + answer)`;

export default function Auth() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [handle, setHandle] = useState('');
  const [busy, setBusy] = useState(false);
  const signupAllowed = isLaunched() || hasInviteAccess();
  const rawNext = new URLSearchParams(window.location.search).get('next') || '';
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/ide';

  useEffect(() => {
    if (!authLoading && user) navigate(next);
  }, [user, authLoading, navigate, next]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success('Welcome back!');
    navigate(next);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const wanted = handle.trim().toLowerCase();
    if (!/^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])?$/.test(wanted)) {
      return toast.error('Pick a username: 2–32 lowercase letters, numbers or dashes.');
    }
    setBusy(true);
    const { data: taken } = await supabase.from('usernames').select('user_id').eq('username', wanted).maybeSingle();
    if (taken) {
      setBusy(false);
      return toast.error(`@${wanted} is taken.`);
    }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}${next}`,
        data: { username: wanted, display_name: displayName || wanted },
      },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success('Account created! You can sign in now.');
  };

  const handleGoogle = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + next,
      },
    });
    if (error) {
      setBusy(false);
      toast.error('Google sign-in failed');
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col" data-testid="auth-page">
      <SEO title="Sign in — sdev" description="Sign in or create an sdev account to save files to the cloud, share gists, and sync your workspace across devices." path="/auth" />
      <SiteNav />

      <main className="wrap flex-1 py-16 sm:py-24">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-7">
            <p className="label">§ Account & namespace</p>
            <h1 className="mt-4 font-display text-5xl font-extrabold leading-[0.95] tracking-[-0.04em] sm:text-6xl">
              One handle for everything you <span className="serif-i font-normal text-primary">build.</span>
            </h1>
            <p className="mt-5 max-w-lg text-muted-foreground leading-relaxed">
              The sdev IDE and compiler work without an account. Sign in when you want cloud workspace sync, a public <code className="font-mono text-foreground">@handle</code> for publishing libraries and dialects, or runnable share links.
            </p>
            <div className="ink mt-8 max-w-lg overflow-hidden rounded-2xl border border-border">
              <div className="flex items-center justify-between border-b border-border px-4 py-2 font-mono text-[11px] text-muted-foreground">
                <span>@{handle || 'yourname'}/workspace</span>
                <span className="text-[hsl(var(--lime))]">● synced</span>
              </div>
              <SdevCode code={SYNC_SAMPLE.replace('@yourname', `@${handle || 'yourname'}`)} numbered className="p-4 text-[12px]" />
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
              <h2 className="font-display text-2xl font-bold">sdev account</h2>
              <p className="mt-1 text-sm text-muted-foreground">Continue with Google or use your email address.</p>

              <Button variant="outline" className="mt-6 w-full h-11 rounded-full bg-background" onClick={handleGoogle} disabled={busy}>
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Continue with Google
              </Button>

              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center font-mono text-[10px] uppercase tracking-widest"><span className="bg-card px-3 text-muted-foreground">Or email</span></div>
              </div>

              <Tabs defaultValue="signin">
                <TabsList className={`grid w-full ${signupAllowed ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  <TabsTrigger value="signin">Sign in</TabsTrigger>
                  {signupAllowed && <TabsTrigger value="signup">Create account</TabsTrigger>}
                </TabsList>

                <TabsContent value="signin">
                  <form onSubmit={handleSignIn} className="space-y-4 mt-4">
                    <div>
                      <Label htmlFor="email-in">Email</Label>
                      <Input id="email-in" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 bg-background" />
                    </div>
                    <div>
                      <Label htmlFor="pw-in">Password</Label>
                      <Input id="pw-in" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 bg-background" />
                    </div>
                    <button type="submit" disabled={busy} className="btn-ink w-full justify-center disabled:opacity-50">
                      {busy && <Loader2 className="h-4 w-4 animate-spin" />} Sign in
                    </button>
                  </form>
                </TabsContent>

                {signupAllowed && (
                  <TabsContent value="signup">
                    <form onSubmit={handleSignUp} className="space-y-4 mt-4">
                      <div>
                        <Label htmlFor="handle-up">Username</Label>
                        <Input
                          id="handle-up"
                          required
                          value={handle}
                          onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                          placeholder="yourname"
                          className="mt-1 font-mono bg-background"
                        />
                        <p className="text-xs text-muted-foreground mt-1">People install your work as @{handle || 'yourname'}/thing.</p>
                      </div>
                      <div>
                        <Label htmlFor="name-up">Display name</Label>
                        <Input id="name-up" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" className="mt-1 bg-background" />
                      </div>
                      <div>
                        <Label htmlFor="email-up">Email</Label>
                        <Input id="email-up" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 bg-background" />
                      </div>
                      <div>
                        <Label htmlFor="pw-up">Password</Label>
                        <Input id="pw-up" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 bg-background" />
                      </div>
                      <button type="submit" disabled={busy} className="btn-ink w-full justify-center disabled:opacity-50">
                        {busy && <Loader2 className="h-4 w-4 animate-spin" />} Create account
                      </button>
                    </form>
                  </TabsContent>
                )}
              </Tabs>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

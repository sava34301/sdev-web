import { useEffect, useState } from 'react';
import { SEO } from '@/components/SEO';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { hasInviteAccess } from '@/lib/inviteCode';
import { isLaunched } from '@/lib/launchGate';

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
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <SEO title="Sign in — sdev" description="Sign in or create an sdev account to save files to the cloud, share gists, and sync your workspace across devices." path="/auth" />
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Back home
        </Link>
        <Card className="p-8 border-border/50">
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight">sdev account</h1>
            <p className="text-sm text-muted-foreground mt-1">Save your code, share gists, sync everywhere.</p>
          </div>

          <Button variant="outline" className="w-full mb-4" onClick={handleGoogle} disabled={busy}>
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continue with Google
          </Button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border/50" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">Or</span></div>
          </div>

          <Tabs defaultValue="signin">
            <TabsList className={`grid w-full ${signupAllowed ? 'grid-cols-2' : 'grid-cols-1'}`}>
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              {signupAllowed && <TabsTrigger value="signup">Sign up</TabsTrigger>}
            </TabsList>
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="email-in">Email</Label>
                  <Input id="email-in" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="pw-in">Password</Label>
                  <Input id="pw-in" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Sign in
                </Button>
              </form>
            </TabsContent>
            {signupAllowed && <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="handle-up">Username</Label>
                  <Input
                    id="handle-up"
                    required
                    value={handle}
                    onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    placeholder="yourname"
                  />
                  <p className="text-xs text-muted-foreground mt-1">People install your work as @{handle || 'yourname'}/thing.</p>
                </div>
                <div>
                  <Label htmlFor="name-up">Display name</Label>
                  <Input id="name-up" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" />
                </div>
                <div>
                  <Label htmlFor="email-up">Email</Label>
                  <Input id="email-up" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="pw-up">Password</Label>
                  <Input id="pw-up" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create account
                </Button>
              </form>
            </TabsContent>}
          </Tabs>
        </Card>
      </div>
    </main>
  );
}

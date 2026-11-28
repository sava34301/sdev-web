import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { LogOut, Save, Trash2, Star, Clock, FileCode, Share2, Copy, Loader2, Shield, ArrowUpRight } from 'lucide-react';
import { toast } from 'sonner';
import { SEO } from '@/components/SEO';
import { SiteNav } from '@/components/site/SiteNav';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SdevCode } from '@/components/home/SdevCode';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCloudFiles } from '@/hooks/useCloudFiles';
import { useUsername } from '@/hooks/useUsername';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { AdminInviteCodes } from '@/components/AdminInviteCodes';

interface Profile {
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  website: string | null;
}

interface RunRow {
  id: string;
  file_name: string | null;
  code_snippet: string;
  output: string | null;
  status: string;
  duration_ms: number | null;
  created_at: string;
}

interface Gist {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  view_count: number;
  created_at: string;
}

interface StarRow {
  id: string;
  gists: Gist;
}

export default function Account() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { files, deleteFile } = useCloudFiles();
  const { isAdmin } = useIsAdmin();
  const [profile, setProfile] = useState<Profile>({ display_name: '', avatar_url: '', bio: '', website: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const { username, claim } = useUsername();
  const [handleDraft, setHandleDraft] = useState('');
  const [claiming, setClaiming] = useState(false);

  useEffect(() => { if (username) setHandleDraft(username); }, [username]);

  const saveHandle = async () => {
    setClaiming(true);
    try {
      const next = await claim(handleDraft);
      toast.success(`You are @${next}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save that handle');
    } finally {
      setClaiming(false);
    }
  };

  const [history, setHistory] = useState<RunRow[]>([]);
  const [gists, setGists] = useState<Gist[]>([]);
  const [stars, setStars] = useState<StarRow[]>([]);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from('profiles').select('display_name, avatar_url, bio, website').eq('user_id', user.id).maybeSingle();
      if (data) setProfile(data);

      const { data: runs } = await supabase.from('run_history').select('*').order('created_at', { ascending: false }).limit(50);
      if (runs) setHistory(runs as RunRow[]);

      const { data: myGists } = await supabase.from('gists').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      if (myGists) setGists(myGists as Gist[]);

      const { data: starred } = await supabase.from('starred_snippets').select('id, gists(*)').order('created_at', { ascending: false });
      if (starred) setStars(starred as unknown as StarRow[]);
    })();
  }, [user]);

  const saveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    const { error } = await supabase.from('profiles').update(profile).eq('user_id', user.id);
    setSavingProfile(false);
    if (error) toast.error(error.message);
    else toast.success('Profile saved');
  };

  const handleDeleteFile = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    await deleteFile(id);
    toast.success('Deleted');
  };

  const handleDeleteGist = async (id: string) => {
    if (!confirm('Delete this gist?')) return;
    await supabase.from('gists').delete().eq('id', id);
    setGists((gs) => gs.filter((g) => g.id !== id));
    toast.success('Gist deleted');
  };

  const copyGistLink = (slug: string) => {
    const url = `${window.location.origin}/g/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied');
  };

  const handleSignOut = async () => { await signOut(); navigate('/'); };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-background text-foreground" data-testid="account-page">
      <SEO title="Account — sdev" description="Manage your sdev profile, cloud-saved files, public gists, and recent runs from your personal account dashboard." path="/account" />
      <SiteNav />

      <section className="wrap pt-14 sm:pt-20">
        <div className="flex items-center justify-between border-b border-foreground/15 pb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          <span>Account</span>
          <span>{user.email}</span>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.display_name || 'avatar'} className="h-20 w-20 rounded-2xl object-cover border border-border" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
            ) : (
              <div className="grid h-20 w-20 place-items-center rounded-2xl bg-foreground font-display text-2xl font-extrabold text-[hsl(var(--lime))]">
                {(profile.display_name || username || 'S').slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
                {profile.display_name || (username ? `@${username}` : 'Your account')}
              </h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-3 font-mono text-xs text-muted-foreground">
                {username && <span className="rounded-full bg-[hsl(var(--lime))] px-2.5 py-0.5 font-semibold text-[hsl(var(--ink))]">@{username}</span>}
                <span>{files.length} files · {gists.length} shared · {stars.length} starred</span>
                {profile.website && (
                  <a href={profile.website} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
                    {profile.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link to="/ide" className="btn-ink !h-10">Open IDE <ArrowUpRight className="h-4 w-4" /></Link>
            <button onClick={handleSignOut} className="btn-line !h-10"><LogOut className="h-4 w-4" /> Sign out</button>
          </div>
        </div>
      </section>

      <main className="wrap py-12 pb-24">
        <Tabs defaultValue="profile">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="profile">Profile & handle</TabsTrigger>
            <TabsTrigger value="files"><FileCode className="h-3.5 w-3.5 mr-1.5" />Files ({files.length})</TabsTrigger>
            <TabsTrigger value="gists"><Share2 className="h-3.5 w-3.5 mr-1.5" />Shared ({gists.length})</TabsTrigger>
            <TabsTrigger value="stars"><Star className="h-3.5 w-3.5 mr-1.5" />Starred ({stars.length})</TabsTrigger>
            <TabsTrigger value="history"><Clock className="h-3.5 w-3.5 mr-1.5" />Run history</TabsTrigger>
            {isAdmin && <TabsTrigger value="admin"><Shield className="h-3.5 w-3.5 mr-1.5" />Admin</TabsTrigger>}
          </TabsList>

          {isAdmin && (
            <TabsContent value="admin" className="mt-6">
              <AdminInviteCodes />
            </TabsContent>
          )}

          <TabsContent value="profile" className="mt-6 grid gap-8 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-6 space-y-4 self-start">
              <p className="label">Namespace</p>
              <h2 className="font-display text-2xl font-bold">Your @handle</h2>
              <p className="text-sm text-muted-foreground">
                People install your libraries and dialects using <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">@{username || 'you'}/package</code>.
              </p>
              <div className="flex gap-2">
                <Input
                  value={handleDraft}
                  onChange={(e) => setHandleDraft(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="your-handle"
                  className="font-mono bg-background"
                  aria-label="Handle"
                />
                <button onClick={saveHandle} disabled={claiming || !handleDraft.trim()} className="btn-ink shrink-0 disabled:opacity-50">
                  {claiming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {username ? 'Update' : 'Claim'}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">2–32 characters: lowercase letters, digits and dashes.</p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
              <p className="label">Public card</p>
              <h2 className="font-display text-2xl font-bold">Profile details</h2>
              <div>
                <Label>Display name</Label>
                <Input className="mt-1 bg-background" value={profile.display_name ?? ''} onChange={(e) => setProfile({ ...profile, display_name: e.target.value })} />
              </div>
              <div>
                <Label>Avatar URL</Label>
                <Input className="mt-1 bg-background" value={profile.avatar_url ?? ''} onChange={(e) => setProfile({ ...profile, avatar_url: e.target.value })} placeholder="https://..." />
              </div>
              <div>
                <Label>Website</Label>
                <Input className="mt-1 bg-background" value={profile.website ?? ''} onChange={(e) => setProfile({ ...profile, website: e.target.value })} placeholder="https://..." />
              </div>
              <div>
                <Label>Bio</Label>
                <Textarea className="mt-1 bg-background" value={profile.bio ?? ''} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} rows={3} />
              </div>
              <button onClick={saveProfile} disabled={savingProfile} className="btn-ink disabled:opacity-50">
                {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save profile
              </button>
            </div>
          </TabsContent>

          <TabsContent value="files" className="mt-6">
            {files.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-foreground/25 bg-card/50 p-10 text-center">
                <p className="font-display text-2xl font-bold">No cloud files yet.</p>
                <p className="mt-2 text-sm text-muted-foreground">Save any workspace file from the IDE to see it here.</p>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {files.map((f) => (
                  <div key={f.id} className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5">
                    <div className="min-w-0">
                      <div className="font-mono text-sm font-medium truncate">{f.name}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{formatDistanceToNow(new Date(f.updated_at), { addSuffix: true })}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => navigate(`/ide?cloud=${f.id}`)} className="btn-ink !h-8 !px-3.5 !text-xs">Open</button>
                      <button onClick={() => handleDeleteFile(f.id, f.name)} aria-label={`Delete ${f.name}`} className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="gists" className="mt-6">
            {gists.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-foreground/25 bg-card/50 p-10 text-center">
                <p className="font-display text-2xl font-bold">No shared programs yet.</p>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {gists.map((g) => (
                  <div key={g.id} className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5">
                    <div className="min-w-0">
                      <div className="font-display text-lg font-bold truncate">{g.title}</div>
                      <div className="mt-0.5 font-mono text-xs text-muted-foreground">{g.view_count} views · /g/{g.slug}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => copyGistLink(g.slug)} aria-label="Copy gist link" className="btn-line !h-8 !px-3 !text-xs"><Copy className="h-3.5 w-3.5" /></button>
                      <button onClick={() => navigate(`/g/${g.slug}`)} className="btn-ink !h-8 !px-3.5 !text-xs">View</button>
                      <button onClick={() => handleDeleteGist(g.id)} aria-label="Delete gist" className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="stars" className="mt-6">
            {stars.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-foreground/25 bg-card/50 p-10 text-center">
                <p className="font-display text-2xl font-bold">No starred programs yet.</p>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {stars.map((s) => s.gists && (
                  <div key={s.id} className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5">
                    <div className="min-w-0">
                      <div className="font-display text-lg font-bold truncate">{s.gists.title}</div>
                      <div className="mt-0.5 font-mono text-xs text-muted-foreground">/g/{s.gists.slug}</div>
                    </div>
                    <button onClick={() => navigate(`/g/${s.gists.slug}`)} className="btn-ink !h-8 !px-3.5 !text-xs">View</button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-6 space-y-4">
            {history.length === 0 && (
              <div className="rounded-2xl border border-dashed border-foreground/25 bg-card/50 p-10 text-center">
                <p className="font-display text-2xl font-bold">No recorded runs yet.</p>
              </div>
            )}
            {history.map((h) => (
              <div key={h.id} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <span className="font-mono text-xs font-medium">{h.file_name || 'untitled.sdev'}</span>
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${h.status === 'success' ? 'bg-[hsl(var(--lime))] text-[hsl(var(--ink))]' : 'bg-destructive/15 text-destructive'}`}>
                      {h.status}
                    </span>
                    <span className="text-muted-foreground">{h.duration_ms ?? 0} ms · {formatDistanceToNow(new Date(h.created_at), { addSuffix: true })}</span>
                  </div>
                </div>
                <div className="ink overflow-hidden rounded-xl border border-border">
                  <SdevCode code={h.code_snippet.slice(0, 320)} className="p-3 text-[12px]" />
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </main>

      <SiteFooter />
    </div>
  );
}

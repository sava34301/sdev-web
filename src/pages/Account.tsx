import { useEffect, useState } from 'react';
import { SEO } from '@/components/SEO';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ArrowLeft, LogOut, Save, Trash2, Star, Clock, FileCode, Share2, Copy, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCloudFiles } from '@/hooks/useCloudFiles';
import { useUsername } from '@/hooks/useUsername';

import { useIsAdmin } from '@/hooks/useIsAdmin';
import { AdminInviteCodes } from '@/components/AdminInviteCodes';
import { Shield } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

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
  const { files, deleteFile, refresh } = useCloudFiles();
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
    setGists(gs => gs.filter(g => g.id !== id));
    toast.success('Gist deleted');
  };

  const copyGistLink = (slug: string) => {
    const url = `${window.location.origin}/g/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied');
  };

  const handleSignOut = async () => { await signOut(); navigate('/'); };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Account — sdev" description="Manage your sdev profile, cloud-saved files, public gists, and recent runs from your personal account dashboard." path="/account" />
      <header className="border-b border-border/50">
        <div className="container max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/ide" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to IDE
          </Link>
          <Button variant="ghost" size="sm" onClick={handleSignOut}><LogOut className="h-4 w-4 mr-2" />Sign out</Button>
        </div>
      </header>

      <main className="container max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.display_name || 'avatar'} className="h-16 w-16 rounded-full object-cover border border-border/50" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          ) : (
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-neon-cyan to-neon-violet flex items-center justify-center text-lg font-bold text-background">
              {(profile.display_name || user.email || 'U').slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-3xl font-bold tracking-tight">{profile.display_name || user.email}</h1>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            {profile.website && (
              <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground underline">
                {profile.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
              </a>
            )}
          </div>
        </div>

        <Tabs defaultValue="profile">
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="files"><FileCode className="h-3.5 w-3.5 mr-1.5" />Files ({files.length})</TabsTrigger>
            <TabsTrigger value="gists"><Share2 className="h-3.5 w-3.5 mr-1.5" />Gists ({gists.length})</TabsTrigger>
            <TabsTrigger value="stars"><Star className="h-3.5 w-3.5 mr-1.5" />Stars ({stars.length})</TabsTrigger>
            <TabsTrigger value="history"><Clock className="h-3.5 w-3.5 mr-1.5" />History</TabsTrigger>
            {isAdmin && <TabsTrigger value="admin"><Shield className="h-3.5 w-3.5 mr-1.5" />Admin</TabsTrigger>}
          </TabsList>

          {isAdmin && (
            <TabsContent value="admin" className="mt-6">
              <AdminInviteCodes />
            </TabsContent>
          )}


          <TabsContent value="profile" className="mt-6">
            <h2 className="text-xl font-semibold tracking-tight mb-3">Your handle</h2>
            <Card className="p-6 space-y-3 max-w-xl mb-8">
              <p className="text-sm text-muted-foreground">
                Your handle is how people install what you publish: <code className="font-mono">@{username || 'you'}/my-library</code>.
              </p>
              <div className="flex gap-2">
                <Input
                  value={handleDraft}
                  onChange={(e) => setHandleDraft(e.target.value.toLowerCase())}
                  placeholder="your-handle"
                  className="font-mono"
                  aria-label="Handle"
                />
                <Button onClick={saveHandle} disabled={claiming || !handleDraft.trim()}>
                  {claiming ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  {username ? 'Change' : 'Claim'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">2–32 characters: lowercase letters, numbers and dashes.</p>
            </Card>


            <h2 className="text-xl font-semibold tracking-tight mb-3">Profile</h2>
            <Card className="p-6 space-y-4 max-w-xl">
              <div>
                <Label>Display name</Label>
                <Input value={profile.display_name ?? ''} onChange={(e) => setProfile({ ...profile, display_name: e.target.value })} />
              </div>
              <div>
                <Label>Avatar URL</Label>
                <Input value={profile.avatar_url ?? ''} onChange={(e) => setProfile({ ...profile, avatar_url: e.target.value })} placeholder="https://..." />
              </div>
              <div>
                <Label>Website</Label>
                <Input value={profile.website ?? ''} onChange={(e) => setProfile({ ...profile, website: e.target.value })} placeholder="https://..." />
              </div>
              <div>
                <Label>Bio</Label>
                <Textarea value={profile.bio ?? ''} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} rows={3} />
              </div>
              <Button onClick={saveProfile} disabled={savingProfile}>
                {savingProfile ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save profile
              </Button>
            </Card>
          </TabsContent>

          <TabsContent value="files" className="mt-6 space-y-2">
            <h2 className="text-xl font-semibold tracking-tight mb-3">Cloud files</h2>
            {files.length === 0 && <p className="text-sm text-muted-foreground">No saved files yet. Save one from the IDE.</p>}
            {files.map(f => (
              <Card key={f.id} className="p-3 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="font-mono text-sm truncate">{f.name}</div>
                  <div className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(f.updated_at), { addSuffix: true })}</div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => navigate(`/ide?cloud=${f.id}`)}>Open</Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDeleteFile(f.id, f.name)} aria-label={`Delete ${f.name}`}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="gists" className="mt-6 space-y-2">
            <h2 className="text-xl font-semibold tracking-tight mb-3">Public gists</h2>
            {gists.length === 0 && <p className="text-sm text-muted-foreground">No public gists yet.</p>}
            {gists.map(g => (
              <Card key={g.id} className="p-3 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="text-sm truncate">{g.title}</div>
                  <div className="text-xs text-muted-foreground">{g.view_count} views · /g/{g.slug}</div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => copyGistLink(g.slug)} aria-label="Copy gist link"><Copy className="h-4 w-4" /></Button>
                  <Button size="sm" variant="outline" onClick={() => navigate(`/g/${g.slug}`)}>View</Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDeleteGist(g.id)} aria-label="Delete gist"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="stars" className="mt-6 space-y-2">
            <h2 className="text-xl font-semibold tracking-tight mb-3">Starred gists</h2>
            {stars.length === 0 && <p className="text-sm text-muted-foreground">No starred gists yet.</p>}
            {stars.map(s => s.gists && (
              <Card key={s.id} className="p-3 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="text-sm truncate">{s.gists.title}</div>
                  <div className="text-xs text-muted-foreground">/g/{s.gists.slug}</div>
                </div>
                <Button size="sm" variant="outline" onClick={() => navigate(`/g/${s.gists.slug}`)}>View</Button>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="history" className="mt-6 space-y-2">
            <h2 className="text-xl font-semibold tracking-tight mb-3">Run history</h2>
            {history.length === 0 && <p className="text-sm text-muted-foreground">No runs yet.</p>}
            {history.map(h => (
              <Card key={h.id} className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono">{h.file_name || 'untitled'}</span>
                  <span className={`text-xs ${h.status === 'success' ? 'text-green-500' : 'text-red-500'}`}>
                    {h.status} · {h.duration_ms}ms · {formatDistanceToNow(new Date(h.created_at), { addSuffix: true })}
                  </span>
                </div>
                <pre className="text-xs bg-muted/30 p-2 rounded overflow-x-auto max-h-32"><code>{h.code_snippet.slice(0, 300)}</code></pre>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { SEO } from '@/components/SEO';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Star, Copy, Play, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface GistView {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  content: string;
  language: string;
  view_count: number;
  user_id: string;
  created_at: string;
}

interface AuthorProfile {
  display_name: string | null;
  avatar_url: string | null;
  website: string | null;
  bio: string | null;
}

export default function Gist() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [gist, setGist] = useState<GistView | null>(null);
  const [author, setAuthor] = useState<AuthorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [starred, setStarred] = useState(false);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data } = await supabase.from('gists').select('*').eq('slug', slug).maybeSingle();
      if (!data) { setLoading(false); return; }
      setGist(data as GistView);
      // Bump view count (best-effort)
      await supabase.from('gists').update({ view_count: (data.view_count ?? 0) + 1 }).eq('id', data.id);

      const { data: prof } = await supabase.from('profiles').select('display_name, avatar_url, website, bio').eq('user_id', data.user_id).maybeSingle();
      if (prof) setAuthor(prof as AuthorProfile);

      if (user) {
        const { data: star } = await supabase.from('starred_snippets').select('id').eq('user_id', user.id).eq('gist_id', data.id).maybeSingle();
        setStarred(!!star);
      }
      setLoading(false);
    })();
  }, [slug, user]);

  const toggleStar = async () => {
    if (!user) { navigate('/auth'); return; }
    if (!gist) return;
    if (starred) {
      await supabase.from('starred_snippets').delete().eq('user_id', user.id).eq('gist_id', gist.id);
      setStarred(false);
    } else {
      await supabase.from('starred_snippets').insert({ user_id: user.id, gist_id: gist.id });
      setStarred(true);
    }
  };

  const openInIDE = () => {
    if (!gist) return;
    sessionStorage.setItem('sdev:imported_code', gist.content);
    sessionStorage.setItem('sdev:imported_name', gist.title);
    navigate('/ide');
  };

  const copyCode = () => {
    if (!gist) return;
    navigator.clipboard.writeText(gist.content);
    toast.success('Code copied');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>;
  if (!gist) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <p className="text-muted-foreground">Gist not found.</p>
      <Link to="/" className="text-sm underline">Go home</Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <SEO title={`${gist.title} — sdev gist`} description={gist.description || `View and run "${gist.title}", a public sdev code gist shared by the community.`} path={`/g/${gist.slug}`} />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareSourceCode",
          name: gist.title,
          headline: gist.title,
          description: gist.description || `A public sdev code gist: ${gist.title}.`,
          programmingLanguage: gist.language || "sdev",
          codeSampleType: "full solution",
          text: gist.content?.slice(0, 5000),
          dateCreated: gist.created_at,
          url: `https://web.sdev.codes/g/${gist.slug}`,
          mainEntityOfPage: `https://web.sdev.codes/g/${gist.slug}`,
          author: { "@type": "Organization", name: "sdev" },
          publisher: { "@type": "Organization", name: "sdev" }
        })}</script>
      </Helmet>
      <header className="border-b border-border/50">
        <div className="container max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold tracking-tight">{gist.title}</h1>
        {gist.description && <p className="text-muted-foreground mt-2">{gist.description}</p>}
        <div className="flex items-center gap-3 mt-4">
          {author?.avatar_url ? (
            <img src={author.avatar_url} alt={author.display_name || 'author'} className="h-10 w-10 rounded-full object-cover border border-border/50" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          ) : (
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-neon-cyan to-neon-violet flex items-center justify-center text-xs font-bold text-background">
              {(author?.display_name || 'A').slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="text-sm">
            <div className="font-medium">{author?.display_name || 'anon'}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <span>{gist.view_count} views</span>
              {author?.website && (
                <>
                  <span>·</span>
                  <a href={author.website} target="_blank" rel="noopener noreferrer" className="hover:text-foreground underline">
                    {author.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                  </a>
                </>
              )}
            </div>
            {author?.bio && <div className="text-xs text-muted-foreground mt-1 max-w-md">{author.bio}</div>}
          </div>
        </div>

        <div className="flex gap-2 my-4">
          <Button onClick={openInIDE}><Play className="h-4 w-4 mr-2" />Open in IDE</Button>
          <Button variant="outline" onClick={copyCode}><Copy className="h-4 w-4 mr-2" />Copy</Button>
          <Button variant={starred ? 'default' : 'outline'} onClick={toggleStar}>
            <Star className={`h-4 w-4 mr-2 ${starred ? 'fill-current' : ''}`} />
            {starred ? 'Starred' : 'Star'}
          </Button>
        </div>

        <Card className="p-0 overflow-hidden">
          <pre className="text-sm font-mono p-4 overflow-x-auto bg-muted/20"><code>{gist.content}</code></pre>
        </Card>
      </main>
    </div>
  );
}

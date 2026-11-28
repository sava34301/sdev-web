import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Star, Copy, Play, ExternalLink, Link2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { SEO } from '@/components/SEO';
import { SiteNav } from '@/components/site/SiteNav';
import { SiteFooter } from '@/components/site/SiteFooter';
import { CanvasPanel } from '@/components/CanvasPanel';
import { WebPreviewPanel } from '@/components/ide/WebPreviewPanel';
import { SdevCode } from '@/components/home/SdevCode';
import { openInIde, runSdev, type RunResult } from '@/components/home/engine';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

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
  const [authorHandle, setAuthorHandle] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [starred, setStarred] = useState(false);
  const [res, setRes] = useState<RunResult | null>(null);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data } = await supabase.from('gists').select('*').eq('slug', slug).maybeSingle();
      if (!data) { setLoading(false); return; }
      setGist(data as GistView);
      await supabase.from('gists').update({ view_count: (data.view_count ?? 0) + 1 }).eq('id', data.id);

      const { data: prof } = await supabase.from('profiles').select('display_name, avatar_url, website, bio').eq('user_id', data.user_id).maybeSingle();
      if (prof) setAuthor(prof as AuthorProfile);

      const { data: handleRow } = await supabase.from('usernames').select('username').eq('user_id', data.user_id).maybeSingle();
      setAuthorHandle(handleRow?.username ?? null);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <SiteNav />
        <div className="wrap py-32 flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="animate-spin h-5 w-5" /> Loading shared program…
        </div>
      </div>
    );
  }

  if (!gist) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <SiteNav />
        <main className="wrap flex-1 py-28 text-center">
          <p className="label">404 — Shared program</p>
          <h1 className="mt-4 font-display text-5xl font-extrabold">This share link does not exist.</h1>
          <p className="mt-3 text-muted-foreground">It may have been removed by its author.</p>
          <div className="mt-8 flex justify-center gap-3">
            <Link to="/explore" className="btn-ink">Browse community</Link>
            <Link to="/" className="btn-line">Back home</Link>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const linesCount = gist.content.split('\n').length;

  return (
    <div className="min-h-screen bg-background text-foreground" data-testid="gist-page">
      <SEO title={`${gist.title} — sdev gist`} description={gist.description || `View and run "${gist.title}", a public sdev code gist shared by the community.`} path={`/g/${gist.slug}`} />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'SoftwareSourceCode',
          name: gist.title,
          headline: gist.title,
          description: gist.description || `A public sdev code gist: ${gist.title}.`,
          programmingLanguage: gist.language || 'sdev',
          codeSampleType: 'full solution',
          text: gist.content?.slice(0, 5000),
          dateCreated: gist.created_at,
          url: `https://web.sdev.codes/g/${gist.slug}`,
          mainEntityOfPage: `https://web.sdev.codes/g/${gist.slug}`,
          author: { '@type': 'Organization', name: 'sdev' },
          publisher: { '@type': 'Organization', name: 'sdev' },
        })}</script>
      </Helmet>
      <SiteNav />

      <main className="wrap pt-12 pb-24">
        <div className="flex items-center justify-between border-b border-foreground/15 pb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          <Link to="/explore" className="inline-flex items-center gap-1.5 hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Community showcase
          </Link>
          <span>/g/{gist.slug} · {gist.view_count} views</span>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <h1 className="font-display text-4xl font-extrabold leading-[0.98] tracking-[-0.035em] sm:text-5xl">{gist.title}</h1>
            {gist.description && <p className="mt-4 max-w-2xl text-muted-foreground">{gist.description}</p>}
            <div className="mt-6 flex items-center gap-3">
              {author?.avatar_url ? (
                <img src={author.avatar_url} alt={author.display_name || 'author'} className="h-10 w-10 rounded-full object-cover border border-border" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
              ) : (
                <div className="grid h-10 w-10 place-items-center rounded-full bg-foreground font-display text-xs font-bold text-[hsl(var(--lime))]">
                  {(author?.display_name || authorHandle || 'S').slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="text-sm">
                <div className="font-medium">
                  {author?.display_name || (authorHandle ? `@${authorHandle}` : 'sdev author')}
                  {authorHandle && author?.display_name && <span className="ml-2 font-mono text-xs text-muted-foreground">@{authorHandle}</span>}
                </div>
                <div className="font-mono text-xs text-muted-foreground">
                  {linesCount} lines · shared {new Date(gist.created_at).toLocaleDateString()}
                  {author?.website && (
                    <> · <a href={author.website} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">{author.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</a></>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 flex flex-wrap gap-2 lg:justify-end">
            <button data-testid="gist-run" onClick={() => setRes(runSdev(gist.content))} className="btn-ink !h-10">
              <Play className="h-4 w-4" /> {res ? 'Run again' : 'Run program'}
            </button>
            <button data-testid="gist-open-ide" onClick={() => openInIde(gist.content, gist.title, navigate)} className="btn-line !h-10">
              <ExternalLink className="h-4 w-4" /> Open in IDE
            </button>
            <button
              onClick={toggleStar}
              className={`btn-line !h-10 !px-4 ${starred ? 'border-foreground bg-[hsl(var(--lime))] text-[hsl(var(--ink))]' : ''}`}
            >
              <Star className={`h-4 w-4 ${starred ? 'fill-current' : ''}`} /> {starred ? 'Starred' : 'Star'}
            </button>
          </div>
        </div>

        {res && (
          <section data-testid="gist-output" className="mt-8 overflow-hidden rounded-2xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <span className="label">Live execution</span>
              <span className="font-mono text-xs text-muted-foreground">{res.ms.toFixed(2)} ms · real interpreter</span>
            </div>
            {res.web?.produced && (
              <div className="border-b border-border bg-white text-[#13161b]">
                <div className="h-80 [&>*]:h-full"><WebPreviewPanel state={res.web} /></div>
              </div>
            )}
            {res.commands.length > 0 && (
              <div className="flex justify-center bg-[#0e100f] p-4 [&_canvas]:max-w-full [&_canvas]:h-auto">
                <CanvasPanel commands={res.commands} />
              </div>
            )}
            {(res.lines.length > 0 || res.error || (!res.web?.produced && res.commands.length === 0)) && (
              <div className="ink p-5 font-mono text-[13px] leading-6">
                {res.lines.map((l, i) => <p key={i}>› {l}</p>)}
                {!res.error && res.lines.length === 0 && res.commands.length === 0 && !res.web?.produced && (
                  <p className="text-muted-foreground">✓ Program finished with no console output.</p>
                )}
                {res.error && <p className="text-[#ff8a7a]">{res.error}</p>}
              </div>
            )}
          </section>
        )}

        <section className="ink mt-8 overflow-hidden rounded-2xl border border-border">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <span className="font-mono text-xs text-muted-foreground">{gist.title.endsWith('.sdev') ? gist.title : `${gist.title}.sdev`}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success('Share link copied'); }}
                className="inline-flex h-7 items-center gap-1.5 rounded px-2.5 font-mono text-xs text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
              >
                <Link2 className="h-3.5 w-3.5" /> Share URL
              </button>
              <button
                onClick={() => { navigator.clipboard.writeText(gist.content); toast.success('Code copied'); }}
                className="inline-flex h-7 items-center gap-1.5 rounded px-2.5 font-mono text-xs text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
              >
                <Copy className="h-3.5 w-3.5" /> Copy code
              </button>
            </div>
          </div>
          <SdevCode code={gist.content} numbered className="p-5" />
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

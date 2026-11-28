import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { SEO } from '@/components/SEO';
import { SiteNav } from '@/components/site/SiteNav';
import { SiteFooter } from '@/components/site/SiteFooter';

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error('404 Error: User attempted to access non-existent route:', location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col" data-testid="not-found-page">
      <SEO title="Page not found — sdev" description="The page you're looking for doesn't exist. Return to sdev to explore the language, IDE, and documentation." path="/404" />
      <SiteNav />

      <main className="wrap flex-1 py-20 sm:py-28 flex flex-col justify-center">
        <p className="label">§ 404 — Route not found</p>
        <h1 className="mt-4 font-display text-6xl font-extrabold leading-[0.92] tracking-[-0.045em] sm:text-8xl">
          Nothing lives at <span className="serif-i font-normal text-primary">this path.</span>
        </h1>
        <p className="mt-5 font-mono text-sm text-muted-foreground">
          Requested: <code className="rounded border border-border bg-card px-2 py-0.5 text-foreground">{location.pathname}</code>
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link to="/" className="btn-ink">Back home <ArrowRight className="h-4 w-4" /></Link>
          <Link to="/ide" className="btn-line">Open the IDE</Link>
          <Link to="/docs" className="btn-line">Documentation</Link>
          <Link to="/explore" className="btn-line">Community</Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
};

export default NotFound;

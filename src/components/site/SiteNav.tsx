import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { SdevMark } from './SdevMark';

export const SITE_LINKS = [
  { to: '/docs', label: 'Docs' },
  { to: '/dialects', label: 'Dialects' },
  { to: '/libraries', label: 'Libraries' },
  { to: '/extensions', label: 'Extensions' },
  { to: '/explore', label: 'Community' },
];

export function SiteNav() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const auth = useAuthContext();
  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <header data-testid="site-nav" className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="wrap flex h-16 items-center gap-8">
        <Link to="/" data-testid="site-nav-logo" className="flex items-center gap-2.5">
          <SdevMark size={28} />
          <span className="font-display text-[19px] font-bold tracking-tight">sdev</span>
        </Link>
        <nav className="hidden lg:flex items-center gap-1" aria-label="Main">
          {SITE_LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} data-testid={`site-nav-${l.label.toLowerCase()}`}
              className={({ isActive }) => `px-3 py-2 text-sm rounded-full transition-colors ${isActive ? 'bg-foreground/[0.06] text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto hidden lg:flex items-center gap-2">
          <Link to={auth?.user ? '/account' : '/auth'} data-testid="site-nav-account" className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground">
            {auth?.user ? 'Account' : 'Sign in'}
          </Link>
          <Link to="/ide" data-testid="site-nav-open-ide" className="btn-ink !h-10">Open IDE <ArrowUpRight className="h-4 w-4" /></Link>
        </div>
        <button data-testid="site-nav-menu" aria-label="Menu" onClick={() => setOpen((o) => !o)} className="ml-auto lg:hidden grid h-10 w-10 place-items-center rounded-full border border-border">
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>
      {open && (
        <div data-testid="site-nav-mobile" className="lg:hidden border-t border-border bg-background">
          <div className="wrap py-6 flex flex-col">
            {SITE_LINKS.map((l) => (
              <Link key={l.to} to={l.to} className="py-3 font-display text-3xl font-bold border-b border-border">{l.label}</Link>
            ))}
            <div className="mt-6 flex gap-3">
              <Link to="/ide" className="btn-ink">Open IDE <ArrowUpRight className="h-4 w-4" /></Link>
              <Link to={auth?.user ? '/account' : '/auth'} className="btn-line">{auth?.user ? 'Account' : 'Sign in'}</Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

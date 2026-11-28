import { Link } from 'react-router-dom';
import { SdevMark } from './SdevMark';
import releaseInfo from '../../../release.json';

const COLS: { h: string; l: [string, string][] }[] = [
  { h: 'Build', l: [['Web IDE', '/ide'], ['Command line', '/downloads/sdev.mjs'], ['VS Code extension', '/downloads/sdev-language.vsix'], ['WebAssembly seed', '/downloads/sdev-seed.wasm']] },
  { h: 'Learn', l: [['Documentation', '/docs'], ['The sdev Book (EN)', '/sdev-book-en.pdf'], ['Книгата за sdev (BG)', '/sdev-book-bg.pdf'], ['Self-hosting guide', '/docs/self-hosting-design-guide']] },
  { h: 'Ecosystem', l: [['Dialects', '/dialects'], ['Libraries', '/libraries'], ['Extensions', '/extensions'], ['Community', '/explore'], ['My sdev', '/my']] },
  { h: 'Account & Legal', l: [['Sign in', '/auth'], ['Account', '/account'], ['Privacy', '/privacy'], ['Terms', '/terms']] },
];

export function SiteFooter() {
  return (
    <footer data-testid="site-footer" className="ink border-t border-border">
      <div className="wrap pt-20 pb-10">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-4">
            <Link to="/" className="inline-flex items-center gap-3"><SdevMark size={32} /><span className="font-display text-2xl font-bold">sdev</span></Link>
            <p className="mt-5 max-w-xs text-sm text-muted-foreground leading-relaxed">A self-hosting programming language. Write in plain words, run it in the browser or as a native program.</p>
            <p className="mt-8 inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 font-mono text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--lime))]" /> v{releaseInfo.version} · one version for IDE, CLI, VS Code & desktop
            </p>
          </div>
          {COLS.map((c) => (
            <div key={c.h} className="md:col-span-2">
              <p className="label mb-4">{c.h}</p>
              <ul className="space-y-2.5">
                {c.l.map(([label, href]) => (
                  <li key={label}>
                    {href.includes('.') ? <a href={href} className="text-sm text-foreground/80 hover:text-[hsl(var(--lime))] transition-colors">{label}</a>
                      : <Link to={href} className="text-sm text-foreground/80 hover:text-[hsl(var(--lime))] transition-colors">{label}</Link>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p aria-hidden="true" className="mt-20 select-none font-display font-extrabold leading-[0.78] tracking-[-0.06em] text-[26vw] md:text-[19vw] text-foreground/[0.07]">sdev</p>
        <div className="mt-6 flex flex-col gap-2 border-t border-border pt-6 font-mono text-xs text-muted-foreground sm:flex-row sm:justify-between">
          <span>Free and open source.</span>
          <span>Compiled by itself, byte for byte.</span>
        </div>
      </div>
    </footer>
  );
}

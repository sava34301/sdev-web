import { Link } from 'react-router-dom';
import { SEO } from '@/components/SEO';
import { SiteNav } from '@/components/site/SiteNav';
import { SiteFooter } from '@/components/site/SiteFooter';

const TOC = [
  ['intro', '1. Introduction'],
  ['collect', '2. Information We Collect'],
  ['use', '3. How We Use Information'],
  ['share', '4. Information Sharing'],
  ['security', '5. Data Security'],
  ['retention', '6. Data Retention'],
  ['rights', '7. Your Rights & Choices'],
  ['children', "8. Children's Privacy"],
  ['links', '9. Third-Party Links'],
  ['changes', '10. Policy Updates'],
  ['contact', '11. Contact Us'],
] as const;

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background text-foreground" data-testid="privacy-page">
      <SEO
        title="Privacy Policy — sdev"
        description="sdev Privacy Policy. Learn how we collect, use, and protect your data."
        path="/privacy"
      />
      <SiteNav />

      <section className="wrap pt-14 sm:pt-20">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-foreground/15 pb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          <span>Legal · Privacy</span>
          <span>Last updated: June 2, 2026</span>
        </div>
        <div className="mt-10 flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="font-display text-5xl font-extrabold leading-[0.95] tracking-[-0.04em] sm:text-6xl">
              Privacy <span className="serif-i font-normal text-primary">policy.</span>
            </h1>
            <p className="mt-4 max-w-xl text-muted-foreground">
              Plain-language details on what sdev stores locally in your browser versus in your optional cloud account, and how we protect your data.
            </p>
          </div>
          <div className="flex gap-2">
            <span className="btn-ink !h-9 !px-4 !text-xs pointer-events-none">Privacy</span>
            <Link to="/terms" className="btn-line !h-9 !px-4 !text-xs">Terms of Service</Link>
          </div>
        </div>
      </section>

      <div className="wrap grid gap-12 py-14 pb-24 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <nav aria-label="Privacy sections" className="sticky top-24 space-y-1">
            <p className="label mb-3">Sections</p>
            {TOC.map(([id, label]) => (
              <a key={id} href={`#${id}`} className="block border-l-2 border-foreground/10 py-1.5 pl-3 text-[13px] text-muted-foreground hover:border-primary hover:text-foreground transition-colors">
                {label}
              </a>
            ))}
          </nav>
        </aside>

        <article className="reader max-w-[70ch]">
          <h2 id="intro">1. Introduction</h2>
          <p>
            sdev (“we,” “our,” or “us”) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website (<code>sdev.codes</code>), use our browser IDE, documentation, cloud services, CLI, or any other products or services we offer (collectively, the “Services”).
          </p>
          <p>
            By using our Services, you agree to the collection and use of information in accordance with this Privacy Policy. The sdev compiler, WebAssembly runtime, and browser IDE work locally in your browser without requiring an account.
          </p>

          <h2 id="collect">2. Information We Collect</h2>
          <h3>2.1 Personal Information</h3>
          <p>We collect personal information that you voluntarily provide when you:</p>
          <ul>
            <li>Register for an account (email address, username handle, display name)</li>
            <li>Save workspace files to the cloud or publish dialects, extensions, libraries, or gists</li>
            <li>Contact us for support or submit core-language proposals</li>
          </ul>

          <h3>2.2 Usage Data</h3>
          <p>We may automatically collect minimal operational telemetry when you access hosted Services, including:</p>
          <ul>
            <li>Device and browser type, version, and operating system</li>
            <li>IP address and coarse country/region information</li>
            <li>Pages viewed, navigation paths, and error diagnostics</li>
          </ul>

          <h3>2.3 Local Storage & Cookies</h3>
          <p>
            We use browser localStorage and session cookies to persist your IDE workspace files, active dialect, theme preferences, and authentication session. You can clear local storage or refuse cookies in your browser settings at any time.
          </p>

          <h2 id="use">3. How We Use Your Information</h2>
          <p>We use collected information solely to:</p>
          <ul>
            <li>Operate, maintain, and improve the sdev IDE, package registry, and documentation</li>
            <li>Authenticate accounts and synchronize cloud-saved files</li>
            <li>Attribute published libraries, dialects, extensions, and shared gists under your chosen <code>@handle</code></li>
            <li>Prevent abuse, spam, and security incidents, and comply with legal obligations</li>
          </ul>

          <h2 id="share">4. How We Share Your Information</h2>
          <p>We never sell or rent your personal information. Information is shared only in these cases:</p>
          <ul>
            <li><strong>Public Registry & Gists:</strong> Content you explicitly mark as public (public gists, public dialects, public libraries, or extensions) is readable by other users.</li>
            <li><strong>Infrastructure Providers:</strong> Trusted hosting, database, and authentication providers operating strictly on our behalf.</li>
            <li><strong>Legal Compliance:</strong> When required by applicable law, regulation, or valid legal process.</li>
          </ul>

          <h2 id="security">5. Data Security</h2>
          <p>
            We implement technical and organizational safeguards — including TLS encryption in transit and row-level access controls on user data — to protect your personal information against unauthorized access, alteration, or destruction.
          </p>

          <h2 id="retention">6. Data Retention</h2>
          <p>
            We retain account and cloud-stored files for as long as your account remains active or as needed to provide the Services. You may delete individual cloud files, dialects, extensions, or gists at any time from your dashboard.
          </p>

          <h2 id="rights">7. Your Rights and Choices</h2>
          <p>Depending on your jurisdiction, you have the right to:</p>
          <ul>
            <li><strong>Access & Portability:</strong> Request a copy of your personal data in a machine-readable format.</li>
            <li><strong>Correction:</strong> Update inaccurate profile details directly in your Account page.</li>
            <li><strong>Deletion:</strong> Request deletion of your account and associated personal data.</li>
            <li><strong>Objection & Restriction:</strong> Object to or request restriction of certain processing.</li>
          </ul>

          <h2 id="children">8. Children's Privacy</h2>
          <p>
            Our Services are not directed to children under 13, and we do not knowingly collect personal information from children under 13. If you believe a child has submitted personal data, contact us and we will promptly remove it.
          </p>

          <h2 id="links">9. Third-Party Links</h2>
          <p>
            Our Services may link to external sites (such as GitHub repositories or user-linked personal websites). We are not responsible for the privacy practices of external websites.
          </p>

          <h2 id="changes">10. Policy Updates</h2>
          <p>
            We may update this Privacy Policy periodically. Any changes will be posted on this page with an updated revision date.
          </p>

          <h2 id="contact">11. Contact Us</h2>
          <p>
            Questions or data requests can be sent to <a href="mailto:support@sdev.codes">support@sdev.codes</a>.
          </p>
        </article>
      </div>

      <SiteFooter />
    </div>
  );
}

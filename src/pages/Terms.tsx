import { Link } from 'react-router-dom';
import { SEO } from '@/components/SEO';
import { SiteNav } from '@/components/site/SiteNav';
import { SiteFooter } from '@/components/site/SiteFooter';

const TOC = [
  ['acceptance', '1. Acceptance of Terms'],
  ['eligibility', '2. Eligibility'],
  ['accounts', '3. Accounts & Handles'],
  ['acceptable', '4. Acceptable Use'],
  ['ip', '5. Intellectual Property'],
  ['opensource', '6. Open Source & Licensing'],
  ['cloud', '7. Cloud Storage & Sharing'],
  ['termination', '8. Termination'],
  ['warranties', '9. Disclaimer of Warranties'],
  ['liability', '10. Limitation of Liability'],
  ['indemnification', '11. Indemnification'],
  ['law', '12. Governing Law'],
  ['contact', '13. Contact Us'],
] as const;

export default function Terms() {
  return (
    <div className="min-h-screen bg-background text-foreground" data-testid="terms-page">
      <SEO
        title="Terms of Service — sdev"
        description="sdev Terms of Service. Read the rules and guidelines for using our platform."
        path="/terms"
      />
      <SiteNav />

      <section className="wrap pt-14 sm:pt-20">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-foreground/15 pb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          <span>Legal · Terms</span>
          <span>Last updated: June 2, 2026</span>
        </div>
        <div className="mt-10 flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="font-display text-5xl font-extrabold leading-[0.95] tracking-[-0.04em] sm:text-6xl">
              Terms of <span className="serif-i font-normal text-primary">service.</span>
            </h1>
            <p className="mt-4 max-w-xl text-muted-foreground">
              The ground rules for using the sdev website, browser IDE, package registry, and community sharing tools.
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/privacy" className="btn-line !h-9 !px-4 !text-xs">Privacy Policy</Link>
            <span className="btn-ink !h-9 !px-4 !text-xs pointer-events-none">Terms</span>
          </div>
        </div>
      </section>

      <div className="wrap grid gap-12 py-14 pb-24 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <nav aria-label="Terms sections" className="sticky top-24 space-y-1">
            <p className="label mb-3">Sections</p>
            {TOC.map(([id, label]) => (
              <a key={id} href={`#${id}`} className="block border-l-2 border-foreground/10 py-1.5 pl-3 text-[13px] text-muted-foreground hover:border-primary hover:text-foreground transition-colors">
                {label}
              </a>
            ))}
          </nav>
        </aside>

        <article className="reader max-w-[70ch]">
          <h2 id="acceptance">1. Acceptance of Terms</h2>
          <p>
            Welcome to sdev. By accessing or using our website, browser IDE, documentation, package registry, cloud sync, and related tools (collectively, the “Services”), you agree to be bound by these Terms of Service (“Terms”). If you do not agree, do not use the Services.
          </p>

          <h2 id="eligibility">2. Eligibility</h2>
          <p>
            You must be at least 13 years old to create an account or publish content through our Services. If you use the Services on behalf of an organization, you represent that you are authorized to bind that organization to these Terms.
          </p>

          <h2 id="accounts">3. Accounts and Handles</h2>
          <p>When registering an account or claiming an <code>@handle</code>, you agree to:</p>
          <ul>
            <li>Provide accurate registration information and keep your credentials secure</li>
            <li>Not squat, impersonate others, or claim misleading namespace handles</li>
            <li>Accept responsibility for activity conducted under your account</li>
          </ul>

          <h2 id="acceptable">4. Acceptable Use</h2>
          <p>You agree not to use the Services to:</p>
          <ul>
            <li>Violate applicable laws, regulations, or third-party intellectual property rights</li>
            <li>Upload or distribute malware, abusive scripts, phishing pages, or harmful payloads</li>
            <li>Disrupt, overload, or probe the security boundaries of our infrastructure</li>
            <li>Harass other community members or publish spam in the public registry or showcase</li>
          </ul>

          <h2 id="ip">5. Intellectual Property</h2>
          <h3>5.1 Your Code</h3>
          <p>
            You retain full ownership of all sdev programs, files, dialects, libraries, and gists (“User Content”) that you write, upload, or share. When you publish content publicly, you grant sdev a non-exclusive, worldwide, royalty-free license to host, display, and serve that content so other users can view, run, and install it as intended.
          </p>
          <h3>5.2 Platform Assets</h3>
          <p>
            The sdev name, mark, site design, and hosted service infrastructure remain the property of sdev and its contributors, protected by applicable copyright and trademark laws.
          </p>

          <h2 id="opensource">6. Open Source and Licensing</h2>
          <p>
            Components of the sdev compiler, standard library, CLI, and documentation released under open-source licenses are governed by their respective license files. Documentation code samples may be used freely in your own projects.
          </p>

          <h2 id="cloud">7. Cloud Storage and Sharing</h2>
          <ul>
            <li>Always keep local or version-controlled backups of critical source files (e.g. via IDE Export or GitHub Push).</li>
            <li>Public gists, libraries, dialects, and extensions are accessible to anyone and may appear on the Explore page.</li>
            <li>We may remove content that violates these Terms or applicable law.</li>
          </ul>

          <h2 id="termination">8. Termination</h2>
          <p>
            You may stop using the Services at any time. We reserve the right to suspend or terminate accounts that violate these Terms, abuse platform resources, or pose a security risk.
          </p>

          <h2 id="warranties">9. Disclaimer of Warranties</h2>
          <p>
            THE SERVICES AND COMPILER TOOLCHAIN ARE PROVIDED “AS IS” AND “AS AVAILABLE” WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
          </p>

          <h2 id="liability">10. Limitation of Liability</h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, SDEV AND ITS CONTRIBUTORS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR LOSS OF DATA OR PROFITS, ARISING FROM YOUR USE OF THE SERVICES.
          </p>

          <h2 id="indemnification">11. Indemnification</h2>
          <p>
            You agree to indemnify and hold harmless sdev and its contributors from claims, damages, or expenses arising from your User Content or your breach of these Terms.
          </p>

          <h2 id="law">12. Governing Law & Severability</h2>
          <p>
            These Terms are governed by the laws of the jurisdiction in which sdev operates. If any provision is held invalid, the remaining provisions continue in full force and effect.
          </p>

          <h2 id="contact">13. Contact Us</h2>
          <p>
            Questions about these Terms can be sent to <a href="mailto:support@sdev.codes">support@sdev.codes</a>.
          </p>
        </article>
      </div>

      <SiteFooter />
    </div>
  );
}

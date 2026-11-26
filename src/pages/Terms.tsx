import { SiteNav } from '@/components/site/SiteNav';
import { SEO } from '@/components/SEO';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';

export default function Terms() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <SEO
        title="Terms of Service — sdev"
        description="SDEV Terms of Service. Read the rules and guidelines for using our platform."
        path="/terms"
      />

      <SiteNav />

      <div className="container max-w-4xl mx-auto px-4 py-12">
        <div className="flex items-center gap-3 mb-2">
          <FileText className="h-6 w-6 text-primary" />
          <h1 className="text-4xl font-bold tracking-tight">Terms of Service</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-10">Last updated: June 2, 2026</p>

        <div className="space-y-10 text-foreground/90 leading-relaxed">
          <section>
            <h2 className="text-2xl font-semibold tracking-tight mb-4">1. Acceptance of Terms</h2>
            <p className="mb-3">
              Welcome to SDEV. By accessing or using our website, IDE, documentation, cloud services, and any other products or services we offer (collectively, the "Services"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not access or use the Services.
            </p>
            <p>
              We may modify these Terms at any time. Changes will be effective immediately upon posting. Your continued use of the Services after changes are posted constitutes your acceptance of the revised Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-tight mb-4">2. Eligibility</h2>
            <p>
              You must be at least 13 years old to use our Services. By using the Services, you represent and warrant that you meet this age requirement and that you have the legal capacity to enter into these Terms. If you are using the Services on behalf of an organization, you represent that you have authority to bind that organization to these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-tight mb-4">3. Accounts and Registration</h2>
            <p className="mb-4">
              To access certain features of the Services, you may need to create an account. You agree to:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Provide accurate, current, and complete information during registration</li>
              <li>Maintain and promptly update your account information</li>
              <li>Keep your password secure and confidential</li>
              <li>Notify us immediately of any unauthorized use of your account</li>
              <li>Be responsible for all activities that occur under your account</li>
            </ul>
            <p className="mt-4">
              We reserve the right to suspend or terminate your account if any information provided is inaccurate, false, or incomplete, or if you violate these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-tight mb-4">4. Acceptable Use</h2>
            <p className="mb-4">You agree not to use the Services to:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Violate any applicable laws, regulations, or third-party rights</li>
              <li>Upload, transmit, or distribute malicious code, viruses, or harmful software</li>
              <li>Interfere with or disrupt the integrity or performance of the Services</li>
              <li>Attempt to gain unauthorized access to any part of the Services or related systems</li>
              <li>Scrape, crawl, or otherwise harvest data from the Services without permission</li>
              <li>Impersonate any person or entity, or misrepresent your affiliation</li>
              <li>Harass, abuse, or harm another person or group</li>
              <li>Distribute spam, unsolicited communications, or advertisements</li>
              <li>Use the Services for any illegal or unauthorized purpose</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-tight mb-4">5. Intellectual Property</h2>
            <h3 className="text-lg font-semibold mb-2">5.1 Our Content</h3>
            <p className="mb-4">
              The Services and all content, features, and functionality therein — including but not limited to text, graphics, logos, icons, images, audio clips, software, and code — are owned by SDEV or our licensors and are protected by copyright, trademark, and other intellectual property laws.
            </p>

            <h3 className="text-lg font-semibold mb-2">5.2 Your Content</h3>
            <p className="mb-4">
              You retain ownership of any code, files, gists, or other materials ("User Content") that you create, upload, or share through the Services. By uploading User Content, you grant us a limited, non-exclusive, royalty-free license to use, display, and distribute your User Content solely for the purpose of operating and improving the Services.
            </p>
            <p>
              You represent that you have all necessary rights to your User Content and that its use does not violate any third-party rights.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-tight mb-4">6. Open Source and Licensing</h2>
            <p className="mb-4">
              Portions of the SDEV language, interpreter, and related tools may be released under open-source licenses. When applicable, the specific license terms for such components will be included with the respective software. Open-source components are subject to their own license terms, which govern your use of those specific components.
            </p>
            <p>
              Unless otherwise specified, code examples, snippets, and tutorials provided in our documentation are offered for educational purposes and may be used freely in your own projects.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-tight mb-4">7. Cloud Services and Data Storage</h2>
            <p className="mb-4">
              Our cloud file storage and gist sharing features allow you to save and share code and related content. You understand that:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>We do not guarantee permanent storage or backup of your data</li>
              <li>You are responsible for maintaining backups of important code and files</li>
              <li>Public gists and shared content may be accessible to anyone with the link</li>
              <li>We reserve the right to remove content that violates these Terms or applicable laws</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-tight mb-4">8. Termination</h2>
            <p className="mb-4">
              We may suspend or terminate your access to the Services at any time, with or without cause, and with or without notice, including for:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Violation of these Terms</li>
              <li>Conduct that we believe is harmful to other users or the Services</li>
              <li>Requests by law enforcement or government agencies</li>
              <li>Extended periods of inactivity</li>
              <li>Technical issues or security concerns</li>
            </ul>
            <p className="mt-4">
              Upon termination, your right to use the Services will immediately cease. Provisions of these Terms that by their nature should survive termination will survive.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-tight mb-4">9. Disclaimer of Warranties</h2>
            <p>
              THE SERVICES ARE PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. TO THE FULLEST EXTENT PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICES WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-tight mb-4">10. Limitation of Liability</h2>
            <p>
              TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL SDEV, ITS FOUNDERS, EMPLOYEES, OR AFFILIATES BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR GOODWILL, ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF THE SERVICES, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID US (IF ANY) IN THE PAST TWELVE MONTHS.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-tight mb-4">11. Indemnification</h2>
            <p>
              You agree to indemnify, defend, and hold harmless SDEV and its officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, and expenses (including reasonable legal fees) arising out of or in connection with your use of the Services, your User Content, or your violation of these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-tight mb-4">12. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which SDEV operates, without regard to its conflict of law provisions. Any disputes arising under these Terms shall be subject to the exclusive jurisdiction of the courts in that jurisdiction.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-tight mb-4">13. Severability</h2>
            <p>
              If any provision of these Terms is found to be unenforceable or invalid, that provision shall be limited or eliminated to the minimum extent necessary so that the Terms otherwise remain in full force and effect.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-tight mb-4">14. Entire Agreement</h2>
            <p>
              These Terms, together with our Privacy Policy, constitute the entire agreement between you and SDEV regarding the use of the Services and supersede any prior agreements, communications, or proposals.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-tight mb-4">15. Contact Us</h2>
            <p>
              If you have any questions about these Terms, please contact us at <a href="mailto:support@sdev.codes" className="text-primary underline hover:text-primary/90">support@sdev.codes</a>.
            </p>
          </section>
        </div>
      </div>

      <footer className="border-t border-border/50 mt-12">
        <div className="container max-w-4xl mx-auto px-4 py-6 text-sm text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-4">
          <span> SDEV. All rights reserved.</span>
          <div className="flex gap-6">
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

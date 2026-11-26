import { SiteNav } from '@/components/site/SiteNav';
import { SEO } from '@/components/SEO';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';

export default function Privacy() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <SEO
        title="Privacy Policy — sdev"
        description="SDEV Privacy Policy. Learn how we collect, use, and protect your data."
        path="/privacy"
      />

      <SiteNav />

      <div className="container max-w-4xl mx-auto px-4 py-12">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-4xl font-bold tracking-tight">Privacy Policy</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-10">Last updated: June 2, 2026</p>

        <div className="space-y-10 text-foreground/90 leading-relaxed">
          <section>
            <h2 className="text-2xl font-semibold tracking-tight mb-4">1. Introduction</h2>
            <p className="mb-3">
              SDEV (“we,” “our,” or “us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website ("sdev.codes"), use our IDE, documentation, cloud services, or any other products or services we offer (collectively, the "Services").
            </p>
            <p>
              By using our Services, you agree to the collection and use of information in accordance with this Privacy Policy. If you do not agree with this policy, please do not use our Services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-tight mb-4">2. Information We Collect</h2>
            <h3 className="text-lg font-semibold mb-2">2.1 Personal Information</h3>
            <p className="mb-4">
              We may collect personal information that you voluntarily provide to us when you:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Register for an account (email address, display name)</li>
              <li>Use our cloud file storage or gist sharing features</li>
              <li>Contact us for support or feedback</li>
              <li>Participate in surveys, promotions, or community events</li>
            </ul>

            <h3 className="text-lg font-semibold mt-6 mb-2">2.2 Usage Data</h3>
            <p className="mb-4">
              We automatically collect certain information when you visit, use, or navigate our Services. This information does not reveal your specific identity but may include:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Device and browser information (type, version, operating system)</li>
              <li>IP address and general location (country/region level)</li>
              <li>Pages viewed, time spent, navigation paths</li>
              <li>Referral source (how you found our site)</li>
              <li>Error logs and performance metrics</li>
            </ul>

            <h3 className="text-lg font-semibold mt-6 mb-2">2.3 Cookies and Similar Technologies</h3>
            <p>
              We use cookies and similar tracking technologies to collect and store information about your preferences and interactions with our Services. You can set your browser to refuse all cookies or to indicate when a cookie is being sent. However, some features of our Services may not function properly without cookies.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-tight mb-4">3. How We Use Your Information</h2>
            <p className="mb-4">We use the information we collect for various purposes, including:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Providing, operating, and maintaining our Services</li>
              <li>Authenticating users and managing accounts</li>
              <li>Personalizing your experience (language, theme preferences)</li>
              <li>Improving our Services, features, and user experience</li>
              <li>Analyzing usage patterns and trends</li>
              <li>Communicating with you (updates, security alerts, support responses)</li>
              <li>Preventing fraud, abuse, and security incidents</li>
              <li>Complying with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-tight mb-4">4. How We Share Your Information</h2>
            <p className="mb-4">
              We do not sell or rent your personal information to third parties. We may share your information only in the following circumstances:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><strong>Service Providers:</strong> We may share data with trusted third-party vendors who perform services on our behalf (e.g., hosting, analytics, email delivery).</li>
              <li><strong>Legal Requirements:</strong> We may disclose information if required by law, regulation, or legal process, or to protect our rights, property, or safety.</li>
              <li><strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction.</li>
              <li><strong>With Your Consent:</strong> We may share information with your explicit permission.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-tight mb-4">5. Data Security</h2>
            <p>
              We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet or electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your data, we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-tight mb-4">6. Data Retention</h2>
            <p>
              We retain your personal information only for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law. When we no longer need your data, we will securely delete or anonymize it.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-tight mb-4">7. Your Rights and Choices</h2>
            <p className="mb-4">Depending on your location, you may have the following rights regarding your personal information:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><strong>Access:</strong> Request a copy of the personal data we hold about you.</li>
              <li><strong>Correction:</strong> Request that we correct inaccurate or incomplete information.</li>
              <li><strong>Deletion:</strong> Request that we delete your personal data, subject to certain exceptions.</li>
              <li><strong>Restriction:</strong> Request that we limit the processing of your data.</li>
              <li><strong>Portability:</strong> Request a copy of your data in a structured, machine-readable format.</li>
              <li><strong>Objection:</strong> Object to the processing of your data for certain purposes.</li>
            </ul>
            <p className="mt-4">
              To exercise any of these rights, please contact us. We will respond to your request within the timeframe required by applicable law.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-tight mb-4">8. Children's Privacy</h2>
            <p>
              Our Services are not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us, and we will promptly delete such information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-tight mb-4">9. Third-Party Links</h2>
            <p>
              Our Services may contain links to third-party websites or services that are not owned or controlled by us. We are not responsible for the privacy practices of these third parties. We encourage you to review the privacy policies of any third-party sites you visit.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-tight mb-4">10. Changes to This Privacy Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date. You are advised to review this Privacy Policy periodically for any changes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-tight mb-4">11. Contact Us</h2>
            <p>
              If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us at <a href="mailto:support@sdev.codes" className="text-primary underline hover:text-primary/90">support@sdev.codes</a>.
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

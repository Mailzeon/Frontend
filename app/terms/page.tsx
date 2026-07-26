import { Zap } from 'lucide-react';
import Link from 'next/link';

export const metadata = { title: 'Terms & Conditions' };

// Always fetch fresh — this page quotes the live minimum order amount and
// commission %, so it must never be statically cached at build time (same
// reasoning as the pricing page).
export const revalidate = 0;

interface PublicSettings {
  minimumOrderAmount: number;
  platformCommissionRate: number;
}

const DEFAULTS: PublicSettings = { minimumOrderAmount: 15, platformCommissionRate: 15 };

async function getSettings(): Promise<PublicSettings> {
  try {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    const res = await fetch(`${base}/settings/public`, { cache: 'no-store' });
    const json = await res.json();
    if (json.success) return json.data;
  } catch {
    // Fall through to defaults — this is a public compliance page, so it
    // should never hard-fail just because the settings fetch failed.
  }
  return DEFAULTS;
}

export default async function TermsPage() {
  const { minimumOrderAmount, platformCommissionRate } = await getSettings();
  const workerShare = 100 - platformCommissionRate;

  return (
    <div className="min-h-screen bg-[#0B1120] p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <Link href="/login" className="flex items-center gap-2 w-fit">
          <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-white">Mailzeon</span>
        </Link>

        <div>
          <h1 className="text-3xl font-bold text-white">Terms & Conditions</h1>
          <p className="text-gray-500 text-sm mt-2">Last updated: July 2026</p>
        </div>

        <div className="glass-card p-6 md:p-8 space-y-6 text-gray-300 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mb-2">1. About Mailzeon</h2>
            <p>
              Mailzeon ("we", "us", "the Platform") is an online marketplace that connects Customers who need
              an online account created with a specific email address to independent Workers who complete this
              task in exchange for payment. By creating an account or using the Platform, you agree to these
              Terms & Conditions.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">2. Who Can Use the Platform</h2>
            <p>
              You must be at least 18 years old to register as a Customer, Worker, or in any other role on
              Mailzeon. You are responsible for maintaining the confidentiality of your account credentials.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">3. How Orders Work</h2>
            <p>
              A Customer creates an order by specifying the service required and paying the order amount
              (minimum ₹{minimumOrderAmount}) through our payment partner. Once payment is confirmed, the order becomes visible
              to Workers on the Platform. A Worker accepts the order, completes the task within the required
              time window, and submits the account details back to the Customer through the Platform.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">4. Platform Commission</h2>
            <p>
              Mailzeon retains a platform commission of {platformCommissionRate}% of the order amount. The remaining {workerShare}% is credited
              to the Worker's wallet once the order is confirmed complete by the Customer, or automatically
              after the applicable auto-completion period.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">5. Payments</h2>
            <p>
              All payments on Mailzeon are processed securely through our third-party payment gateway partner.
              Mailzeon does not store your card, UPI, or net banking credentials at any point.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">6. Disputes</h2>
            <p>
              If a Customer is unable to access the account created for them, they may raise a dispute through
              the order page. Mailzeon's admin team reviews such disputes and determines the outcome, which may
              result in the order being completed (Worker paid) or cancelled (Customer eligible for a refund),
              at Mailzeon's sole discretion, based on the evidence available.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">7. Prohibited Use</h2>
            <p>
              You may not use Mailzeon for any unlawful purpose, to create accounts intended for fraud, spam,
              or abuse, or to violate the terms of service of any third-party platform. Mailzeon reserves the
              right to suspend or terminate any account found violating these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">8. Limitation of Liability</h2>
            <p>
              Mailzeon acts solely as a marketplace connecting Customers and Workers. We are not responsible
              for the ultimate use of any account created through the Platform, nor for third-party platform
              policies that may affect accounts created via Mailzeon.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">9. Changes to These Terms</h2>
            <p>
              We may update these Terms from time to time. Continued use of the Platform after changes are
              posted constitutes acceptance of the revised Terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">10. Contact</h2>
            <p>
              For any questions about these Terms, contact us at{' '}
              <a href="mailto:admin@mailzeon.com" className="text-purple-400 hover:text-purple-300">
                admin@mailzeon.com
              </a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

import { Zap } from 'lucide-react';
import Link from 'next/link';

export const metadata = { title: 'Refunds & Cancellations' };

export default function RefundPolicyPage() {
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
          <h1 className="text-3xl font-bold text-white">Refunds & Cancellations</h1>
          <p className="text-gray-500 text-sm mt-2">Last updated: July 2026</p>
        </div>

        <div className="glass-card p-6 md:p-8 space-y-6 text-gray-300 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mb-2">1. Order Cancellation (Before Acceptance)</h2>
            <p>
              A Customer may cancel an order at any time while it is still "Pending" — i.e. before any Worker
              has accepted it. Since no service has been rendered at this stage, cancelling here does not
              currently qualify for the dispute-refund process described below; the order simply moves to a
              cancelled status.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">2. Reporting a Problem</h2>
            <p>
              Once a Worker has submitted account details, if the Customer is unable to log in, finds the
              credentials incorrect, or the account is otherwise not usable, the Customer can report the
              problem directly from the order page. This places the order under admin review.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">3. Admin Review & Outcome</h2>
            <p>
              Our admin team reviews every reported issue. Based on the evidence available, the order is
              resolved in one of two ways:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong className="text-white">In the Customer's favor</strong> — the order is cancelled and the Customer becomes eligible to request a refund.</li>
              <li><strong className="text-white">In the Worker's favor</strong> — the order is marked complete and the Worker is paid, if the admin determines the account was delivered correctly.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">4. How Refunds Are Processed</h2>
            <p>
              If your dispute is resolved in your favor, you can submit a refund request directly from the
              cancelled order's page by providing your UPI ID. Our team manually verifies and processes the
              transfer. Refunds are typically completed within <strong className="text-white">24–48 hours</strong> of
              the request being submitted, and you will see a "Refunded Successfully" status on the order once done.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">5. Refund Method</h2>
            <p>
              All refunds are transferred directly to the UPI ID provided by the Customer at the time of the
              refund request. We do not process refunds back to the original card/net banking source at this time.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">6. Non-Refundable Situations</h2>
            <p>
              Orders that are completed successfully (Customer confirmed login, or auto-completed after the
              standard waiting period without a reported issue) are not eligible for a refund.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">7. Contact for Refund Queries</h2>
            <p>
              For any questions about a pending refund, email us at{' '}
              <a href="mailto:admin@mailzeon.com" className="text-purple-400 hover:text-purple-300">
                admin@mailzeon.com
              </a>{' '}
              with your Order ID.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

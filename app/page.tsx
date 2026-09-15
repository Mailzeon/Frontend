import Link from 'next/link';
import {
  ShieldCheck, Zap, Package, Wallet, MessageCircle,
  CheckCircle2, ArrowRight, Users, Lock,
} from 'lucide-react';
import { Footer } from '@/components/shared/Footer';

// Public marketing homepage. Previously "/" just did redirect('/login') —
// meaning every ad click, DM link, or social share sent a first-time
// visitor straight into a bare login form with zero explanation of what
// Mailzeon even is. This page is what a cold visitor now sees instead;
// middleware.ts still sends an already-logged-in visitor straight to their
// dashboard, so this never gets in an existing user's way.
//
// Fetches live settings (minimumOrderAmount, platformCommissionRate) the
// same way app/pricing/page.tsx does, so the numbers shown here can never
// drift out of sync with what admin has actually configured.
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
    // Fall through to defaults — this is a public marketing page, so it
    // should never hard-fail just because the settings fetch failed.
  }
  return DEFAULTS;
}

const DOMAINS = ['Gmail', 'Outlook', 'Yahoo', 'iCloud', 'ProtonMail', 'Zoho', 'AOL', 'GMX', '+ more'];

export default async function HomePage() {
  const { minimumOrderAmount, platformCommissionRate } = await getSettings();

  return (
    <div className="relative min-h-screen bg-[#08080D] overflow-hidden">
      {/* Ambient glow — same decorative treatment as the login/register hero */}
      <div className="ambient-glow w-[36rem] h-[36rem] -top-48 -left-40" />
      <div className="ambient-glow w-[28rem] h-[28rem] top-[40rem] -right-32" style={{ animationDelay: '3s' }} />

      <div className="relative max-w-5xl mx-auto px-4 md:px-8 pt-8 pb-16">

        {/* ── Nav ── */}
        <nav className="flex items-center justify-between mb-16 md:mb-24">
          <div className="flex items-center gap-2">
            <img src="/icon-192.png" alt="Mailzeon" className="w-9 h-9 rounded-xl" />
            <span className="font-bold text-white text-lg">Mailzeon</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-gray-300 hover:text-white font-medium px-3 py-2">
              Sign In
            </Link>
            <Link
              href="/register"
              className="text-sm font-semibold text-white bg-purple-600 hover:bg-purple-500 rounded-xl px-4 py-2 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </nav>

        {/* ── Hero ── */}
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-xs text-gray-400 mb-6">
            <ShieldCheck className="w-3.5 h-3.5 text-green-400" />
            Secure payments · Dispute protection on every order
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight leading-tight">
            Get any email account
            <br />
            <span className="gradient-text-brand">created for you, on demand</span>
          </h1>
          <p className="text-gray-400 mt-5 text-base md:text-lg max-w-xl mx-auto">
            Stop fighting Google&apos;s phone-verification limits. Place an order, a verified worker creates
            your account and delivers the credentials — starting at just ₹{minimumOrderAmount}.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 text-white font-semibold bg-purple-600 hover:bg-purple-500 rounded-xl px-6 py-3 transition-colors w-full sm:w-auto justify-center"
            >
              Create Your First Order <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 text-gray-300 hover:text-white font-medium bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-xl px-6 py-3 transition-colors w-full sm:w-auto justify-center"
            >
              See Pricing
            </Link>
          </div>
        </div>

        {/* ── Domains strip ── */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-16 md:mb-20">
          {DOMAINS.map(d => (
            <span key={d} className="text-xs text-gray-400 bg-white/[0.04] border border-white/[0.06] rounded-full px-3 py-1.5">
              {d}
            </span>
          ))}
        </div>

        {/* ── How it works ── */}
        <div className="mb-16 md:mb-20">
          <h2 className="text-2xl font-bold text-white text-center mb-10">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="glass-card p-6 text-center">
              <div className="w-11 h-11 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center mx-auto mb-4">
                <span className="text-purple-400 font-bold">1</span>
              </div>
              <h3 className="font-semibold text-white mb-1.5">Place your order</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Pick a domain, choose a random or custom name, and set your amount — single account or bulk, both work.
              </p>
            </div>
            <div className="glass-card p-6 text-center">
              <div className="w-11 h-11 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center mx-auto mb-4">
                <span className="text-purple-400 font-bold">2</span>
              </div>
              <h3 className="font-semibold text-white mb-1.5">A worker gets to it</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                A verified worker on the platform accepts your order and creates the account to your exact spec.
              </p>
            </div>
            <div className="glass-card p-6 text-center">
              <div className="w-11 h-11 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center mx-auto mb-4">
                <span className="text-purple-400 font-bold">3</span>
              </div>
              <h3 className="font-semibold text-white mb-1.5">Get your credentials</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Full email + password delivered to you directly. Not happy? Our dispute system has you covered.
              </p>
            </div>
          </div>
        </div>

        {/* ── Trust / features grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-16 md:mb-20">
          <div className="glass-card p-5">
            <Lock className="w-5 h-5 text-green-400 mb-3" />
            <h3 className="text-sm font-semibold text-white mb-1">Payment held securely</h3>
            <p className="text-xs text-gray-500 leading-relaxed">Workers only get paid once your order is delivered and confirmed.</p>
          </div>
          <div className="glass-card p-5">
            <Package className="w-5 h-5 text-purple-400 mb-3" />
            <h3 className="text-sm font-semibold text-white mb-1">Bulk orders supported</h3>
            <p className="text-xs text-gray-500 leading-relaxed">Need 20 accounts? One payment, delivered individually.</p>
          </div>
          <div className="glass-card p-5">
            <MessageCircle className="w-5 h-5 text-blue-400 mb-3" />
            <h3 className="text-sm font-semibold text-white mb-1">Order from Telegram too</h3>
            <p className="text-xs text-gray-500 leading-relaxed">Prefer chatting over a website? Order right inside @MailzeonBot.</p>
          </div>
          <div className="glass-card p-5">
            <Wallet className="w-5 h-5 text-yellow-400 mb-3" />
            <h3 className="text-sm font-semibold text-white mb-1">No hidden fees</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              You set the amount. Just a flat {platformCommissionRate}% platform commission, nothing else.
            </p>
          </div>
        </div>

        {/* ── For workers strip ── */}
        <div className="glass-card p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-5 mb-16 md:mb-20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Want to earn instead?</h3>
              <p className="text-sm text-gray-400 mt-0.5">Join as a Worker, accept orders from the marketplace, and get paid per account you create.</p>
            </div>
          </div>
          <Link
            href="/register"
            className="shrink-0 text-sm font-semibold text-white bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] rounded-xl px-5 py-2.5 transition-colors whitespace-nowrap"
          >
            Become a Worker
          </Link>
        </div>

        {/* ── FAQ ── */}
        <div className="mb-16 md:mb-20">
          <h2 className="text-2xl font-bold text-white text-center mb-8">Frequently asked</h2>
          <div className="max-w-2xl mx-auto space-y-3">
            {[
              { q: 'Is this safe?', a: 'Yes — your payment is held securely and only released to the worker once your order is delivered. If anything goes wrong, our dispute system protects you and can issue a refund.' },
              { q: 'What if the account has an issue?', a: 'Raise a dispute right from your order — our team reviews it and refunds are issued for confirmed cases. See our Refunds & Cancellations policy for full details.' },
              { q: 'Can I order in bulk?', a: 'Yes. Toggle "Bulk order" when placing an order — you pay once, and each account is created and delivered individually in the marketplace.' },
              { q: 'Which email providers are supported?', a: 'Gmail, Outlook, Yahoo, iCloud, ProtonMail, Zoho, AOL, GMX, and more — pick any domain when placing your order.' },
            ].map(item => (
              <details key={item.q} className="glass-card p-5 group">
                <summary className="flex items-center justify-between cursor-pointer text-sm font-medium text-white list-none">
                  {item.q}
                  <CheckCircle2 className="w-4 h-4 text-gray-600 group-open:text-purple-400 transition-colors shrink-0 ml-3" />
                </summary>
                <p className="text-sm text-gray-400 mt-3 leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </div>

        {/* ── Final CTA ── */}
        <div className="text-center glass-card p-8 md:p-12 mb-8">
          <Zap className="w-8 h-8 text-purple-400 mx-auto mb-4" />
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Ready to get your account made?</h2>
          <p className="text-gray-400 mb-6">Sign up free — starts at just ₹{minimumOrderAmount} per account.</p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 text-white font-semibold bg-purple-600 hover:bg-purple-500 rounded-xl px-6 py-3 transition-colors"
          >
            Get Started <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <Footer />
      </div>
    </div>
  );
}

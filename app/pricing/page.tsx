import { Zap, Mail, CheckCircle, IndianRupee } from 'lucide-react';
import Link from 'next/link';

export const metadata = { title: 'Pricing & Services' };

export default function PricingPage() {
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
          <h1 className="text-3xl font-bold text-white">Pricing & Services</h1>
          <p className="text-gray-400 mt-2">All prices are listed and charged in Indian Rupees (INR).</p>
        </div>

        {/* Service description */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-white">Our Service: Email Account Creation</h2>
          </div>
          <p className="text-gray-300 text-sm leading-relaxed">
            Mailzeon connects Customers who need a new email account created (Gmail, Outlook, Yahoo, and other
            major providers) with independent Workers who create and deliver that account. The Customer chooses
            the email domain and whether the address is randomly generated or a custom name of their choice.
          </p>
          <ul className="space-y-2 text-sm text-gray-300">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
              Choice of 12+ popular email domains (Gmail, Outlook, Yahoo, iCloud, and more)
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
              Random or custom account name, as selected by the Customer
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
              Full account credentials (email + password) delivered directly to the Customer
            </li>
          </ul>
        </div>

        {/* Pricing structure */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <IndianRupee className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-white">Pricing Structure</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-[#374151]/40 border border-[#374151]">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Order Amount</p>
              <p className="text-2xl font-bold text-white mt-1">Customer's Choice</p>
              <p className="text-xs text-gray-500 mt-1">Minimum ₹15 per order</p>
            </div>
            <div className="p-4 rounded-xl bg-[#374151]/40 border border-[#374151]">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Platform Commission</p>
              <p className="text-2xl font-bold text-white mt-1">15%</p>
              <p className="text-xs text-gray-500 mt-1">Deducted automatically from order amount</p>
            </div>
          </div>

          <p className="text-sm text-gray-400 leading-relaxed pt-2">
            The Customer sets their own order amount at the time of placing an order (minimum ₹15, no upper
            limit). The full amount is collected upfront via our secure payment partner. Mailzeon retains a
            fixed 15% platform commission, and the remaining 85% is paid out to the Worker once the order is
            completed.
          </p>

          <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/20">
            <p className="text-sm text-gray-300">
              <strong className="text-white">Example:</strong> On a ₹100 order, Mailzeon's commission is ₹15,
              and the Worker who completes the order earns ₹85.
            </p>
          </div>
        </div>

        <p className="text-xs text-gray-500">
          All amounts on Mailzeon are quoted and charged exclusively in Indian Rupees (₹ INR).
        </p>
      </div>
    </div>
  );
}

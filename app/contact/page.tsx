import { Mail, Phone, MapPin, Zap } from 'lucide-react';
import Link from 'next/link';

export const metadata = { title: 'Contact Us' };

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#0B1120] p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <Link href="/login" className="flex items-center gap-2 w-fit">
          <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-white">Mailzeon</span>
        </Link>

        <div>
          <h1 className="text-3xl font-bold text-white">Contact Us</h1>
          <p className="text-gray-400 mt-2">We're here to help with any questions about your orders, payments, or account.</p>
        </div>

        <div className="glass-card p-6 space-y-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <a href="mailto:admin@mailzeon.com" className="text-white font-medium hover:text-purple-400">
                admin@mailzeon.com
              </a>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center shrink-0">
              <Phone className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Phone</p>
              <a href="tel:+15485861525" className="text-white font-medium hover:text-purple-400">
                +1 (548) 586-1525
              </a>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Address</p>
              <p className="text-white font-medium">
                1 World Trade Center, New York, NY 10007, United States
              </p>
            </div>
          </div>
        </div>

        <p className="text-sm text-gray-500">
          For order or payment issues, please include your Order ID when reaching out so we can assist you faster.
        </p>
      </div>
    </div>
  );
}

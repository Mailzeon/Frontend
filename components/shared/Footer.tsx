import Link from 'next/link';

const links = [
  { href: '/contact',       label: 'Contact Us' },
  { href: '/terms',         label: 'Terms & Conditions' },
  { href: '/refund-policy', label: 'Refunds & Cancellations' },
  { href: '/pricing',       label: 'Pricing' },
];

export function Footer() {
  return (
    <footer className="w-full py-6 mt-8">
      <div className="max-w-md mx-auto flex flex-col items-center gap-3 text-center">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          {links.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </div>
        <p className="text-xs text-gray-600">
          © {new Date().getFullYear()} Mailzeon. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

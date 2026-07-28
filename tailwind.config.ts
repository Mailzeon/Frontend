import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      colors: {
        // REFRESH: richer near-black (was navy-tinted #0B1120) + a more
        // saturated violet family, closer to the premium-SaaS reference
        // the client asked to match. Status colors (green/yellow/red/blue)
        // are untouched since they carry semantic meaning across the app.
        brand: {
          purple:   '#8B5CF6',
          violet:   '#A78BFA', // lighter gradient stop
          deep:     '#6D28D9', // darker gradient stop
          blue:     '#3B82F6',
          success:  '#22C55E',
          warning:  '#F59E0B',
          danger:   '#EF4444',
        },
        bg: {
          primary:  '#08080D',
          sidebar:  '#0C0C12',
          card:     '#131318',
          elevated: '#1C1C24',
        },
        background:  '#08080D',
        foreground:  '#F9FAFB',
        card: {
          DEFAULT:    '#131318',
          foreground: '#F9FAFB',
        },
        popover: {
          DEFAULT:    '#131318',
          foreground: '#F9FAFB',
        },
        primary: {
          DEFAULT:    '#8B5CF6',
          foreground: '#FFFFFF',
        },
        secondary: {
          DEFAULT:    '#3B82F6',
          foreground: '#FFFFFF',
        },
        muted: {
          DEFAULT:    '#26262F',
          foreground: '#9CA3AF',
        },
        accent: {
          DEFAULT:    '#26262F',
          foreground: '#F9FAFB',
        },
        destructive: {
          DEFAULT:    '#EF4444',
          foreground: '#FFFFFF',
        },
        border:  '#26262F',
        input:   '#26262F',
        ring:    '#8B5CF6',
      },
      borderRadius: {
        lg:    '16px',
        md:    '12px',
        sm:    '8px',
        xl:    '20px',
        '2xl': '24px',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
        // NEW: used only for big stat/data figures (wallet balance, order
        // amounts, dashboard KPIs) — a monospace/tabular treatment reads as
        // "precise data" and visually separates numbers from prose, a
        // signature touch of the reference direction.
        mono: ['var(--font-jetbrains-mono)', 'JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to:   { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to:   { height: '0' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in': {
          from: { transform: 'translateX(100%)' },
          to:   { transform: 'translateX(0)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.5' },
        },
        // NEW: slow ambient drift for the background glow blobs — subtle,
        // never distracting, respects the "less is more" motion principle.
        'drift': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '50%':      { transform: 'translate(2%, -3%) scale(1.05)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up':   'accordion-up 0.2s ease-out',
        'fade-in':        'fade-in 0.25s ease-out',
        'slide-in':       'slide-in 0.3s ease-out',
        'pulse-soft':     'pulse-soft 2s ease-in-out infinite',
        'drift':          'drift 12s ease-in-out infinite',
      },
      boxShadow: {
        'card':        '0 1px 3px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.4)',
        'card-lg':     '0 8px 32px rgba(0,0,0,0.55)',
        'glow-purple': '0 0 24px rgba(139, 92, 246, 0.25)',
        'glow-blue':   '0 0 20px rgba(59, 130, 246, 0.3)',
        // NEW: soft inner top-highlight, the detail that makes a flat dark
        // card read as "glass" instead of just "gray box".
        'glass-inset': 'inset 0 1px 0 0 rgba(255,255,255,0.06)',
      },
      backgroundImage: {
        // Reusable gradient tokens instead of ad-hoc `from-x to-y` on every
        // usage — keeps the violet gradient consistent everywhere it's used
        // (buttons, headings, active nav state, glow blobs).
        'brand-gradient':  'linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)',
        'glow-radial':     'radial-gradient(circle, rgba(139,92,246,0.35) 0%, rgba(139,92,246,0) 70%)',
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;

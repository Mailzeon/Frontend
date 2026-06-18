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
        brand: {
          purple:  '#8B5CF6',
          blue:    '#3B82F6',
          success: '#22C55E',
          warning: '#F59E0B',
          danger:  '#EF4444',
        },
        bg: {
          primary:  '#0B1120',
          sidebar:  '#111827',
          card:     '#1F2937',
          elevated: '#374151',
        },
        background:  '#0B1120',
        foreground:  '#F9FAFB',
        card: {
          DEFAULT:    '#1F2937',
          foreground: '#F9FAFB',
        },
        popover: {
          DEFAULT:    '#1F2937',
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
          DEFAULT:    '#374151',
          foreground: '#9CA3AF',
        },
        accent: {
          DEFAULT:    '#374151',
          foreground: '#F9FAFB',
        },
        destructive: {
          DEFAULT:    '#EF4444',
          foreground: '#FFFFFF',
        },
        border:  '#374151',
        input:   '#374151',
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
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up':   'accordion-up 0.2s ease-out',
        'fade-in':        'fade-in 0.25s ease-out',
        'slide-in':       'slide-in 0.3s ease-out',
        'pulse-soft':     'pulse-soft 2s ease-in-out infinite',
      },
      boxShadow: {
        'card':        '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)',
        'card-lg':     '0 4px 24px rgba(0,0,0,0.5)',
        'glow-purple': '0 0 20px rgba(139, 92, 246, 0.3)',
        'glow-blue':   '0 0 20px rgba(59, 130, 246, 0.3)',
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;

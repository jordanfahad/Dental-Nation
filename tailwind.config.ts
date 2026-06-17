import type { Config } from 'tailwindcss';

/**
 * Design system — McKinsey / consulting aesthetic (§14).
 * Near-monochrome neutral base, ONE structural accent (deep ink-blue),
 * disciplined semantic set (good / watch / stop / n-a). No rainbow, no gradients.
 */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Neutral base
        surface: '#FAFAFA',
        card: '#FFFFFF',
        line: '#E6E6E6',
        // Ink (text)
        ink: {
          DEFAULT: '#111111',
          soft: '#3F3F46',
          faint: '#71717A',
          ghost: '#A1A1AA',
        },
        // Single structural accent — deep ink-blue / slate
        accent: {
          DEFAULT: '#1F3A5F',
          600: '#264A78',
          400: '#5B7BA3',
          50: '#EEF2F8',
        },
        // Semantic set
        good: { DEFAULT: '#15803D', 50: '#ECFDF3' },
        watch: { DEFAULT: '#B45309', 50: '#FEF6EC' },
        stop: { DEFAULT: '#B91C1C', 50: '#FEF2F2' },
        na: { DEFAULT: '#9CA3AF', 50: '#F4F4F5' },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        eyebrow: '0.12em',
      },
      borderRadius: {
        card: '10px',
      },
      boxShadow: {
        // Hairline-first: shadows are barely-there, not "drop-shadow soup".
        card: '0 1px 2px rgba(17,17,17,0.04)',
      },
      fontSize: {
        eyebrow: ['11px', { lineHeight: '14px', letterSpacing: '0.12em' }],
        kpi: ['34px', { lineHeight: '36px' }],
        hero: ['44px', { lineHeight: '46px' }],
      },
    },
  },
  plugins: [],
};

export default config;

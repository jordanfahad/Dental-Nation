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
          // Aliases for the Impact (Tab 2) components: ink-2 = soft, ink-3 = faint.
          2: '#3F3F46',
          3: '#71717A',
        },
        // Single structural accent — deep ink-blue / slate
        accent: {
          DEFAULT: '#1F3A5F',
          600: '#264A78',
          400: '#5B7BA3',
          50: '#EEF2F8',
          // Aliases used by the Impact (Tab 2) components — same accent.
          strong: '#264A78',
          weak: '#EEF2F8',
        },
        // Semantic set
        good: { DEFAULT: '#15803D', 50: '#ECFDF3' },
        watch: { DEFAULT: '#B45309', 50: '#FEF6EC' },
        stop: { DEFAULT: '#B91C1C', 50: '#FEF2F2' },
        na: { DEFAULT: '#9CA3AF', 50: '#F4F4F5' },

        // --- Impact (Tab 2) token aliases -----------------------------------
        // The ported Impact components use these names; they map onto the exact
        // Lane E palette above so the second tab shares one visual language.
        paper: '#FFFFFF',
        panel: '#F4F4F6',
        'panel-2': '#EAECEF',
        hairline: { DEFAULT: '#E6E6E6', strong: '#D4D8DF' },
        ok: { DEFAULT: '#15803D', weak: '#ECFDF3' },
        warn: { DEFAULT: '#B45309', weak: '#FEF6EC' },
        bad: { DEFAULT: '#B91C1C', weak: '#FEF2F2' },
        muted: { DEFAULT: '#9CA3AF', weak: '#F4F4F5' },

        // --- "Mr. Akbar deck" reference palette (Growth Projects tab restyle) ---
        // Navy + mint executive look. Namespaced `dn-*` so it never touches the
        // Lane E report's near-monochrome tokens.
        dn: {
          navy: '#244260',
          navy2: '#315779',
          mint: '#CFE2D0',
          off: '#F7F5EF',
          soft: '#5793A3',
          pale: '#C9E2E1',
          beige: '#EEEFE1',
          ink: '#2C3233',
          line: '#DDE5E0',
          red: '#B42318',
          amber: '#B54708',
          green: '#2E7D32',
          grey: '#ADAC99',
        },
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

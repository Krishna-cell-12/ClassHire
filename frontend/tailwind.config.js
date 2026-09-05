import animate from 'tailwindcss-animate'
import plugin from 'tailwindcss/plugin'

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      // Tailwind v3 only emits `bg-x/NN` for steps that exist in this scale
      // (unlike v4, which accepts any number). The 3D system leans on fine
      // alpha steps for glass and glow, so expose every integer 0–100.
      opacity: Object.fromEntries(Array.from({ length: 101 }, (_, i) => [i, String(i / 100)])),
      transitionTimingFunction: {
        // The house easing: fast out, long settle. Used for every 3D move.
        spring: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      borderRadius: {
        lg:   'var(--radius)',
        md:   'calc(var(--radius) - 2px)',
        sm:   'calc(var(--radius) - 4px)',
        '4xl': '2rem',
      },
      colors: {
        border:      'hsl(var(--border))',
        input:       'hsl(var(--input))',
        ring:        'hsl(var(--ring))',
        background:  'hsl(var(--background))',
        foreground:  'hsl(var(--foreground))',
        primary:     { DEFAULT: 'hsl(var(--primary))',     foreground: 'hsl(var(--primary-foreground))' },
        secondary:   { DEFAULT: 'hsl(var(--secondary))',   foreground: 'hsl(var(--secondary-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        muted:       { DEFAULT: 'hsl(var(--muted))',       foreground: 'hsl(var(--muted-foreground))' },
        accent:      { DEFAULT: 'hsl(var(--accent))',      foreground: 'hsl(var(--accent-foreground))' },
        popover:     { DEFAULT: 'hsl(var(--popover))',     foreground: 'hsl(var(--popover-foreground))' },
        card:        { DEFAULT: 'hsl(var(--card))',        foreground: 'hsl(var(--card-foreground))' },
        surface:     { DEFAULT: 'hsl(var(--surface))',     raised: 'hsl(var(--surface-raised))', sunken: 'hsl(var(--surface-sunken))' },
        risk: {
          low:    'hsl(var(--risk-low))',
          medium: 'hsl(var(--risk-medium))',
          high:   'hsl(var(--risk-high))',
        },
        neon: {
          orange: 'hsl(var(--neon-orange))',
          cyan:   'hsl(var(--neon-cyan))',
          violet: 'hsl(var(--neon-violet))',
          lime:   'hsl(var(--neon-lime))',
        },
      },
      boxShadow: {
        'elev-1': 'var(--elev-1)',
        'elev-2': 'var(--elev-2)',
        'elev-3': 'var(--elev-3)',
        'elev-4': 'var(--elev-4)',
        rim:      'var(--rim)',
        'glow-primary': '0 0 0 1px hsl(var(--primary) / 0.35), 0 0 28px -6px hsl(var(--primary) / 0.55)',
        'glow-danger':  '0 0 0 1px hsl(var(--risk-high) / 0.35), 0 0 28px -6px hsl(var(--risk-high) / 0.55)',
        'glow-success': '0 0 0 1px hsl(var(--risk-low) / 0.35), 0 0 28px -6px hsl(var(--risk-low) / 0.55)',
      },
      backgroundImage: {
        glass:      'var(--glass)',
        'glass-hi': 'var(--glass-hi)',
        'primary-sheen': 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.75) 45%, hsl(18 92% 48%) 100%)',
      },
      keyframes: {
        'fade-up':  { '0%': { opacity: '0', transform: 'translateY(14px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        shimmer:    { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        float:      { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
        aurora:     {
          '0%':   { transform: 'translate3d(0,0,0) scale(1)' },
          '33%':  { transform: 'translate3d(6%,-4%,0) scale(1.12)' },
          '66%':  { transform: 'translate3d(-5%,5%,0) scale(0.94)' },
          '100%': { transform: 'translate3d(0,0,0) scale(1)' },
        },
        'grid-drift': { '0%': { backgroundPosition: '0 0' }, '100%': { backgroundPosition: '0 60px' } },
        'glow-pulse': { '0%,100%': { opacity: '0.45' }, '50%': { opacity: '1' } },
        'spin-slow':  { to: { transform: 'rotate(360deg)' } },
        'sweep':      { '0%': { transform: 'translateX(-120%)' }, '100%': { transform: 'translateX(220%)' } },
        'rise-in':    { '0%': { opacity: '0', transform: 'perspective(1200px) rotateX(18deg) translateZ(-160px)' }, '100%': { opacity: '1', transform: 'perspective(1200px) rotateX(0) translateZ(0)' } },
      },
      animation: {
        'fade-up':    'fade-up 0.35s ease forwards',
        shimmer:      'shimmer 1.5s infinite',
        float:        'float 7s ease-in-out infinite',
        aurora:       'aurora 24s ease-in-out infinite',
        'grid-drift': 'grid-drift 3.5s linear infinite',
        'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
        'spin-slow':  'spin-slow 14s linear infinite',
        sweep:        'sweep 2.2s ease-in-out infinite',
        'rise-in':    'rise-in 0.6s cubic-bezier(0.16,1,0.3,1) forwards',
      },
    },
  },
  plugins: [
    animate,
    // ── CSS 3D primitives (Tailwind v3 has no built-in perspective utilities) ──
    plugin(({ addUtilities, matchUtilities, theme }) => {
      addUtilities({
        '.preserve-3d':  { 'transform-style': 'preserve-3d' },
        '.flat-3d':      { 'transform-style': 'flat' },
        '.backface-hidden':  { 'backface-visibility': 'hidden' },
        '.backface-visible': { 'backface-visibility': 'visible' },
        '.perspective-origin-top': { 'perspective-origin': '50% 0%' },
        '.perspective-origin-center': { 'perspective-origin': '50% 50%' },
        '.gpu': { transform: 'translate3d(0,0,0)', 'will-change': 'transform' },
      })
      matchUtilities(
        { perspective: (v) => ({ perspective: v }) },
        { values: theme('perspective') ?? { none: 'none', 500: '500px', 800: '800px', 1000: '1000px', 1200: '1200px', 1600: '1600px', 2000: '2000px' } },
      )
      matchUtilities(
        {
          'translate-z': (v) => ({ '--tw-translate-z': v, transform: 'translate3d(var(--tw-translate-x,0), var(--tw-translate-y,0), var(--tw-translate-z))' }),
          'rotate-x':    (v) => ({ transform: `rotateX(${v})` }),
          'rotate-y':    (v) => ({ transform: `rotateY(${v})` }),
        },
        { values: { 0: '0px', 1: '4px', 2: '8px', 3: '16px', 4: '24px', 5: '40px', 6: '60px', 8: '90px', 10: '120px', '-2': '-8px', '-4': '-24px', '-6': '-60px' } },
      )
    }),
  ],
}

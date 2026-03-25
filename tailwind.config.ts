import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary:        'var(--page)',
        card:           'var(--card)',
        card2:          'var(--card2, #F7F2E8)',
        sand:           'var(--sand)',
        'sand-mid':     'var(--sand-mid)',
        'sand-dark':    'var(--sand-dark)',
        alice:          'var(--alice, #E9F1F7)',
        'alice-dark':   'var(--alice-dark, #C4D6E4)',
        border:         'var(--border)',
        ink:            'var(--ink)',
        'ink-soft':     'var(--ink-soft)',
        muted:          'var(--text3)',
        text2:          'var(--text2)',
        accent:         'var(--cer)',
        'accent-light': 'var(--cer-light)',
        'accent-dark':  'var(--cer-dark)',
        success:        '#15664E',
        'success-bg':   '#E2F2EC',
        danger:         '#9B2525',
        'danger-bg':    '#FBE8E8',
        warning:        '#7A5210',
        'warning-bg':   '#FBF2DA',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
        mono: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%, 60%': { transform: 'translateX(-6px)' },
          '40%, 80%': { transform: 'translateX(6px)' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        modalIn: {
          from: { opacity: '0', transform: 'translateY(16px) scale(0.98)' },
          to:   { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      animation: {
        shake:    'shake 0.4s ease-in-out',
        'fade-up':'fadeUp 0.25s ease both',
        'modal-in':'modalIn 0.2s ease both',
      },
    },
  },
  plugins: [],
} satisfies Config

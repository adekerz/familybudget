import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary:        'var(--page)',
        card:           'var(--card)',
        card2:          'var(--card2)',
        sand:           'var(--sand)',
        'sand-mid':     'var(--sand-mid)',
        'sand-dark':    'var(--sand-dark)',
        alice:          'var(--alice)',
        'alice-dark':   'var(--alice-dark)',
        border:         'var(--border)',
        ink:            'var(--ink)',
        'ink-soft':     'var(--ink-soft)',
        muted:          'var(--text3)',
        text2:          'var(--text2)',
        accent:         'var(--cer)',
        'accent-light': 'var(--cer-light)',
        'accent-dark':  'var(--cer-dark)',
        surface:        'var(--card)',
        'surface-alt':  'var(--card2)',
        income:         'var(--income)',
        'income-bg':    'var(--income-bg)',
        expense:        'var(--expense)',
        'expense-bg':   'var(--expense-bg)',
        success:        'var(--success)',
        'success-bg':   'var(--success-bg)',
        danger:         'var(--danger)',
        'danger-bg':    'var(--danger-bg)',
        warning:        'var(--warning)',
        'warning-bg':   'var(--warning-bg)',
      },
      fontFamily: {
        sans: ['Manrope', 'sans-serif'],
        mono: ['Manrope', 'sans-serif'],
      },
      boxShadow: {
        'flux':    '0 0 20px rgba(0, 212, 255, 0.15)',
        'flux-lg': '0 0 40px rgba(0, 212, 255, 0.25)',
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
        shake:      'shake 0.4s ease-in-out',
        'fade-up':  'fadeUp 0.25s ease both',
        'modal-in': 'modalIn 0.2s ease both',
      },
    },
  },
  plugins: [],
} satisfies Config

import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary:        '#F2EDE1',
        card:           '#FFFDF8',
        card2:          '#F7F2E8',
        sand:           '#E7DFC6',
        'sand-mid':     '#D4CAB2',
        'sand-dark':    '#B8AA8E',
        alice:          '#E9F1F7',
        'alice-dark':   '#C4D6E4',
        border:         '#DDD5BF',
        ink:            '#131B23',
        'ink-soft':     '#2D3E4D',
        muted:          '#8A7E6A',
        text2:          '#4A3F30',
        accent:         '#2274A5',
        'accent-light': '#D0E7F5',
        'accent-dark':  '#185C85',
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

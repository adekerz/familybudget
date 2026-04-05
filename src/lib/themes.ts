export type ThemeId = 'light' | 'dark';

export interface Theme {
  id: ThemeId;
  name: string;
  label: string;
  vars: Record<string, string>;
}

export const THEMES: Record<ThemeId, Theme> = {
  light: {
    id: 'light',
    name: 'light',
    label: 'Светлая',
    vars: {
      '--page':         '#F8FAFC',
      '--card':         '#FFFFFF',
      '--card2':        '#F1F5F9',
      '--sand':         '#E2E8F0',
      '--sand-mid':     '#CBD5E1',
      '--sand-dark':    '#94A3B8',
      '--alice':        '#E0F2FE',
      '--alice-dark':   '#BAE6FD',
      '--cer':          '#0EA5E9',
      '--cer-light':    '#E0F2FE',
      '--cer-dark':     '#0284C7',
      '--ink':          '#0F172A',
      '--ink-soft':     '#334155',
      '--border':       '#E2E8F0',
      '--text1':        '#0F172A',
      '--text2':        '#475569',
      '--text3':        '#94A3B8',
      '--income':       '#059669',
      '--income-bg':    '#ECFDF5',
      '--expense':      '#DC2626',
      '--expense-bg':   '#FEF2F2',
    },
  },

  dark: {
    id: 'dark',
    name: 'dark',
    label: 'Тёмная',
    vars: {
      '--page':         '#0B0F1A',
      '--card':         '#111827',
      '--card2':        '#1A2332',
      '--sand':         '#1E2A3D',
      '--sand-mid':     '#243447',
      '--sand-dark':    '#2E4060',
      '--alice':        '#001B26',
      '--alice-dark':   '#002B3D',
      '--cer':          '#00D4FF',
      '--cer-light':    'rgba(0,212,255,0.1)',
      '--cer-dark':     '#00A8CC',
      '--ink':          '#F1F5F9',
      '--ink-soft':     '#CBD5E1',
      '--border':       'rgba(255,255,255,0.06)',
      '--text1':        '#F1F5F9',
      '--text2':        '#94A3B8',
      '--text3':        '#475569',
      '--income':       '#34D399',
      '--income-bg':    'rgba(52,211,153,0.1)',
      '--expense':      '#F87171',
      '--expense-bg':   'rgba(248,113,113,0.1)',
    },
  },
};

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  Object.entries(theme.vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
  root.setAttribute('data-theme', theme.id);
  document.body.style.backgroundImage = 'none';
  document.body.style.backgroundColor = theme.vars['--page'];
  document.body.style.backgroundSize = '';
  document.body.style.backgroundPosition = '';
  document.body.style.backgroundRepeat = '';
  document.body.style.backgroundAttachment = '';
}

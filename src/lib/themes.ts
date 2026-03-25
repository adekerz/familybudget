export type ThemeId = 'wife' | 'husband';

export interface Theme {
  id: ThemeId;
  name: string;
  label: string;
  vars: Record<string, string>;
}

export const THEMES: Record<ThemeId, Theme> = {
  wife: {
    id: 'wife',
    name: 'wife',
    label: 'Для жены',
    vars: {
      '--page':         '#F2EDE1',
      '--card':         '#FFFDF8',
      '--card2':        '#F7F2E8',
      '--sand':         '#E7DFC6',
      '--sand-mid':     '#D4CAB2',
      '--sand-dark':    '#B8AA8E',
      '--alice':        '#E9F1F7',
      '--alice-dark':   '#C4D6E4',
      '--cer':          '#2274A5',
      '--cer-light':    '#D0E7F5',
      '--cer-dark':     '#185C85',
      '--ink':          '#131B23',
      '--ink-soft':     '#2D3E4D',
      '--border':       '#DDD5BF',
      '--text1':        '#131B23',
      '--text2':        '#4A3F30',
      '--text3':        '#8A7E6A',
    },
  },

  husband: {
    id: 'husband',
    name: 'husband',
    label: 'Для мужа',
    vars: {
      '--page':         '#0F1923',
      '--card':         '#1A2535',
      '--card2':        '#1E2C3D',
      '--sand':         '#243447',
      '--sand-mid':     '#2E4060',
      '--sand-dark':    '#3D5475',
      '--alice':        '#1C2E42',
      '--alice-dark':   '#2A4060',
      '--cer':          '#00D4FF',
      '--cer-light':    '#003D4D',
      '--cer-dark':     '#00A8CC',
      '--ink':          '#E8F4F8',
      '--ink-soft':     '#B0C8D8',
      '--border':       '#2A3F55',
      '--text1':        '#E8F4F8',
      '--text2':        '#A8C4D8',
      '--text3':        '#5A7A95',
    },
  },
};

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  Object.entries(theme.vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
  root.setAttribute('data-theme', theme.id);
}

export type ThemeId = 'wife' | 'husband' | 'light' | 'dark';

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
      '--page': '#F2EDE1',
      '--card': '#FFFDF8',
      '--card2': '#F7F2E8',
      '--sand': '#E7DFC6',
      '--sand-mid': '#D4CAB2',
      '--sand-dark': '#B8AA8E',
      '--alice': '#E9F1F7',
      '--alice-dark': '#C4D6E4',
      '--cer': '#2274A5',
      '--cer-light': '#D0E7F5',
      '--cer-dark': '#185C85',
      '--ink': '#131B23',
      '--ink-soft': '#2D3E4D',
      '--border': '#DDD5BF',
      '--text1': '#131B23',
      '--text2': '#4A3F30',
      '--text3': '#8A7E6A',
    },
  },

  husband: {
    id: 'husband',
    name: 'husband',
    label: 'Для мужа',
    vars: {
      '--page': '#0F1923',
      '--card': '#1A2535',
      '--card2': '#1E2C3D',
      '--sand': '#243447',
      '--sand-mid': '#2E4060',
      '--sand-dark': '#3D5475',
      '--alice': '#1C2E42',
      '--alice-dark': '#2A4060',
      '--cer': '#00D4FF',
      '--cer-light': '#003D4D',
      '--cer-dark': '#00A8CC',
      '--ink': '#E8F4F8',
      '--ink-soft': '#B0C8D8',
      '--border': '#2A3F55',
      '--text1': '#E8F4F8',
      '--text2': '#A8C4D8',
      '--text3': '#5A7A95',
    },
  },

  light: {
    id: 'light',
    name: 'light',
    label: 'Светлая',
    vars: {
      '--page': '#F5F5F5',
      '--card': '#FFFFFF',
      '--card2': '#F0F0F0',
      '--sand': '#E8E8E8',
      '--sand-mid': '#D0D0D0',
      '--sand-dark': '#B0B0B0',
      '--alice': '#EEF2FF',
      '--alice-dark': '#C7D2FE',
      '--cer': '#4F46E5',
      '--cer-light': '#EEF2FF',
      '--cer-dark': '#3730A3',
      '--ink': '#111827',
      '--ink-soft': '#374151',
      '--border': '#E5E7EB',
      '--text1': '#111827',
      '--text2': '#374151',
      '--text3': '#9CA3AF',
    },
  },

  dark: {
    id: 'dark',
    name: 'dark',
    label: 'Тёмная',
    vars: {
      '--page': '#111827',
      '--card': '#1F2937',
      '--card2': '#374151',
      '--sand': '#374151',
      '--sand-mid': '#4B5563',
      '--sand-dark': '#6B7280',
      '--alice': '#1E3A5F',
      '--alice-dark': '#2D4E7A',
      '--cer': '#60A5FA',
      '--cer-light': '#1E3A5F',
      '--cer-dark': '#3B82F6',
      '--ink': '#F9FAFB',
      '--ink-soft': '#E5E7EB',
      '--border': '#374151',
      '--text1': '#F9FAFB',
      '--text2': '#E5E7EB',
      '--text3': '#9CA3AF',
    },
  },
};

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  Object.entries(theme.vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
  root.setAttribute('data-theme', theme.id);

  if (theme.id === 'husband') {
    document.body.style.backgroundImage = "url('/icons/bg-husband.jpg')";
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = 'center top';
    document.body.style.backgroundRepeat = 'no-repeat';
    document.body.style.backgroundAttachment = 'fixed';
  } else if (theme.id === 'wife') {
    // Сбрасываем все inline стили — CSS берёт управление (bg-mobile.png из index.css)
    document.body.style.backgroundImage = '';
    document.body.style.backgroundSize = '';
    document.body.style.backgroundPosition = '';
    document.body.style.backgroundRepeat = '';
    document.body.style.backgroundAttachment = '';
    document.body.style.backgroundColor = '';
  } else {
    // light / dark — без фонового изображения
    document.body.style.backgroundImage = 'none';
    document.body.style.backgroundColor = theme.vars['--page'];
    document.body.style.backgroundSize = '';
    document.body.style.backgroundPosition = '';
    document.body.style.backgroundRepeat = '';
    document.body.style.backgroundAttachment = '';
  }
}

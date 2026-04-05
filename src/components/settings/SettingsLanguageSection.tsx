// src/components/settings/SettingsLanguageSection.tsx
import { useTranslation } from 'react-i18next';

const LANGUAGES = [
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'kz', label: 'Қазақша', flag: '🇰🇿' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
];

export function SettingsLanguageSection() {
  const { i18n } = useTranslation();
  const current = i18n.language.split('-')[0]; // 'ru-RU' → 'ru'

  function handleChange(code: string) {
    i18n.changeLanguage(code);
    localStorage.setItem('fb_locale', code);
  }

  return (
    <section className="bg-card rounded-2xl border border-border p-4">
      <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Язык / Тіл / Language</h2>
      <div className="flex gap-2">
        {LANGUAGES.map(lang => (
          <button
            key={lang.code}
            onClick={() => handleChange(lang.code)}
            className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl border-2 transition-all ${
              current === lang.code
                ? 'border-accent bg-accent/5'
                : 'border-border bg-sand'
            }`}
          >
            <span style={{ fontSize: 22 }}>{lang.flag}</span>
            <span className={`text-xs font-semibold ${current === lang.code ? 'text-accent' : 'text-muted'}`}>
              {lang.label}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

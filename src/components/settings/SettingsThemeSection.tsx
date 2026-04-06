import { Palette } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { ThemeSwitcherFull } from '../ui/ThemeSwitcher';

export function SettingsThemeSection() {
  const { t } = useTranslation();
  return (
    <section className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <Palette size={16} className="text-accent" />
        <p className="font-semibold text-ink text-sm">{t('settings_theme_title')}</p>
      </div>
      <div className="px-4 py-4">
        <ThemeSwitcherFull />
      </div>
    </section>
  );
}

import { Palette } from '@phosphor-icons/react';
import { ThemeSwitcherFull } from '../ui/ThemeSwitcher';

export function SettingsThemeSection() {
  return (
    <section className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <Palette size={16} className="text-accent" />
        <p className="font-semibold text-ink text-sm">Оформление</p>
      </div>
      <div className="px-4 py-4">
        <ThemeSwitcherFull />
      </div>
    </section>
  );
}

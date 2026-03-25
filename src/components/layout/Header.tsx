import { Settings } from 'lucide-react';
import { ThemeSwitcherCompact } from '../ui/ThemeSwitcher';
import { navigateTo } from '../../lib/navigation';

export function Header() {
  const today = new Date().toLocaleDateString('ru-RU', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
  });

  return (
    <header className="flex items-center justify-between px-4 py-3 bg-card/60 backdrop-blur-md border-b border-border sticky top-0 z-40">
      <div>
        <h1 className="text-base font-bold tracking-wide">
          <span className="text-ink">Family</span>
          <span className="text-accent">Budget</span>
        </h1>
        <p className="text-xs text-muted capitalize">{today}</p>
      </div>
      <div className="flex items-center gap-2">
        <ThemeSwitcherCompact />
        <button
          onClick={() => navigateTo('settings')}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-card border border-border text-muted hover:text-ink transition-colors"
          aria-label="Настройки"
        >
          <Settings size={16} strokeWidth={1.5} />
        </button>
      </div>
    </header>
  );
}

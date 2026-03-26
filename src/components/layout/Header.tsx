import { Gear } from '@phosphor-icons/react';
import { ThemeSwitcherCompact } from '../ui/ThemeSwitcher';
import { navigateTo } from '../../lib/navigation';
import { useAuthStore } from '../../store/useAuthStore';

export function Header() {
  const user = useAuthStore((s) => s.user);

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
        {user && (
          <span className="text-xs text-muted font-medium px-2 py-1 bg-sand/40 rounded-lg border border-border">
            {user.username}
          </span>
        )}
        <ThemeSwitcherCompact />
        <button
          onClick={() => navigateTo('settings')}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-card border border-border text-muted hover:text-ink transition-colors"
          aria-label="Настройки"
        >
          <Gear size={16} strokeWidth={1.5} />
        </button>
      </div>
    </header>
  );
}

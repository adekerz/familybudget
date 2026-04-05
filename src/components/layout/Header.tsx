import { ArrowClockwise, Gear } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { ThemeSwitcherCompact } from '../ui/ThemeSwitcher';
import { navigateTo } from '../../lib/navigation';
import { useAuthStore } from '../../store/useAuthStore';
import { useIncomeStore } from '../../store/useIncomeStore';
import { useExpenseStore } from '../../store/useExpenseStore';
import { useGoalsStore } from '../../store/useGoalsStore';
import { useState } from 'react';

export function Header() {
  const { i18n } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [refreshing, setRefreshing] = useState(false);
  const langLabel = ({ ru: 'RU', kz: 'KZ', en: 'EN' } as Record<string, string>)[i18n.language.split('-')[0]] ?? 'RU';

  const today = new Date().toLocaleDateString('ru-RU', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
  });

  function capitalize(s: string) {
    if (!s) return s;
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([
      useIncomeStore.getState().loadIncomes(),
      useExpenseStore.getState().loadExpenses(),
      useGoalsStore.getState().loadGoals(),
    ]);
    setRefreshing(false);
  }

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
            {capitalize(user.username)}
          </span>
        )}
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-card border border-border text-muted hover:text-ink transition-colors disabled:opacity-50"
          aria-label="Обновить данные"
        >
          <ArrowClockwise size={16} strokeWidth={1.5} className={refreshing ? 'animate-spin' : ''} />
        </button>
        <ThemeSwitcherCompact />
        <button
          onClick={() => navigateTo('settings')}
          className="h-9 flex items-center justify-center gap-1 px-2 rounded-xl bg-card border border-border text-muted hover:text-ink transition-colors"
          aria-label="Настройки"
        >
          <span className="text-[10px] font-bold">{langLabel}</span>
          <Gear size={16} strokeWidth={1.5} />
        </button>
      </div>
    </header>
  );
}

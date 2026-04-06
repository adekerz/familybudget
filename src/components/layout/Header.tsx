import { ArrowClockwise, Gear } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { ThemeSwitcherCompact } from '../ui/ThemeSwitcher';
import { FluxLogo } from '../ui/FluxLogo';
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
    <header
      className="flex items-center justify-between px-4 py-3 sticky top-0 z-40 border-b"
      style={{
        background: 'rgba(11,15,26,0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderColor: 'rgba(255,255,255,0.06)',
      }}
    >
      {/* Лого — только mobile. На desktop лого уже есть в sidebar */}
      <div className="md:hidden">
        <FluxLogo size={28} />
      </div>
      {/* На desktop — пустой div для баланса flex */}
      <div className="hidden md:block" />

      <div className="flex items-center gap-2">
        {/* Username — только mobile, на desktop есть в sidebar */}
        {user && (
          <span
            className="md:hidden text-xs font-medium px-2 py-1 rounded-lg border"
            style={{ color: '#94A3B8', background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.08)' }}
          >
            {capitalize(user.username)}
          </span>
        )}
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="w-9 h-9 flex items-center justify-center rounded-xl border disabled:opacity-50 transition-colors"
          style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.08)', color: '#94A3B8' }}
          aria-label="Обновить данные"
        >
          <ArrowClockwise size={16} strokeWidth={1.5} className={refreshing ? 'animate-spin' : ''} />
        </button>
        {/* ThemeSwitcher — только mobile, на desktop есть в sidebar */}
        <div className="md:hidden">
          <ThemeSwitcherCompact />
        </div>
        <button
          onClick={() => navigateTo('settings')}
          className="h-9 flex items-center justify-center gap-1 px-2 rounded-xl border transition-colors"
          style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.08)', color: '#94A3B8' }}
          aria-label="Настройки"
        >
          <span className="text-[10px] font-bold">{langLabel}</span>
          <Gear size={16} strokeWidth={1.5} />
        </button>
      </div>
    </header>
  );
}

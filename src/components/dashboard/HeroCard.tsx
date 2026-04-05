// src/components/dashboard/HeroCard.tsx
import { useTranslation } from 'react-i18next';
import { useEngine } from '../../store/useFinanceEngine';
import { formatTenge } from '../../lib/calculations';
import { navigateTo } from '../../lib/navigation';
import { Sun, TrendDown, TrendUp } from '@phosphor-icons/react';

export function HeroCard() {
  const { t } = useTranslation();
  const engine = useEngine();

  if (!engine) return null;

  const { safeToSpend, dailyLimit, daysRemaining, paceStatus, isOverBudget, hasPeriod } = engine;

  const heroColor = isOverBudget
    ? 'bg-red-600'
    : paceStatus === 'danger'
    ? 'bg-orange-500'
    : 'bg-accent';

  const paceKey = paceStatus === 'on_track' ? 'pace_on_track'
    : paceStatus === 'warning' ? 'pace_warning'
    : 'pace_danger';

  return (
    <div className={`relative overflow-hidden rounded-3xl ${heroColor} p-5 shadow-md`}>
      {/* Декоративный круг */}
      <div className="pointer-events-none absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/10 blur-2xl" />

      <p className="text-[10px] text-white/60 uppercase tracking-widest mb-1">
        {t('safe_to_spend')}
      </p>

      <p className="text-4xl font-bold text-white leading-none mb-1">
        {formatTenge(safeToSpend)}
      </p>

      <p className="text-white/70 text-xs mb-4">
        {isOverBudget ? t('budget_exceeded') : t('days_left', { count: daysRemaining })}
      </p>

      {/* 2 метрики */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white/10 border border-white/20 rounded-2xl px-3 py-2">
          <div className="flex items-center gap-1 mb-1">
            <Sun size={11} className="text-white/60" />
            <p className="text-[9px] text-white/60 uppercase tracking-wider">{t('daily_limit')}</p>
          </div>
          <p className={`text-base font-bold ${dailyLimit < 0 ? 'text-red-200' : 'text-white'}`}>
            {dailyLimit < 0 ? t('budget_exceeded') : formatTenge(dailyLimit)}
          </p>
        </div>

        <button
          onClick={() => navigateTo('budget')}
          className="bg-white/10 border border-white/20 rounded-2xl px-3 py-2 text-left transition-colors hover:bg-white/15"
        >
          <div className="flex items-center gap-1 mb-1">
            {paceStatus === 'on_track'
              ? <TrendUp size={11} className="text-white/60" />
              : <TrendDown size={11} className="text-white/60" />
            }
            <p className="text-[9px] text-white/60 uppercase tracking-wider">
              {t('forecast')}
            </p>
          </div>
          <p className={`text-base font-bold ${
            paceStatus === 'danger' ? 'text-red-200'
            : paceStatus === 'warning' ? 'text-yellow-200'
            : 'text-white'
          }`}>
            {t(paceKey)}
          </p>
        </button>
      </div>

      {!hasPeriod && (
        <button
          onClick={() => navigateTo('budget')}
          className="mt-3 w-full text-center text-[11px] text-white/60 border border-white/20 rounded-xl py-2"
        >
          {t('setup_period')}
        </button>
      )}
    </div>
  );
}

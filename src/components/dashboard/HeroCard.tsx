import { useTranslation } from 'react-i18next';
import { useEngine } from '../../store/useFinanceEngine';
import { formatTenge } from '../../lib/calculations';
import { navigateTo } from '../../lib/navigation';
import { Sun, TrendDown, TrendUp, ArrowRight } from '@phosphor-icons/react';

export function HeroCard() {
  const { t } = useTranslation();
  const engine = useEngine();

  if (!engine) return null;

  const { safeToSpend, dailyLimit, daysRemaining, paceStatus, isOverBudget, hasPeriod } = engine;

  const amountColor = isOverBudget
    ? 'var(--expense)'
    : paceStatus === 'danger'
    ? 'var(--warning)'
    : 'var(--cer)';

  const paceKey = paceStatus === 'on_track' ? 'pace_on_track'
    : paceStatus === 'warning' ? 'pace_warning'
    : 'pace_danger';

  return (
    <div
      className="relative overflow-hidden rounded-3xl hero-card card-glow"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        padding: '20px',
      }}
    >
      {/* Accent glow top-right */}
      <div
        className="pointer-events-none absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl"
        style={{ background: `${amountColor}18` }}
      />

      <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text3)' }}>
        {t('safe_to_spend')}
      </p>

      <p
        className="text-5xl font-extrabold leading-none mb-1 tabular-nums"
        style={{ color: amountColor }}
      >
        {formatTenge(safeToSpend)}
      </p>

      <p className="text-xs mb-5" style={{ color: 'var(--text3)' }}>
        {isOverBudget ? t('budget_exceeded') : t('days_left', { count: daysRemaining })}
      </p>

      {/* 2 метрики */}
      <div className="grid grid-cols-2 gap-2">
        <div
          className="rounded-2xl px-3 py-3"
          style={{ background: 'var(--card2)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-1 mb-1.5">
            <Sun size={11} style={{ color: 'var(--text3)' }} />
            <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text3)' }}>
              {t('daily_limit')}
            </p>
          </div>
          <p
            className="text-base font-bold tabular-nums"
            style={{ color: dailyLimit < 0 ? 'var(--expense)' : 'var(--income)' }}
          >
            {dailyLimit < 0 ? t('budget_exceeded') : formatTenge(dailyLimit)}
          </p>
        </div>

        <button
          onClick={() => navigateTo('budget')}
          className="rounded-2xl px-3 py-3 text-left transition-all active:scale-[0.97]"
          style={{ background: 'var(--card2)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-1 mb-1.5">
            {paceStatus === 'on_track'
              ? <TrendUp size={11} style={{ color: 'var(--text3)' }} />
              : <TrendDown size={11} style={{ color: 'var(--text3)' }} />
            }
            <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text3)' }}>
              {t('forecast')}
            </p>
          </div>
          <p
            className="text-base font-bold"
            style={{
              color: paceStatus === 'danger'
                ? 'var(--expense)'
                : paceStatus === 'warning'
                ? 'var(--warning)'
                : 'var(--income)',
            }}
          >
            {t(paceKey)}
          </p>
        </button>
      </div>

      {!hasPeriod && (
        <button
          onClick={() => navigateTo('budget')}
          className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-[11px] font-semibold transition-all active:scale-[0.98]"
          style={{
            background: 'var(--cer-light)',
            color: 'var(--cer)',
            border: '1px solid var(--cer)',
          }}
        >
          {t('setup_period')}
          <ArrowRight size={12} weight="bold" />
        </button>
      )}
    </div>
  );
}

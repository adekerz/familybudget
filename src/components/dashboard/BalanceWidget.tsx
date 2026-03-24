import { TrendingUp, Clock } from 'lucide-react';
import { useBudgetSummary } from '../../store/useBudgetStore';
import { formatMoney } from '../../lib/format';
import { INCOME_SOURCE_LABELS } from '../../constants/categories';

export function BalanceWidget() {
  const summary = useBudgetSummary();

  const nextDate = new Date(summary.nextIncomeDate).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
  });
  const sourceLabel = INCOME_SOURCE_LABELS[summary.nextIncomeSource] ?? '';

  const pct =
    summary.flexibleBudget > 0
      ? Math.min(100, (summary.flexibleRemaining / summary.flexibleBudget) * 100)
      : 0;

  const barOpacity =
    pct > 50 ? 'bg-white/70' : pct > 25 ? 'bg-white/50' : 'bg-white/30';

  return (
    <div className="relative overflow-hidden rounded-2xl bg-accent p-4 shadow-md">
      {/* Subtle glow circle */}
      <div className="pointer-events-none absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10 blur-2xl" />

      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs text-white/70 uppercase tracking-widest mb-0.5">Свободных денег</p>
          <p className="text-2xl font-bold text-white leading-none font-sans">
            {formatMoney(summary.flexibleRemaining)}
          </p>
        </div>
        <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
          <TrendingUp size={18} strokeWidth={2} className="text-white" />
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 rounded-full bg-white/20 mb-3 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barOpacity}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="text-white/80 text-sm font-sans">
            Дневной лимит:{' '}
            <span className="font-bold text-white">
              {formatMoney(summary.dailyFlexibleLimit)}
            </span>
            <span className="text-white/70 font-normal">/день</span>
          </p>
        </div>
        <div className="flex items-center gap-1 bg-white/15 border border-white/20 rounded-full px-2.5 py-1 shrink-0">
          <Clock size={11} strokeWidth={2} className="text-white/70" />
          <p className="text-white/70 text-xs leading-none">
            До {sourceLabel}:{' '}
            <span className="text-white font-bold">
              {summary.daysUntilNextIncome} дн
            </span>{' '}
            <span className="text-white/60">({nextDate})</span>
          </p>
        </div>
      </div>
    </div>
  );
}

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

  const barColor =
    pct > 50 ? '#2EA043' : pct > 25 ? '#E3B341' : '#F85149';

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0e2137] to-[#161B22] border border-[#30363D] p-5 shadow-xl">
      {/* Glow */}
      <div className="pointer-events-none absolute -top-10 -right-10 w-48 h-48 rounded-full bg-accent/10 blur-3xl" />

      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs text-muted uppercase tracking-widest mb-1">Свободных денег</p>
          <p className="text-3xl font-bold text-white font-mono leading-none">
            {formatMoney(summary.flexibleRemaining)}
          </p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center">
          <TrendingUp size={20} className="text-accent" />
        </div>
      </div>

      {/* progress bar */}
      <div className="h-1.5 rounded-full bg-[#30363D] mb-4 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted">Дневной лимит</p>
          <p className="text-lg font-semibold text-accent font-mono">
            {formatMoney(summary.dailyFlexibleLimit)}
            <span className="text-sm text-muted font-normal">/день</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted flex items-center gap-1 justify-end">
            <Clock size={11} /> До следующего прихода
          </p>
          <p className="text-sm font-medium text-white">
            {summary.daysUntilNextIncome} дн · {sourceLabel} ({nextDate})
          </p>
        </div>
      </div>
    </div>
  );
}

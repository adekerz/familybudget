import { useBudgetSummary } from '../../store/useBudgetStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { formatMoney } from '../../lib/format';

export function BalanceWidget() {
  const summary = useBudgetSummary();
  const incomeSources = useSettingsStore((s) => s.incomeSources);

  const nextDate = new Date(summary.nextIncomeDate).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'short',
  });
  const sourceLabel = incomeSources.find((s) => s.id === summary.nextIncomeSource)?.name ?? '';

  const distributable = summary.mandatoryBudget + summary.flexibleBudget + summary.savingsBudget;
  const pct = distributable > 0
    ? Math.min(100, Math.max(0, (summary.totalBalance / distributable) * 100))
    : 0;
  const barOpacity = pct > 50 ? 'bg-white/70' : pct > 25 ? 'bg-white/50' : 'bg-white/30';

  const days = summary.daysUntilNextIncome;
  const daysBadgeBg = days <= 3 ? 'bg-danger/20' : days <= 7 ? 'bg-warning/20' : 'bg-white/15';

  return (
    <div className="relative overflow-hidden rounded-2xl bg-accent p-4 shadow-md">
      <div className="pointer-events-none absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10 blur-2xl" />

      {/* Top row */}
      <div className="flex items-start justify-between mb-1">
        <p className="text-[9px] text-white/60 uppercase tracking-widest">Свободных денег</p>
        <div className={`flex items-center gap-1 ${daysBadgeBg} border border-white/20 rounded-full px-2.5 py-1 shrink-0`}>
          <p className="text-white text-xs font-bold leading-none">
            {days} дн
          </p>
        </div>
      </div>

      {/* Amount */}
      <p className="text-3xl font-bold text-white leading-none font-sans mb-3">
        {formatMoney(summary.totalBalance)}
      </p>

      {/* Progress bar */}
      <div className="h-1 rounded-full bg-white/20 mb-3 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barOpacity}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Divider + bottom grid */}
      <div className="pt-3 border-t border-white/15 grid grid-cols-2 gap-3">
        <div>
          <p className="text-[9px] text-white/60 uppercase tracking-wider mb-0.5">Дневной лимит</p>
          <p className="text-xs font-bold text-white">{formatMoney(summary.dailyFlexibleLimit)}/день</p>
        </div>
        <div>
          <p className="text-[9px] text-white/60 uppercase tracking-wider mb-0.5">Следующий приход</p>
          <p className="text-xs font-bold text-white">{nextDate} · {sourceLabel}</p>
        </div>
      </div>
    </div>
  );
}

import { useBudgetSummary } from '../../store/useBudgetStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { formatMoney } from '../../lib/format';
import { Clock, Sun, TrendUp, Wallet } from '@phosphor-icons/react';

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
  const barColor = pct > 50 ? 'bg-white/70' : pct > 25 ? 'bg-white/50' : 'bg-white/30';

  const days = summary.daysUntilNextIncome;
  const daysBadgeBg = days <= 3 ? 'bg-danger/20' : days <= 7 ? 'bg-warning/20' : 'bg-white/15';

  const forecast = summary.forecastFlexibleSpend;
  const forecastOver = forecast > summary.flexibleBudget;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-accent p-4 shadow-md">
      <div className="pointer-events-none absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10 blur-2xl" />

      {/* Top row */}
      <div className="flex items-start justify-between mb-1">
        <p className="text-[9px] text-white/60 uppercase tracking-widest">Остаток от зарплаты</p>
        <div className={`${daysBadgeBg} border border-white/20 rounded-full px-2.5 py-1 shrink-0`}>
          <p className="text-white text-xs font-bold leading-none">{days} дн</p>
        </div>
      </div>

      {/* Main amount */}
      <p className="text-3xl font-bold text-white leading-none font-sans mb-3">
        {formatMoney(summary.totalBalance)}
      </p>

      {/* Progress bar */}
      <div className="h-1 rounded-full bg-white/20 mb-3 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex items-center gap-1.5 mb-2 px-0.5">
        <Clock size={11} className="text-white/60 shrink-0" />
        <p className="text-[10px] text-white/60 leading-none">
          С {new Date(summary.periodStart).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* 3 key metrics */}
      <div className="pt-3 border-t border-white/15 grid grid-cols-3 gap-2">
        <div className="bg-white/10 border border-white/20 rounded-[10px] p-2 flex flex-col justify-between">
          <div className="flex items-center gap-1 mb-1 text-white/70">
            <Sun size={12} weight="fill" />
            <p className="text-[9px] uppercase tracking-wider">На день</p>
          </div>
          <p className="text-sm font-bold text-white leading-none">{formatMoney(summary.dailyFlexibleLimit)}</p>
        </div>

        <div className="bg-white/10 border border-white/20 rounded-[10px] p-2 flex flex-col justify-between">
          <div className="flex items-center gap-1 mb-1 text-white/70">
            <TrendUp size={12} weight="bold" />
            <p className="text-[9px] uppercase tracking-wider">Прогноз трат</p>
          </div>
          <p className={`text-sm font-bold leading-none mb-1.5 ${forecastOver ? 'text-[#ffb2b2]' : 'text-white'}`}>
            {formatMoney(forecast)}
          </p>
          {summary.flexibleBudget > 0 && (
            <div className="h-1 rounded-full bg-white/20 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${forecastOver ? 'bg-[#ffb2b2]' : 'bg-white/70'}`}
                style={{ width: `${Math.min(100, Math.round((forecast / summary.flexibleBudget) * 100))}%` }}
              />
            </div>
          )}
        </div>

        <div className="bg-white/10 border border-white/20 rounded-[10px] p-2 flex flex-col justify-between min-w-0">
          <div className="flex items-center gap-1 mb-1 text-white/70">
            <Wallet size={12} weight="fill" />
            <p className="text-[9px] uppercase tracking-wider truncate">Приход</p>
          </div>
          <p className="text-xs font-bold text-white leading-tight truncate">
            {nextDate}
            <span className="block text-[9px] font-normal text-white/70 truncate">{sourceLabel}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

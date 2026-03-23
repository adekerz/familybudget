import { AlertTriangle } from 'lucide-react';
import { useBudgetSummary } from '../../store/useBudgetStore';
import { formatMoney } from '../../lib/format';

export function OverBudgetAlert() {
  const s = useBudgetSummary();

  const alerts: { label: string; over: number; color: string }[] = [];

  if (s.mandatoryRemaining < 0) {
    alerts.push({
      label: 'Обязательные расходы',
      over: Math.abs(s.mandatoryRemaining),
      color: '#F85149',
    });
  }
  if (s.flexibleRemaining < 0) {
    alerts.push({
      label: 'Гибкие расходы',
      over: Math.abs(s.flexibleRemaining),
      color: '#F85149',
    });
  }

  // Warn if >80%
  const mandatoryPct = s.mandatoryBudget > 0
    ? (s.mandatorySpent / s.mandatoryBudget) * 100 : 0;
  const flexiblePct = s.flexibleBudget > 0
    ? (s.flexibleSpent / s.flexibleBudget) * 100 : 0;

  const warnings: { label: string; pct: number }[] = [];
  if (mandatoryPct >= 80 && mandatoryPct < 100) {
    warnings.push({ label: 'Обязательные', pct: Math.round(mandatoryPct) });
  }
  if (flexiblePct >= 80 && flexiblePct < 100) {
    warnings.push({ label: 'Гибкие', pct: Math.round(flexiblePct) });
  }

  if (alerts.length === 0 && warnings.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.map((a) => (
        <div
          key={a.label}
          className="flex items-center gap-3 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3"
        >
          <AlertTriangle size={16} className="text-danger shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-danger">{a.label}: перерасход!</p>
            <p className="text-xs text-danger/70">Превышение на {formatMoney(a.over)}</p>
          </div>
        </div>
      ))}
      {warnings.map((w) => (
        <div
          key={w.label}
          className="flex items-center gap-3 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3"
        >
          <AlertTriangle size={16} className="text-warning shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-warning">{w.label}: {w.pct}% бюджета</p>
            <p className="text-xs text-warning/70">Осталось меньше 20% — будьте осторожны</p>
          </div>
        </div>
      ))}
    </div>
  );
}

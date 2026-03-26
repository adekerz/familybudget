import { useEffect } from 'react';
import { Warning } from '@phosphor-icons/react';
import { useBudgetSummary } from '../../store/useBudgetStore';
import { formatMoney } from '../../lib/format';
import { useAIStore } from '../../store/useAIStore';
import { buildOverspendPrompt } from '../../lib/aiPrompts';
import { callAI } from '../../lib/ai';

export function OverBudgetAlert() {
  const s = useBudgetSummary();

  const alerts: { label: string; over: number }[] = [];

  if (s.mandatoryRemaining < 0) {
    alerts.push({
      label: 'Обязательные расходы',
      over: Math.abs(s.mandatoryRemaining),
    });
  }
  if (s.flexibleRemaining < 0) {
    alerts.push({
      label: 'Гибкие расходы',
      over: Math.abs(s.flexibleRemaining),
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

  const { setOverspendAlert, lastOverspendAlert } = useAIStore();

  useEffect(() => {
    if (alerts.length === 0 || lastOverspendAlert) return;
    const first = alerts[0];
    const spent  = first.label.includes('Обязатель') ? s.mandatorySpent  : s.flexibleSpent;
    const budget = first.label.includes('Обязатель') ? s.mandatoryBudget : s.flexibleBudget;
    const prompt = buildOverspendPrompt(s, first.label, spent, budget);
    callAI([
      { role: 'system', content: prompt },
      { role: 'user',   content: 'Дай краткий совет.' },
    ], { maxTokens: 100 }).then(text => { if (text) setOverspendAlert(text); }).catch(() => {});
  }, [alerts.length]);

  if (alerts.length === 0 && warnings.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.map((a) => (
        <div
          key={a.label}
          className="flex items-center gap-3 rounded-xl border border-danger/30 bg-danger-bg px-4 py-3"
        >
          <Warning size={16} strokeWidth={2} className="text-danger shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-danger font-sans">
              {a.label}: перерасход!
            </p>
            <p className="text-xs text-danger/70 font-sans">
              Превышение на {formatMoney(a.over)}
            </p>
          </div>
        </div>
      ))}
      {warnings.map((w) => (
        <div
          key={w.label}
          className="flex items-center gap-3 rounded-xl border border-warning/30 bg-warning-bg px-4 py-3"
        >
          <Warning size={16} strokeWidth={2} className="text-warning shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-warning font-sans">
              {w.label}: {w.pct}% бюджета
            </p>
            <p className="text-xs text-warning/70 font-sans">
              Осталось меньше 20% — будьте осторожны
            </p>
          </div>
        </div>
      ))}
      {lastOverspendAlert && (
        <div className="rounded-xl border border-warning/30 bg-warning-bg px-4 py-2">
          <p className="text-xs text-warning italic">{lastOverspendAlert}</p>
        </div>
      )}
    </div>
  );
}

import { useEffect } from 'react';
import { Warning, ArrowRight } from '@phosphor-icons/react';
import { useBudgetSummary } from '../../store/useBudgetStore';
import { formatMoney } from '../../lib/format';
import { useAIStore } from '../../store/useAIStore';
import { buildOverspendPrompt } from '../../lib/aiPrompts';
import { callAI } from '../../lib/ai';

export function OverBudgetAlert() {
  const s = useBudgetSummary();

  const overages: { label: string; over: number; isWarning: boolean }[] = [];

  if (s.mandatoryRemaining < 0)
    overages.push({ label: 'Обязательные', over: Math.abs(s.mandatoryRemaining), isWarning: false });
  if (s.flexibleRemaining < 0)
    overages.push({ label: 'Гибкие', over: Math.abs(s.flexibleRemaining), isWarning: false });

  const mandatoryPct = s.mandatoryBudget > 0 ? (s.mandatorySpent / s.mandatoryBudget) * 100 : 0;
  const flexiblePct  = s.flexibleBudget  > 0 ? (s.flexibleSpent  / s.flexibleBudget)  * 100 : 0;
  if (mandatoryPct >= 80 && mandatoryPct < 100)
    overages.push({ label: 'Обязательные', over: mandatoryPct, isWarning: true });
  if (flexiblePct >= 80 && flexiblePct < 100)
    overages.push({ label: 'Гибкие', over: flexiblePct, isWarning: true });

  const { setOverspendAlert, lastOverspendAlert } = useAIStore();

  useEffect(() => {
    const realOver = overages.filter(o => !o.isWarning);
    if (realOver.length === 0 || lastOverspendAlert) return;
    const first = realOver[0];
    const spent  = first.label === 'Обязательные' ? s.mandatorySpent  : s.flexibleSpent;
    const budget = first.label === 'Обязательные' ? s.mandatoryBudget : s.flexibleBudget;
    const prompt = buildOverspendPrompt(s, first.label, spent, budget);
    callAI([
      { role: 'system', content: prompt },
      { role: 'user',   content: 'Дай краткий совет.' },
    ], { maxTokens: 100 }).then(text => { if (text) setOverspendAlert(text); }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overages.filter(o => !o.isWarning).length]);

  if (overages.length === 0) return null;

  // Объединяем alert + AI совет в один компактный блок
  return (
    <div className="rounded-xl border overflow-hidden"
         style={{ borderColor: overages.some(o => !o.isWarning) ? 'var(--danger)' : 'var(--warning)', opacity: 0.95 }}>
      {overages.map((item) => (
        <div
          key={item.label + item.isWarning}
          className={`flex items-center gap-3 px-3 py-2.5 ${
            item.isWarning
              ? 'bg-warning-bg border-b border-warning/20 last:border-b-0'
              : 'bg-danger-bg border-b border-danger/20 last:border-b-0'
          }`}
        >
          <Warning
            size={14}
            weight="fill"
            className={item.isWarning ? 'text-warning shrink-0' : 'text-danger shrink-0'}
          />
          <p className={`text-xs font-semibold flex-1 font-sans ${item.isWarning ? 'text-warning' : 'text-danger'}`}>
            {item.label}:{' '}
            {item.isWarning
              ? `${Math.round(item.over)}% бюджета`
              : `перерасход ${formatMoney(item.over)}`}
          </p>
        </div>
      ))}
      {/* AI совет — встроен в один блок без отдельной карточки */}
      {lastOverspendAlert && (
        <div className="flex items-start gap-2 px-3 py-2.5 bg-warning-bg/60">
          <ArrowRight size={12} className="text-warning/70 mt-0.5 shrink-0" />
          <p className="text-[11px] text-warning/80 font-sans leading-relaxed">{lastOverspendAlert}</p>
        </div>
      )}
    </div>
  );
}

import { AlertTriangle } from 'lucide-react';
import { useBudgetSummary } from '../../store/useBudgetStore';
import { formatMoney } from '../../lib/format';
import { Icon } from '../../lib/icons';

type CardState = 'normal' | 'warning' | 'danger';

function getCardState(spent: number, budget: number): CardState {
  if (budget <= 0) return 'normal';
  const ratio = spent / budget;
  if (ratio >= 1.0) return 'danger';
  if (ratio >= 0.8) return 'warning';
  return 'normal';
}

const cardBg: Record<CardState, string> = {
  normal:  'bg-card border-border',
  warning: 'bg-warning-bg border-warning/30',
  danger:  'bg-danger-bg border-danger/30',
};

const barBg: Record<CardState, string> = {
  normal:  'bg-accent',
  warning: 'bg-warning',
  danger:  'bg-danger',
};

interface CategoryCardProps {
  iconName: string;
  label: string;
  spent: number;
  budget: number;
  iconWrapClass: string;
}

function CategoryCard({ iconName, label, spent, budget, iconWrapClass }: CategoryCardProps) {
  const pct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
  const remaining = budget - spent;
  const state = getCardState(spent, budget);

  return (
    <div className={`flex-1 min-w-[140px] rounded-2xl border p-3 flex flex-col gap-2 ${cardBg[state]}`}>
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-7 h-7 rounded-[9px] flex items-center justify-center shrink-0 ${iconWrapClass}`}>
            <Icon name={iconName} size={14} strokeWidth={2} />
          </span>
          <span className="text-xs text-muted uppercase tracking-wider font-sans leading-tight truncate">
            {label}
          </span>
        </div>
        {state !== 'normal' && (
          <AlertTriangle size={12} className={state === 'danger' ? 'text-danger shrink-0' : 'text-warning shrink-0'} />
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-border overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barBg[state]}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div>
        <p className="text-sm font-bold text-ink font-sans">
          {formatMoney(spent)}
          <span className="text-muted font-normal text-[10px] ml-1">
            / {formatMoney(budget)}
          </span>
        </p>
        {state === 'danger' && (
          <p className="text-[10px] text-danger font-bold mt-0.5">
            перерасход {formatMoney(Math.abs(remaining))}
          </p>
        )}
        {state === 'warning' && (
          <p className="text-[10px] text-warning font-semibold mt-0.5">
            осталось {formatMoney(remaining)}
          </p>
        )}
        {state === 'normal' && remaining >= 0 && (
          <p className="text-[10px] text-muted mt-0.5">
            осталось {formatMoney(remaining)}
          </p>
        )}
      </div>
    </div>
  );
}

function FixedCard({ total }: { total: number }) {
  if (total <= 0) return null;
  return (
    <div className="flex-1 min-w-[140px] rounded-2xl bg-card border border-border p-3 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="w-7 h-7 rounded-[9px] flex items-center justify-center shrink-0 bg-muted/10">
          <Icon name="Shield" size={14} strokeWidth={2} className="text-muted" />
        </span>
        <span className="text-xs text-muted uppercase tracking-wider font-sans leading-tight">
          Фиксированные
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-border" />
      <div>
        <p className="text-sm font-bold text-ink font-sans">
          {formatMoney(total)}
        </p>
        <p className="text-[10px] text-muted font-sans mt-0.5">вычтено из дохода</p>
      </div>
    </div>
  );
}

export function CategoryCards() {
  const s = useBudgetSummary();

  return (
    <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
      <FixedCard total={s.fixedTotal} />
      <CategoryCard
        iconName="Home"
        label="Обязательные"
        spent={s.mandatorySpent}
        budget={s.mandatoryBudget}
        iconWrapClass="icon-wrap-cer"
      />
      <CategoryCard
        iconName="ShoppingCart"
        label="Гибкие"
        spent={s.flexibleSpent}
        budget={s.flexibleBudget}
        iconWrapClass="icon-wrap-sand"
      />
      <CategoryCard
        iconName="Landmark"
        label="Накопления"
        spent={s.savingsActual}
        budget={s.savingsBudget}
        iconWrapClass="icon-wrap-success"
      />
    </div>
  );
}

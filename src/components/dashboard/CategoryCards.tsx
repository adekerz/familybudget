import { useBudgetSummary } from '../../store/useBudgetStore';
import { formatMoney } from '../../lib/format';
import { ProgressBar } from '../ui/ProgressBar';
import { Icon } from '../../lib/icons';

type CardColor = 'mandatory' | 'flexible' | 'savings';

interface CategoryCardProps {
  iconName: string;
  label: string;
  spent: number;
  budget: number;
  color: CardColor;
  iconWrapClass: string;
}

function CategoryCard({ iconName, label, spent, budget, color, iconWrapClass }: CategoryCardProps) {
  const pct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
  const remaining = budget - spent;
  const isOver = remaining < 0;
  const isWarn = pct >= 80 && !isOver;

  return (
    <div className="flex-1 min-w-[140px] rounded-2xl bg-card border border-border p-3 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className={`w-7 h-7 rounded-[9px] flex items-center justify-center shrink-0 ${iconWrapClass}`}>
          <Icon name={iconName} size={14} strokeWidth={2} />
        </span>
        <span className="text-xs text-muted uppercase tracking-wider font-sans leading-tight">
          {label}
        </span>
      </div>

      <ProgressBar value={pct} color={color} />

      <div>
        <p className="text-sm font-bold text-ink font-sans">
          {formatMoney(spent)}
          <span className="text-muted font-normal text-[10px] ml-1">
            / {formatMoney(budget)}
          </span>
        </p>
        {isOver && (
          <p className="text-[10px] text-danger font-semibold mt-0.5">перерасход!</p>
        )}
        {isWarn && (
          <p className="text-[10px] text-warning font-semibold mt-0.5">{Math.round(pct)}% бюджета</p>
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
        color="mandatory"
        iconWrapClass="icon-wrap-cer"
      />
      <CategoryCard
        iconName="ShoppingCart"
        label="Гибкие"
        spent={s.flexibleSpent}
        budget={s.flexibleBudget}
        color="flexible"
        iconWrapClass="icon-wrap-sand"
      />
      <CategoryCard
        iconName="Landmark"
        label="Накопления"
        spent={s.savingsActual}
        budget={s.savingsBudget}
        color="savings"
        iconWrapClass="icon-wrap-success"
      />
    </div>
  );
}

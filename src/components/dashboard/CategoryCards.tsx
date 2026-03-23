import { useBudgetSummary } from '../../store/useBudgetStore';
import { formatMoney } from '../../lib/format';

interface CategoryCardProps {
  icon: string;
  label: string;
  spent: number;
  budget: number;
  color: string;
  accentBg: string;
}

function CategoryCard({ icon, label, spent, budget, color, accentBg }: CategoryCardProps) {
  const pct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
  const remaining = budget - spent;
  const isOver = remaining < 0;
  const isWarn = pct >= 80 && !isOver;

  const barColor = isOver ? '#F85149' : isWarn ? '#E3B341' : color;

  return (
    <div className="flex-1 min-w-[140px] rounded-xl bg-card border border-border p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span
          className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
          style={{ background: accentBg }}
        >
          {icon}
        </span>
        <span className="text-xs text-muted font-medium leading-tight">{label}</span>
      </div>

      <div className="h-1 rounded-full bg-border overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        />
      </div>

      <div>
        <p className="text-sm font-semibold font-mono text-white">
          {formatMoney(spent)}
        </p>
        <p className="text-[10px] text-muted">
          из {formatMoney(budget)}
          {isOver && (
            <span className="text-danger ml-1">· перерасход!</span>
          )}
          {isWarn && (
            <span className="text-warning ml-1">· {Math.round(pct)}%</span>
          )}
        </p>
      </div>
    </div>
  );
}

export function CategoryCards() {
  const s = useBudgetSummary();

  return (
    <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
      <CategoryCard
        icon="🔵"
        label="Обязательные"
        spent={s.mandatorySpent}
        budget={s.mandatoryBudget}
        color="#4A90D9"
        accentBg="rgba(74,144,217,0.15)"
      />
      <CategoryCard
        icon="🟢"
        label="Гибкие"
        spent={s.flexibleSpent}
        budget={s.flexibleBudget}
        color="#2EA043"
        accentBg="rgba(46,160,67,0.15)"
      />
      <CategoryCard
        icon="🟡"
        label="Накопления"
        spent={s.savingsActual}
        budget={s.savingsBudget}
        color="#E3B341"
        accentBg="rgba(227,179,65,0.15)"
      />
    </div>
  );
}

import { Warning } from '@phosphor-icons/react';
import { useBudgetSummary } from '../../store/useBudgetStore';
import { useExpenseStore } from '../../store/useExpenseStore';
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

// SVG-спарклайн за N недель
function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const w = 44, h = 16;
  const pts = data.map((v, i) =>
    `${(i / (data.length - 1)) * w},${h - (v / max) * (h - 2) - 1}`
  ).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ color }}>
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Дельта к прошлому месяцу
function MomDelta({ current, prev }: { current: number; prev: number }) {
  if (prev === 0) return null;
  const pct = Math.round(((current - prev) / prev) * 100);
  if (pct === 0) return null;
  const isUp = pct > 0;
  return (
    <span
      className="text-[10px] font-semibold font-sans"
      style={{ color: isUp ? '#9B2525' : '#15664E' }}
    >
      {isUp ? '+' : ''}{pct}%
    </span>
  );
}

// Считаем траты по типу за 4 недели текущего месяца
function getWeeklyByType(
  expenses: { date: string; amount: number; type: string }[],
  type: string,
  refDate: Date
): number[] {
  const year = refDate.getFullYear();
  const month = refDate.getMonth();
  return [0, 1, 2, 3].map(w => {
    const wStart = new Date(year, month, 1 + w * 7);
    const wEnd   = new Date(year, month, 7 + w * 7, 23, 59, 59);
    return expenses
      .filter(e => e.type === type && (() => { const d = new Date(e.date); return d >= wStart && d <= wEnd; })())
      .reduce((s, e) => s + e.amount, 0);
  });
}

// Сумма по типу за месяц
function sumByType(
  expenses: { date: string; amount: number; type: string }[],
  type: string,
  year: number,
  month: number
): number {
  return expenses
    .filter(e => {
      const d = new Date(e.date);
      return e.type === type && d.getFullYear() === year && d.getMonth() === month;
    })
    .reduce((s, e) => s + e.amount, 0);
}

interface CategoryCardProps {
  iconName: string;
  label: string;
  spent: number;
  budget: number;
  iconWrapClass: string;
  sparkData?: number[];
  sparkColor?: string;
  prevSpent?: number;
}

function CategoryCard({ iconName, label, spent, budget, iconWrapClass, sparkData, sparkColor, prevSpent }: CategoryCardProps) {
  const pct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
  const remaining = budget - spent;
  const state = getCardState(spent, budget);

  return (
    <div className={`rounded-2xl border p-3 flex flex-col gap-2 ${cardBg[state]}`}>
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
          <Warning size={12} className={state === 'danger' ? 'text-danger shrink-0' : 'text-warning shrink-0'} />
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
        <div className="flex items-end justify-between gap-1">
          <p className={`text-sm font-bold font-sans ${state === 'danger' ? 'text-danger' : 'text-ink'}`}>
            {formatMoney(spent)}
            <span className={`font-normal text-[10px] ml-1 ${state === 'danger' ? 'text-danger/70' : 'text-muted'}`}>
              / {formatMoney(budget)}
            </span>
          </p>
          <div className="flex items-center gap-1.5 shrink-0">
            {prevSpent !== undefined && <MomDelta current={spent} prev={prevSpent} />}
            {sparkData && sparkColor && <Sparkline data={sparkData} color={sparkColor} />}
          </div>
        </div>
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
    <div className="rounded-2xl bg-card border border-border p-3 flex flex-col gap-2">
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
  const expenses = useExpenseStore(st => st.expenses);
  const hasFixed = s.fixedTotal > 0;

  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth();
  const prevYear  = month === 0 ? year - 1 : year;
  const prevMonth = month === 0 ? 11 : month - 1;

  const mandatorySparkData = getWeeklyByType(expenses, 'mandatory', now);
  const flexibleSparkData  = getWeeklyByType(expenses, 'flexible', now);
  const savingsSparkData   = getWeeklyByType(expenses, 'savings', now);

  const mandatoryPrev = sumByType(expenses, 'mandatory', prevYear, prevMonth);
  const flexiblePrev  = sumByType(expenses, 'flexible',  prevYear, prevMonth);
  const savingsPrev   = sumByType(expenses, 'savings',   prevYear, prevMonth);

  return (
    <div className={`grid gap-2 ${hasFixed ? 'grid-cols-2' : 'grid-cols-3'}`}>
      {hasFixed && <FixedCard total={s.fixedTotal} />}
      <CategoryCard
        iconName="Home"
        label="Обязат."
        spent={s.mandatorySpent}
        budget={s.mandatoryBudget}
        iconWrapClass="icon-wrap-cer"
        sparkData={mandatorySparkData}
        sparkColor="#2274A5"
        prevSpent={mandatoryPrev}
      />
      <CategoryCard
        iconName="ShoppingCart"
        label="Гибкие"
        spent={s.flexibleSpent}
        budget={s.flexibleBudget}
        iconWrapClass="icon-wrap-sand"
        sparkData={flexibleSparkData}
        sparkColor="#7A5210"
        prevSpent={flexiblePrev}
      />
      <CategoryCard
        iconName="Landmark"
        label="Накопления"
        spent={s.savingsActual}
        budget={s.savingsBudget}
        iconWrapClass="icon-wrap-success"
        sparkData={savingsSparkData}
        sparkColor="#15664E"
        prevSpent={savingsPrev}
      />
    </div>
  );
}

import { Warning } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
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
      className="text-[10px] font-semibold"
      style={{ color: isUp ? 'var(--expense)' : 'var(--income)' }}
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
  sparkData?: number[];
  sparkColor: string;
  prevSpent?: number;
}

function CategoryCard({ iconName, label, spent, budget, sparkData, sparkColor, prevSpent }: CategoryCardProps) {
  const { t } = useTranslation();
  const pct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
  const remaining = budget - spent;
  const state = getCardState(spent, budget);

  const borderColor = state === 'danger' ? 'var(--expense)' : state === 'warning' ? 'var(--warning)' : 'var(--border)';
  const bgColor = state === 'danger' ? 'var(--expense-bg)' : state === 'warning' ? 'var(--warning-bg)' : 'var(--card)';
  const barColor = state === 'danger' ? 'var(--expense)' : state === 'warning' ? 'var(--warning)' : 'var(--cer)';
  const amountColor = state === 'danger' ? 'var(--expense)' : 'var(--ink)';

  return (
    <div
      className="rounded-2xl border p-3 flex flex-col gap-2 shrink-0 w-36 md:w-auto"
      style={{ background: bgColor, borderColor }}
    >
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-7 h-7 rounded-[9px] flex items-center justify-center shrink-0"
            style={{ background: 'var(--cer-light)', color: 'var(--cer)' }}
          >
            <Icon name={iconName} size={14} strokeWidth={2} />
          </span>
          <span className="text-xs uppercase tracking-wider font-sans leading-tight truncate" style={{ color: 'var(--text3)' }}>
            {label}
          </span>
        </div>
        {state !== 'normal' && (
          <Warning size={12} style={{ color: state === 'danger' ? 'var(--expense)' : 'var(--warning)', flexShrink: 0 }} />
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
        <div
          className="h-full rounded-full transition-all duration-500 bar-accent"
          style={{ width: `${pct}%`, background: barColor }}
        />
      </div>

      <div>
        <div className="flex items-end justify-between gap-1">
          <p className="text-sm font-bold font-sans" style={{ color: amountColor }}>
            {formatMoney(spent)}
            <span className="font-normal text-[10px] ml-1" style={{ color: 'var(--text3)' }}>
              / {formatMoney(budget)}
            </span>
          </p>
          <div className="flex items-center gap-1.5 shrink-0">
            {prevSpent !== undefined && <MomDelta current={spent} prev={prevSpent} />}
            {sparkData && <Sparkline data={sparkData} color={sparkColor} />}
          </div>
        </div>
        {state === 'danger' && (
          <p className="text-[10px] font-bold mt-0.5" style={{ color: 'var(--expense)' }}>
            {t('overspend')} {formatMoney(Math.abs(remaining))}
          </p>
        )}
        {state === 'warning' && (
          <p className="text-[10px] font-semibold mt-0.5" style={{ color: 'var(--warning)' }}>
            {t('remaining_amount')} {formatMoney(remaining)}
          </p>
        )}
        {state === 'normal' && remaining >= 0 && (
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--text3)' }}>
            {t('remaining_amount')} {formatMoney(remaining)}
          </p>
        )}
      </div>
    </div>
  );
}

function FixedCard({ total }: { total: number }) {
  const { t } = useTranslation();
  if (total <= 0) return null;
  return (
    <div
      className="rounded-2xl border p-3 flex flex-col gap-2 shrink-0 w-36 md:w-auto"
      style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-center gap-2">
        <span
          className="w-7 h-7 rounded-[9px] flex items-center justify-center shrink-0"
          style={{ background: 'var(--card2)', color: 'var(--text3)' }}
        >
          <Icon name="Shield" size={14} strokeWidth={2} />
        </span>
        <span className="text-xs uppercase tracking-wider font-sans leading-tight" style={{ color: 'var(--text3)' }}>
          {t('fixed')}
        </span>
      </div>
      <div className="h-1.5 rounded-full" style={{ background: 'var(--border)' }} />
      <div>
        <p className="text-sm font-bold font-sans" style={{ color: 'var(--ink)' }}>
          {formatMoney(total)}
        </p>
        <p className="text-[10px] mt-0.5" style={{ color: 'var(--text3)' }}>
          {t('deducted_from_income')}
        </p>
      </div>
    </div>
  );
}

export function CategoryCards() {
  const { t } = useTranslation();
  const s = useBudgetSummary();
  const expenses = useExpenseStore(st => st.expenses);

  const now        = new Date();
  const year       = now.getFullYear();
  const month      = now.getMonth();
  const prevYear   = month === 0 ? year - 1 : year;
  const prevMonth  = month === 0 ? 11 : month - 1;

  const mandatorySparkData = getWeeklyByType(expenses, 'mandatory', now);
  const flexibleSparkData  = getWeeklyByType(expenses, 'flexible', now);
  const savingsSparkData   = getWeeklyByType(expenses, 'savings', now);

  const mandatoryPrev = sumByType(expenses, 'mandatory', prevYear, prevMonth);
  const flexiblePrev  = sumByType(expenses, 'flexible',  prevYear, prevMonth);
  const savingsPrev   = sumByType(expenses, 'savings',   prevYear, prevMonth);

  return (
    // Mobile: горизонтальный scroll; Desktop: grid-cols-3 (или 4 с Fixed)
    <div className="flex gap-2 overflow-x-auto no-scrollbar md:grid md:overflow-visible md:gap-2"
      style={{ gridTemplateColumns: s.fixedTotal > 0 ? 'repeat(4,1fr)' : 'repeat(3,1fr)' }}
    >
      {s.fixedTotal > 0 && <FixedCard total={s.fixedTotal} />}
      <CategoryCard
        iconName="House"
        label={t('mandatory')}
        spent={s.mandatorySpent}
        budget={s.mandatoryBudget}
        sparkData={mandatorySparkData}
        sparkColor="var(--cer)"
        prevSpent={mandatoryPrev}
      />
      <CategoryCard
        iconName="ShoppingCart"
        label={t('flexible')}
        spent={s.flexibleSpent}
        budget={s.flexibleBudget}
        sparkData={flexibleSparkData}
        sparkColor="var(--text2)"
        prevSpent={flexiblePrev}
      />
      <CategoryCard
        iconName="PiggyBank"
        label={t('savings')}
        spent={s.savingsActual}
        budget={s.savingsBudget}
        sparkData={savingsSparkData}
        sparkColor="var(--income)"
        prevSpent={savingsPrev}
      />
    </div>
  );
}

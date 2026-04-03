import { CalendarBlank, ArrowRight } from '@phosphor-icons/react';
import { navigateTo } from '../../lib/navigation';
import type { PlannedTransaction } from '../../types';

const fmt = (n: number) =>
  new Intl.NumberFormat('ru-KZ', { style: 'currency', currency: 'KZT', maximumFractionDigits: 0 }).format(n);

function daysLabel(dateStr: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return 'Сегодня';
  if (diff === 1) return 'Завтра';
  return `через ${diff} дн.`;
}

interface Props {
  transactions: PlannedTransaction[];
}

export function UpcomingPaymentsWidget({ transactions }: Props) {
  if (transactions.length === 0) return null;

  const visible = transactions.slice(0, 3);
  const hiddenCount = transactions.length - visible.length;

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Шапка */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <CalendarBlank size={14} className="text-accent" />
          <span className="text-xs font-semibold text-ink">Ближайшие платежи</span>
        </div>
        <button
          onClick={() => navigateTo('budget')}
          className="flex items-center gap-1 text-xs text-accent"
        >
          Все <ArrowRight size={12} />
        </button>
      </div>

      {/* Список */}
      <div className="divide-y divide-border">
        {visible.map(tx => {
          const label = daysLabel(tx.scheduledDate);
          return (
            <div key={tx.id} className="flex items-center gap-3 px-4 py-2.5">
              {/* Дата-бейдж */}
              <div className={`shrink-0 rounded-lg px-2 py-1 text-center min-w-[52px] ${
                label === 'Сегодня'
                  ? 'bg-red-50 border border-red-200'
                  : label === 'Завтра'
                  ? 'bg-amber-50 border border-amber-200'
                  : 'bg-alice border border-border'
              }`}>
                <div className={`text-[10px] font-semibold leading-tight ${
                  label === 'Сегодня' ? 'text-red-600'
                  : label === 'Завтра' ? 'text-amber-600'
                  : 'text-muted'
                }`}>
                  {label}
                </div>
              </div>

              {/* Название */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink truncate">{tx.title}</p>
                {tx.isFixed && (
                  <p className="text-[10px] text-muted">Фиксированный</p>
                )}
              </div>

              {/* Сумма */}
              <span className="text-sm font-semibold text-ink shrink-0">
                {fmt(tx.amount)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Если скрытые */}
      {hiddenCount > 0 && (
        <button
          onClick={() => navigateTo('budget')}
          className="w-full py-2 text-xs text-muted text-center hover:text-ink border-t border-border transition-colors"
        >
          + ещё {hiddenCount}
        </button>
      )}
    </div>
  );
}

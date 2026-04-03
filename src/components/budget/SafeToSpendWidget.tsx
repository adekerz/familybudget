import { ArrowRight } from '@phosphor-icons/react';
import { navigateTo } from '../../lib/navigation';
import type { PayPeriodSummary } from '../../types';

const fmt = (n: number) =>
  new Intl.NumberFormat('ru-KZ', { style: 'currency', currency: 'KZT', maximumFractionDigits: 0 }).format(n);

interface Props { summary: PayPeriodSummary; compact?: boolean; }

export function SafeToSpendWidget({ summary, compact = false }: Props) {
  const { safeToSpend, period, pace } = summary;
  const isNegative = safeToSpend < 0;
  const isPending = new Date(period.startDate) > new Date();
  const daysTotal = Math.max(1, Math.ceil(
    (new Date(period.endDate).getTime() - new Date(period.startDate).getTime()) / 86400000
  ));
  const daysPassed = Math.max(0, Math.ceil(
    (new Date().getTime() - new Date(period.startDate).getTime()) / 86400000
  ));
  const progress = Math.min(100, Math.round((daysPassed / daysTotal) * 100));

  const bgColor = isNegative || pace.status === 'danger'
    ? 'bg-red-50 border-red-200'
    : pace.status === 'warning'
    ? 'bg-amber-50 border-amber-200'
    : 'bg-green-50 border-green-200';

  const textColor = isNegative || pace.status === 'danger'
    ? 'text-red-600'
    : pace.status === 'warning'
    ? 'text-amber-600'
    : 'text-green-600';

  if (isPending) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-amber-700 font-semibold">
            Период ещё не начался
          </span>
          <span className="text-xs bg-amber-100 text-amber-600 px-2 py-1 rounded-full">
            Ожидание
          </span>
        </div>
        <div className="text-2xl font-bold text-amber-600 mb-1">
          {fmt(safeToSpend)}
        </div>
        <p className="text-xs text-amber-600/80">
          Период начнётся {new Date(period.startDate).toLocaleDateString('ru-RU', {
            day: 'numeric', month: 'long'
          })} · через {Math.ceil((new Date(period.startDate).getTime() - Date.now()) / 86400000)} дней
        </p>
        <p className="text-[10px] text-amber-600/60 mt-1">
          Если ЗП уже пришла — закрой этот период и создай новый с сегодняшней датой
        </p>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border p-4 ${bgColor}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted font-medium">Безопасно потратить</span>
        {compact && (
          <button onClick={() => navigateTo('budget')} className="flex items-center gap-1 text-xs text-accent">
            Детали <ArrowRight size={12} />
          </button>
        )}
      </div>
      <div className={`font-bold ${compact ? 'text-2xl' : 'text-4xl'} ${textColor}`}>
        {fmt(safeToSpend)}
      </div>
      <div className="mt-3">
        <div className="flex justify-between text-xs text-muted mb-1">
          <span>День {daysPassed} из {daysTotal}</span>
          <span>{pace.daysRemaining} дн. до ЗП</span>
        </div>
        <div className="h-2 rounded-full bg-card/60 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              pace.status === 'danger' ? 'bg-red-400' :
              pace.status === 'warning' ? 'bg-amber-400' : 'bg-green-400'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

import { CalendarDays } from 'lucide-react';
import { getNextIncomeDates } from '../../lib/dates';
import { INCOME_SOURCE_LABELS } from '../../constants/categories';

export function IncomeTimeline() {
  const dates = getNextIncomeDates().slice(0, 4);

  return (
    <div className="rounded-xl bg-card border border-border px-4 py-3">
      <div className="flex items-center gap-1.5 mb-3">
        <CalendarDays size={13} strokeWidth={2} className="text-muted" />
        <p className="text-xs font-semibold text-muted uppercase tracking-wider">
          Ближайшие поступления
        </p>
      </div>
      <div className="flex items-stretch gap-1 flex-wrap">
        {dates.map(({ date, source }, idx) => {
          const isFirst = idx === 0;
          const label = new Date(date).toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'short',
          });
          const sourceShort = INCOME_SOURCE_LABELS[source]?.split(' ')[0] ?? '';
          return (
            <div
              key={source}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 border text-xs font-sans ${
                isFirst
                  ? 'bg-accent border-accent text-white'
                  : 'bg-alice border border-alice-dark text-text2'
              }`}
            >
              <span className="font-bold">{label}</span>
              <span className={`${isFirst ? 'text-white/70' : 'text-muted'}`}>
                {sourceShort}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

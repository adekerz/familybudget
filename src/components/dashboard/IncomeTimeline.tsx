import { getNextIncomeDates } from '../../lib/dates';
import { INCOME_SOURCE_LABELS } from '../../constants/categories';

export function IncomeTimeline() {
  const dates = getNextIncomeDates().slice(0, 4);

  return (
    <div className="rounded-xl bg-card border border-border px-4 py-3">
      <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
        Ближайшие поступления
      </p>
      <div className="flex items-center gap-1">
        {dates.map(({ date, source }, idx) => {
          const isFirst = idx === 0;
          const label = new Date(date).toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'short',
          });
          return (
            <div key={source} className="flex items-center gap-1 flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-2.5 h-2.5 rounded-full border-2 ${
                    isFirst
                      ? 'bg-accent border-accent shadow-[0_0_6px_rgba(0,180,216,0.6)]'
                      : 'bg-transparent border-border'
                  }`}
                />
                <p className={`text-[10px] mt-1 font-medium ${isFirst ? 'text-accent' : 'text-muted'}`}>
                  {label}
                </p>
                <p className="text-[9px] text-muted/60 leading-tight text-center">
                  {INCOME_SOURCE_LABELS[source]?.split(' ')[0]}
                </p>
              </div>
              {idx < dates.length - 1 && (
                <div className="h-px bg-border flex-1 mb-5" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Trash2, TrendingUp } from 'lucide-react';
import { useIncomeStore } from '../../store/useIncomeStore';
import { formatMoney, formatDateFull } from '../../lib/format';
import { INCOME_SOURCE_LABELS } from '../../constants/categories';

export function IncomeList() {
  const incomes = useIncomeStore((s) => s.incomes);
  const removeIncome = useIncomeStore((s) => s.removeIncome);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  if (incomes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center">
          <TrendingUp size={26} className="text-accent/60" />
        </div>
        <p className="text-muted text-sm">Доходов пока нет</p>
        <p className="text-muted/60 text-xs">Нажмите «+ Добавить» чтобы начать</p>
      </div>
    );
  }

  // Group by month
  const grouped = incomes.reduce<Record<string, typeof incomes>>((acc, inc) => {
    const key = new Date(inc.date).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
    if (!acc[key]) acc[key] = [];
    acc[key].push(inc);
    return acc;
  }, {});

  const months = Object.entries(grouped).sort(
    ([a], [b]) => new Date(grouped[b][0].date).getTime() - new Date(grouped[a][0].date).getTime()
  );

  return (
    <div className="space-y-6">
      {months.map(([month, items]) => (
        <div key={month}>
          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2 capitalize">
            {month}
          </p>
          <div className="space-y-2">
            {[...items]
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((inc) => (
                <div
                  key={inc.id}
                  className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3"
                >
                  <div className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                    <TrendingUp size={16} className="text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">
                      {INCOME_SOURCE_LABELS[inc.source]}
                    </p>
                    <p className="text-xs text-muted">{formatDateFull(inc.date)}</p>
                    {inc.note && (
                      <p className="text-xs text-muted/60 italic truncate">{inc.note}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold font-mono text-accent">
                      +{formatMoney(inc.amount)}
                    </p>
                    {confirmId === inc.id ? (
                      <div className="flex gap-2 mt-1">
                        <button
                          onClick={() => { removeIncome(inc.id); setConfirmId(null); }}
                          className="text-[10px] text-danger font-medium"
                        >
                          Удалить
                        </button>
                        <button
                          onClick={() => setConfirmId(null)}
                          className="text-[10px] text-muted"
                        >
                          Отмена
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmId(inc.id)}
                        className="mt-1 text-muted/40 hover:text-danger transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

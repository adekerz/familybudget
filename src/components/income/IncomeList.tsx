import { TrendUp, Trash } from '@phosphor-icons/react';
import { useIncomeStore } from '../../store/useIncomeStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { formatMoney, formatDateFull } from '../../lib/format';
import { useUndoStore } from '../../store/useUndoStore';

export function IncomeList() {
  const incomes = useIncomeStore((s) => s.incomes);
  const removeIncome = useIncomeStore((s) => s.removeIncome);
  const incomeSources = useSettingsStore((s) => s.incomeSources);

  function getSourceName(sourceId: string): string {
    return incomeSources.find((s) => s.id === sourceId)?.name ?? sourceId;
  }

  function handleDelete(incId: string, sourceName: string, amount: number) {
    const snapshot = useIncomeStore.getState().incomes;
    useIncomeStore.setState({ incomes: snapshot.filter(i => i.id !== incId) });
    useUndoStore.getState().show({
      message: `Доход «${sourceName}» ${formatMoney(amount)} удалён`,
      duration: 5000,
      onUndo: () => {
        useIncomeStore.setState({ incomes: snapshot });
      },
      onConfirm: () => {
        removeIncome(incId);
      },
    });
  }

  if (incomes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <div className="w-14 h-14 rounded-2xl bg-accent-light border border-accent/20 flex items-center justify-center">
          <TrendUp size={26} strokeWidth={2} className="text-accent" />
        </div>
        <p className="text-muted text-sm font-sans">Доходов пока нет</p>
        <p className="text-muted/60 text-xs font-sans">Нажмите «+ Добавить» чтобы начать</p>
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
          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2 capitalize font-sans">
            {month}
          </p>
          <div className="space-y-2">
            {[...items]
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((inc) => (
                <div
                  key={inc.id}
                  className="flex items-center gap-3 bg-card border border-border rounded-xl p-3"
                >
                  <div className="w-9 h-9 rounded-xl bg-accent-light border border-accent/20 flex items-center justify-center shrink-0">
                    <TrendUp size={16} strokeWidth={2} className="text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <p className="text-sm font-semibold text-ink font-sans">
                        {getSourceName(inc.source)}
                      </p>
                      <span className="bg-accent-light text-accent text-xs rounded-full px-2 py-0.5 font-sans font-medium">
                        {new Date(inc.date).toLocaleDateString('ru-RU', { month: 'short' })}
                      </span>
                    </div>
                    <p className="text-xs text-muted font-sans">{formatDateFull(inc.date)}</p>
                    {inc.note && (
                      <p className="text-xs text-muted/60 italic truncate font-sans">{inc.note}</p>
                    )}
                    {inc.distribution.customRatios && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        <span className="bg-sand rounded-full text-text2 text-xs px-2 py-0.5">
                          Об. {Math.round(inc.distribution.customRatios.mandatory * 100)}%
                        </span>
                        <span className="bg-sand rounded-full text-text2 text-xs px-2 py-0.5">
                          Гибк. {Math.round(inc.distribution.customRatios.flexible * 100)}%
                        </span>
                        <span className="bg-sand rounded-full text-text2 text-xs px-2 py-0.5">
                          Нак. {Math.round(inc.distribution.customRatios.savings * 100)}%
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0 flex flex-col items-end gap-1">
                    <p className="text-sm font-bold text-ink font-sans">
                      +{formatMoney(inc.amount)}
                    </p>
                    <button
                      onClick={() => handleDelete(inc.id, getSourceName(inc.source), inc.amount)}
                      className="text-muted/40 hover:text-danger transition-colors p-1"
                    >
                      <Trash size={13} strokeWidth={2} />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

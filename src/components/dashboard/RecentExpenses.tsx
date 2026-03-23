import { useExpenseStore } from '../../store/useExpenseStore';
import { useCategoryStore } from '../../store/useCategoryStore';
import { formatMoney, formatDate } from '../../lib/format';
import { Receipt } from 'lucide-react';

export function RecentExpenses() {
  const expenses = useExpenseStore((s) => s.expenses);
  const getCategory = useCategoryStore((s) => s.getCategory);

  const recent = [...expenses]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  if (recent.length === 0) {
    return (
      <div className="rounded-xl bg-card border border-border p-5 flex flex-col items-center gap-2 text-center">
        <Receipt size={28} className="text-muted/40" />
        <p className="text-sm text-muted">Расходов пока нет</p>
        <p className="text-xs text-muted/60">Добавьте первый расход через кнопки выше</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-card border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <p className="text-xs font-semibold text-muted uppercase tracking-wider">Последние расходы</p>
      </div>
      <ul className="divide-y divide-border">
        {recent.map((exp) => {
          const cat = getCategory(exp.categoryId);
          const typeColor =
            exp.type === 'mandatory' ? '#4A90D9' :
            exp.type === 'flexible'  ? '#2EA043' : '#E3B341';
          return (
            <li key={exp.id} className="flex items-center gap-3 px-4 py-3">
              <span className="text-xl w-8 text-center">{cat?.icon ?? '💸'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {cat?.name ?? 'Прочее'}
                </p>
                {exp.description && (
                  <p className="text-xs text-muted truncate">{exp.description}</p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold font-mono text-white">
                  -{formatMoney(exp.amount)}
                </p>
                <p className="text-[10px]" style={{ color: typeColor }}>
                  {formatDate(exp.date)}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

import { useExpenseStore } from '../../store/useExpenseStore';
import { useCategoryStore } from '../../store/useCategoryStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { formatMoney, formatDate } from '../../lib/format';
import { Receipt } from '@phosphor-icons/react';
import { Icon } from '../../lib/icons';

const TYPE_ICON_WRAP: Record<string, string> = {
  mandatory: 'icon-wrap-cer',
  flexible:  'icon-wrap-sand',
  savings:   'icon-wrap-success',
};

export function RecentExpenses() {
  const expenses = useExpenseStore((s) => s.expenses);
  const getCategory = useCategoryStore((s) => s.getCategory);
  const payers = useSettingsStore((s) => s.payers);

  const recent = [...expenses]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  if (recent.length === 0) {
    return (
      <div className="rounded-xl bg-card border border-border p-5 flex flex-col items-center gap-2 text-center">
        <Receipt size={28} strokeWidth={2} className="text-muted/40" />
        <p className="text-sm text-muted font-sans">Расходов пока нет</p>
        <p className="text-xs text-muted/60 font-sans">Добавьте первый расход через кнопки выше</p>
      </div>
    );
  }

  return (
    <div>
      <p className="section-lbl mb-2">Последние расходы</p>
      <div className="rounded-xl bg-card border border-border overflow-hidden">
        <ul>
          {recent.map((exp) => {
            const cat = getCategory(exp.categoryId);
            const payer = payers.find((p) => p.id === exp.paidBy);
            const iconWrap = TYPE_ICON_WRAP[exp.type] ?? 'icon-wrap-sand';
            const iconName = cat?.icon ?? 'DollarSign';
            return (
              <li key={exp.id} className="flex items-center gap-2 px-3 py-2 border-b border-sand last:border-b-0">
                <span className={`w-7 h-7 rounded-[9px] flex items-center justify-center shrink-0 ${iconWrap}`}>
                  <Icon name={iconName} size={14} strokeWidth={2} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <p className="text-[11px] font-semibold text-ink truncate font-sans leading-none">
                      {cat?.name ?? 'Прочее'}
                    </p>
                    {payer && (
                      <span className="text-[8px] bg-accent/15 text-accent px-1.5 py-[2px] rounded font-semibold leading-none shrink-0">
                        {payer.name}
                      </span>
                    )}
                  </div>
                  {exp.description && (
                    <p className="text-[9px] text-muted truncate font-sans">{exp.description}</p>
                  )}
                  {!exp.description && (
                    <p className="text-[9px] text-muted font-sans">{formatDate(exp.date)}</p>
                  )}
                </div>
                <p className="text-[11px] font-bold text-danger ml-auto shrink-0 font-sans">
                  -{formatMoney(exp.amount)}
                </p>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

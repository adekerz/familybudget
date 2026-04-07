import { useTranslation } from 'react-i18next';
import { CheckCircle, Circle } from '@phosphor-icons/react';
import { navigateTo } from '../../lib/navigation';
import { useIncomeStore } from '../../store/useIncomeStore';
import { useExpenseStore } from '../../store/useExpenseStore';
import { useGoalsStore } from '../../store/useGoalsStore';

export function SetupChecklist() {
  const { t } = useTranslation();
  const incomes  = useIncomeStore((s) => s.incomes);
  const expenses = useExpenseStore((s) => s.expenses);
  const goals    = useGoalsStore((s) => s.goals);

  const stepNav: Record<string, () => void> = {
    add_income:  () => navigateTo('income'),
    add_expense: () => navigateTo('expenses'),
    create_goal: () => navigateTo('goals'),
  };

  const steps = [
    {
      id: 'add_income',
      label: t('setup_add_income'),
      done: incomes.length > 0,
    },
    {
      id: 'add_expense',
      label: t('setup_add_expense'),
      done: expenses.length > 0,
    },
    {
      id: 'create_goal',
      label: t('setup_add_goal'),
      done: goals.length > 0,
    },
  ];

  const completed = steps.filter((s) => s.done).length;
  const pct = Math.round((completed / steps.length) * 100);

  if (pct >= 100) return null;

  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold text-ink">{t('setup_budget_title')}</p>
        <span className="text-xs text-muted font-medium">{completed} из {steps.length}</span>
      </div>
      <div className="h-1.5 rounded-full bg-border overflow-hidden mb-3">
        <div
          className="h-full rounded-full bg-accent transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="space-y-1.5">
        {steps.map((step) => (
          <div
            key={step.id}
            className={`flex items-center gap-2 ${
              !step.done && stepNav[step.id]
                ? 'cursor-pointer hover:opacity-80 transition-opacity'
                : ''
            }`}
            onClick={() => !step.done && stepNav[step.id]?.()}
          >
            {step.done
              ? <CheckCircle size={14} className="text-success shrink-0" />
              : <Circle size={14} className="text-muted shrink-0" />
            }
            <span className={`text-xs ${step.done ? 'text-muted line-through' : 'text-ink'}`}>
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

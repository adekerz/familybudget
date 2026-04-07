import { Flag } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { GoalCard } from './GoalCard';
import { useGoalsStore } from '../../store/useGoalsStore';
import type { SavingsGoal } from '../../types';

interface GoalsListProps {
  onEdit?: (goal: SavingsGoal) => void;
  onAdd?: () => void;
}

export function GoalsList({ onEdit, onAdd }: GoalsListProps) {
  const { t } = useTranslation();
  const goals = useGoalsStore((s) => s.goals);
  const activeGoals = goals.filter((g) => g.isActive);

  if (activeGoals.length === 0) {
    return (
      <div className="flex flex-col items-center py-12 text-center">
        <Flag size={40} style={{ color: 'var(--text3)' }} weight="thin" />
        <p className="text-sm font-semibold mt-3" style={{ color: 'var(--ink)' }}>
          {t('no_goals_title')}
        </p>
        <p className="text-xs mt-1 max-w-[240px]" style={{ color: 'var(--text3)' }}>
          {t('no_goals_hint_cta')}
        </p>
        {onAdd && (
          <button
            onClick={onAdd}
            className="mt-4 px-5 py-2.5 rounded-xl text-sm font-bold"
            style={{ background: 'var(--cer)', color: '#fff' }}
          >
            {t('add_goal')}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {activeGoals.map((goal) => (
        <GoalCard key={goal.id} goal={goal} onEdit={onEdit} />
      ))}
    </div>
  );
}

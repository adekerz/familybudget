import { Flag } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { GoalCard } from './GoalCard';
import { useGoalsStore } from '../../store/useGoalsStore';
import { EmptyState } from '../ui/EmptyState';
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
      <EmptyState
        icon={Flag}
        title={t('no_goals_title')}
        hint={t('no_goals_hint_cta')}
        actionLabel={onAdd ? t('add_goal') : undefined}
        onAction={onAdd}
      />
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

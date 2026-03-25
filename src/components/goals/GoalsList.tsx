import { Target } from 'lucide-react';
import { GoalCard } from './GoalCard';
import { useGoalsStore } from '../../store/useGoalsStore';
import type { SavingsGoal } from '../../types';

interface GoalsListProps {
  onEdit?: (goal: SavingsGoal) => void;
}

export function GoalsList({ onEdit }: GoalsListProps) {
  const goals = useGoalsStore((s) => s.goals);
  const activeGoals = goals.filter((g) => g.isActive);

  if (activeGoals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 bg-alice rounded-2xl flex items-center justify-center mb-4">
          <Target size={32} strokeWidth={1.5} className="text-muted" />
        </div>
        <p className="text-ink font-semibold mb-1">Нет целей</p>
        <p className="text-muted text-sm">Создайте первую цель накоплений</p>
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

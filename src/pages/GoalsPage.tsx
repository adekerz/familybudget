import { useState, useMemo } from 'react';
import { Plus } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { Header } from '../components/layout/Header';
import { GoalsList } from '../components/goals/GoalsList';
import { GoalForm } from '../components/goals/GoalForm';
import Modal from '../components/ui/Modal';
import { useBudgetSummary } from '../store/useBudgetStore';
import { formatMoney } from '../lib/format';
import { useGoalsStore } from '../store/useGoalsStore';
import { buildGoalsPrompt } from '../lib/aiPrompts';
import { AIInsightCard } from '../components/ui/AIInsightCard';
import { useAIInsight } from '../hooks/useAIInsight';
import type { SavingsGoal } from '../types';

export function GoalsPage() {
  const { t } = useTranslation();
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const summary = useBudgetSummary();
  const goals = useGoalsStore((s) => s.goals);

  const goalsPrompt = useMemo(
    () => buildGoalsPrompt(goals, summary),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [goals.length]
  );

  const { insight: goalsInsight } = useAIInsight('goals', () => goalsPrompt, [goalsPrompt]);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 overflow-y-auto px-4 pt-4 pb-28 space-y-4">
        {/* Savings balance card — cerulean hero */}
        <div className="bg-accent rounded-2xl p-4">
          <p className="text-xs text-white/70 uppercase tracking-wider mb-1">{t('goals_budget')}</p>
          <p className="text-2xl font-bold text-white">
            {formatMoney(summary.savingsBudget)}
          </p>
          <p className="text-white/70 text-xs mt-1">
            {t('used')}: {formatMoney(summary.savingsActual)} · {t('remaining')}: {formatMoney(summary.savingsBudget - summary.savingsActual)}
          </p>
        </div>

        <AIInsightCard insight={goalsInsight} isLoading={!goalsInsight} />
        <GoalsList onEdit={setEditingGoal} />
      </main>

      {/* FAB */}
      <button
        onClick={() => setShowForm(true)}
        className="fixed bottom-24 right-4 w-14 h-14 bg-accent rounded-full flex items-center justify-center shadow-lg shadow-accent/30 active:scale-95 transition-transform z-30"
        aria-label={t('add_goal')}
      >
        <Plus size={24} className="text-white" />
      </button>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={t('new_goal')}>
        <GoalForm onClose={() => setShowForm(false)} />
      </Modal>

      <Modal isOpen={!!editingGoal} onClose={() => setEditingGoal(null)} title={t('edit_goal')}>
        {editingGoal && (
          <GoalForm onClose={() => setEditingGoal(null)} initialData={editingGoal} />
        )}
      </Modal>
    </div>
  );
}

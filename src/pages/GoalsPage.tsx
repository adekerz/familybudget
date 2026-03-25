import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { GoalsList } from '../components/goals/GoalsList';
import { GoalForm } from '../components/goals/GoalForm';
import Modal from '../components/ui/Modal';
import { useBudgetSummary } from '../store/useBudgetStore';
import { formatMoney } from '../lib/format';
import { useGoalsStore } from '../store/useGoalsStore';
import { useAIStore } from '../store/useAIStore';
import { buildGoalsPrompt } from '../lib/aiPrompts';
import { AIInsightCard } from '../components/ui/AIInsightCard';

export function GoalsPage() {
  const [showForm, setShowForm] = useState(false);
  const summary = useBudgetSummary();
  const goals = useGoalsStore((s) => s.goals);
  const { goalsInsight, fetchGoalsInsight } = useAIStore();

  useEffect(() => {
    const prompt = buildGoalsPrompt(goals, summary);
    fetchGoalsInsight(prompt);
  }, [goals.length]);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 overflow-y-auto px-4 pt-4 pb-28 space-y-4">
        {/* Savings balance card — cerulean hero */}
        <div className="bg-accent rounded-2xl p-4">
          <p className="text-xs text-white/70 uppercase tracking-wider mb-1">Бюджет накоплений</p>
          <p className="text-2xl font-bold text-white">
            {formatMoney(summary.savingsBudget)}
          </p>
          <p className="text-white/70 text-xs mt-1">
            Использовано: {formatMoney(summary.savingsActual)} · Остаток: {formatMoney(summary.savingsBudget - summary.savingsActual)}
          </p>
        </div>

        <AIInsightCard insight={goalsInsight} isLoading={!goalsInsight} />
        <GoalsList />
      </main>

      {/* FAB */}
      <button
        onClick={() => setShowForm(true)}
        className="fixed bottom-24 right-4 w-14 h-14 bg-accent rounded-full flex items-center justify-center shadow-lg shadow-accent/30 active:scale-95 transition-transform z-30"
        aria-label="Добавить цель"
      >
        <Plus size={24} className="text-white" />
      </button>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Новая цель">
        <GoalForm onClose={() => setShowForm(false)} />
      </Modal>
    </div>
  );
}

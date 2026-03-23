import { useState } from 'react';
import { Target, Plus, Trash2, Calendar } from 'lucide-react';
import { ProgressBar } from '../ui/ProgressBar';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { formatMoney } from '../../lib/format';
import { getGoalMonthlyContribution } from '../../lib/budget';
import { getMonthsUntil } from '../../lib/dates';
import { useGoalsStore } from '../../store/useGoalsStore';
import { useExpenseStore } from '../../store/useExpenseStore';
import type { SavingsGoal } from '../../types';

interface GoalCardProps {
  goal: SavingsGoal;
}

export function GoalCard({ goal }: GoalCardProps) {
  const [showContribute, setShowContribute] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [amount, setAmount] = useState('');
  const [amountError, setAmountError] = useState('');
  const contributeToGoal = useGoalsStore((s) => s.contributeToGoal);
  const removeGoal = useGoalsStore((s) => s.removeGoal);
  const addExpense = useExpenseStore((s) => s.addExpense);

  const percent = goal.targetAmount > 0
    ? Math.round((goal.currentAmount / goal.targetAmount) * 100)
    : 0;
  const remaining = goal.targetAmount - goal.currentAmount;
  const monthsLeft = goal.targetDate ? getMonthsUntil(new Date(goal.targetDate)) : null;
  const monthly = goal.targetDate
    ? getGoalMonthlyContribution(goal.targetAmount, goal.currentAmount, new Date(goal.targetDate))
    : null;

  function handleContribute() {
    const val = parseInt(amount.replace(/\s/g, ''), 10);
    if (!val || val <= 0) { setAmountError('Введите сумму'); return; }
    contributeToGoal(goal.id, val);
    addExpense({
      amount: val,
      date: new Date().toISOString(),
      categoryId: 'goals',
      description: `Цель: ${goal.name}`,
      type: 'savings',
      paidBy: 'shared',
    });
    setAmount('');
    setShowContribute(false);
  }

  return (
    <>
      <div
        className="bg-card border border-border rounded-2xl p-4 cursor-pointer active:scale-[0.98] transition-transform"
        onClick={() => setShowContribute(true)}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{goal.icon}</span>
            <div>
              <p className="font-semibold text-white text-sm leading-tight">{goal.name}</p>
              {percent >= 100 && (
                <span className="text-xs text-success font-medium">Достигнуто!</span>
              )}
            </div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); setShowDelete(true); }}
            className="text-muted hover:text-danger transition-colors p-1"
          >
            <Trash2 size={14} />
          </button>
        </div>

        <ProgressBar value={percent} className="mb-3" />

        <div className="flex justify-between items-end">
          <div>
            <p className="font-mono text-white text-sm font-semibold">
              {formatMoney(goal.currentAmount)}
            </p>
            <p className="text-muted text-xs">из {formatMoney(goal.targetAmount)}</p>
          </div>
          <div className="text-right">
            {monthly !== null && monthly > 0 && (
              <p className="text-accent text-xs font-mono">{formatMoney(monthly)}/мес</p>
            )}
            {monthsLeft !== null && monthsLeft > 0 && (
              <p className="text-muted text-xs flex items-center gap-1 justify-end">
                <Calendar size={10} />
                {monthsLeft} мес.
              </p>
            )}
          </div>
        </div>

        {remaining > 0 && (
          <div className="mt-3 flex items-center gap-1 text-muted text-xs">
            <Target size={10} />
            Осталось {formatMoney(remaining)}
          </div>
        )}
      </div>

      {/* Contribute modal */}
      <Modal isOpen={showContribute} onClose={() => { setShowContribute(false); setAmount(''); setAmountError(''); }} title={`${goal.icon} ${goal.name}`}>
        <div className="space-y-4">
          <div className="bg-primary rounded-xl p-3 flex justify-between text-sm">
            <span className="text-muted">Прогресс</span>
            <span className="font-mono text-white">{percent}%</span>
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Сумма пополнения</label>
            <div className="relative">
              <input
                autoFocus
                type="number"
                inputMode="numeric"
                value={amount}
                onChange={(e) => { setAmount(e.target.value); setAmountError(''); }}
                placeholder="0"
                className="w-full bg-primary border border-border rounded-xl px-4 py-3 text-white font-mono text-lg text-center focus:outline-none focus:border-accent"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted">₸</span>
            </div>
            {amountError && <p className="text-danger text-xs mt-1">{amountError}</p>}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setShowContribute(false)} className="flex-1">Отмена</Button>
            <Button onClick={handleContribute} className="flex-1 gap-2">
              <Plus size={16} />
              Пополнить
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal isOpen={showDelete} onClose={() => setShowDelete(false)} title="Удалить цель?">
        <div className="space-y-4">
          <p className="text-muted text-sm">Цель «{goal.name}» будет удалена. Накопленная сумма не вернётся.</p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setShowDelete(false)} className="flex-1">Отмена</Button>
            <Button variant="danger" onClick={() => { removeGoal(goal.id); setShowDelete(false); }} className="flex-1">Удалить</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

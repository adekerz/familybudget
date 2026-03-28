import { useState, useRef, useEffect } from 'react';
import { Plus, Trash, Calendar, Target, PencilSimple, DotsThreeVertical } from '@phosphor-icons/react';
import { ProgressBar } from '../ui/ProgressBar';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Icon } from '../../lib/icons';
import { formatMoney } from '../../lib/format';
import { getGoalMonthlyContribution } from '../../lib/budget';
import { getMonthsUntil } from '../../lib/dates';
import { useGoalsStore } from '../../store/useGoalsStore';
import { useExpenseStore } from '../../store/useExpenseStore';
import { useUndoStore } from '../../store/useUndoStore';
import type { SavingsGoal } from '../../types';

interface GoalCardProps {
  goal: SavingsGoal;
  onEdit?: (goal: SavingsGoal) => void;
}

export function GoalCard({ goal, onEdit }: GoalCardProps) {
  const [showContribute, setShowContribute] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [amount, setAmount] = useState('');
  const [amountError, setAmountError] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMenu) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showMenu]);
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

  async function handleContribute() {
    const val = parseInt(amount.replace(/\s/g, ''), 10);
    if (!val || val <= 0) { setAmountError('Введите сумму'); return; }
    contributeToGoal(goal.id, val);
    const result = await addExpense({
      amount: val,
      date: new Date().toISOString(),
      categoryId: 'goals',
      description: `Цель: ${goal.name}`,
      type: 'savings',
      paidBy: 'shared',
    });
    if (!result.ok) {
      const { useToastStore: uts } = await import('../../store/useToastStore');
      uts.getState().show('Ошибка сохранения: ' + (result as { ok: false; error: string }).error, 'error');
    }
    setAmount('');
    setShowContribute(false);
  }

  function handleDeleteConfirm() {
    const snapshot = useGoalsStore.getState().goals;
    removeGoal(goal.id);
    setShowDelete(false);
    useUndoStore.getState().show({
      message: `Цель «${goal.name}» удалена`,
      duration: 5000,
      onUndo: () => {
        useGoalsStore.setState({ goals: snapshot });
      },
      onConfirm: () => {
        // уже удалена из БД через removeGoal
      },
    });
  }

  // Цвет цели из поля goal.color
  const goalColor = goal.color || '#2274A5';

  return (
    <>
      <div
        className="bg-card border border-border rounded-2xl p-4 cursor-pointer active:scale-[0.98] transition-transform"
        onClick={() => setShowContribute(true)}
        style={{ borderLeftWidth: 3, borderLeftColor: goalColor }}
      >
        <div className="flex items-center gap-2 mb-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: goalColor + '20', border: `1.5px solid ${goalColor}40` }}
          >
            <span style={{ color: goalColor }}>
              <Icon name={goal.icon} size={20} />
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-ink text-sm leading-tight truncate">{goal.name}</p>
            {percent >= 100 && (
              <span className="inline-block bg-success-bg text-success text-xs rounded-full px-2 py-0.5 font-medium mt-0.5">
                Финиш
              </span>
            )}
          </div>
          {/* Три точки меню */}
          <div className="relative shrink-0" ref={menuRef}>
            <button
              onClick={(e) => { e.stopPropagation(); setShowMenu(v => !v); }}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-ink hover:bg-alice transition-colors"
            >
              <DotsThreeVertical size={16} weight="bold" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-8 z-20 bg-card border border-border rounded-xl shadow-lg overflow-hidden min-w-[130px]">
                {onEdit && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowMenu(false); onEdit(goal); }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-ink hover:bg-alice transition-colors"
                  >
                    <PencilSimple size={13} />
                    Изменить
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); setShowMenu(false); setShowDelete(true); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-danger hover:bg-danger-bg transition-colors"
                >
                  <Trash size={13} />
                  Удалить
                </button>
              </div>
            )}
          </div>
        </div>

        <ProgressBar
          value={percent}
          className={`mb-3${percent >= 80 && percent < 100 ? ' animate-pulse-bar' : ''}`}
          color={percent >= 80 ? 'savings' : 'auto'}
        />

        <div className="flex justify-between items-end">
          <div>
            <p className="text-ink text-sm font-bold">
              {formatMoney(goal.currentAmount)}
            </p>
            <p className="text-muted text-xs">из {formatMoney(goal.targetAmount)}</p>
          </div>
          <div className="text-right">
            {monthly !== null && monthly > 0 && (
              <p className="text-xs font-bold" style={{ color: goalColor }}>{formatMoney(monthly)}/мес</p>
            )}
            {monthsLeft !== null && monthsLeft > 0 && (
              <p className="text-muted text-xs flex items-center gap-1 justify-end">
                <Calendar size={10} />
                {monthsLeft} мес.
              </p>
            )}
          </div>
        </div>

        {percent >= 100 ? (
          <div className="mt-2 text-xs font-medium text-success">Цель достигнута!</div>
        ) : percent >= 80 ? (
          <div className="mt-2 text-xs font-medium text-success">
            Почти готово! Осталось {formatMoney(remaining)}
          </div>
        ) : percent >= 33 ? (
          <div className="mt-2 text-xs text-muted">
            Уже {percent}% — продолжай!
          </div>
        ) : remaining > 0 ? (
          <div className="mt-2 flex items-center gap-1 text-muted text-xs">
            <Target size={10} />
            Осталось {formatMoney(remaining)}
          </div>
        ) : null}

      </div>

      {/* Contribute modal */}
      <Modal isOpen={showContribute} onClose={() => { setShowContribute(false); setAmount(''); setAmountError(''); }} title={goal.name}>
        <div className="space-y-4">
          <div className="bg-alice rounded-xl p-3 flex justify-between text-sm">
            <span className="text-muted">Прогресс</span>
            <span className="font-bold text-ink">{percent}%</span>
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Сумма пополнения</label>
            <div className="relative">
              <input
                type="number"
                inputMode="numeric"
                value={amount}
                onChange={(e) => { setAmount(e.target.value); setAmountError(''); }}
                placeholder="0"
                className="w-full bg-card border border-border rounded-xl px-4 py-3 text-ink font-bold text-lg text-center focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-light"
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

      {/* Delete confirm modal */}
      <Modal isOpen={showDelete} onClose={() => setShowDelete(false)} title="Удалить цель?">
        <div className="space-y-4">
          <p className="text-muted text-sm">
            Цель <span className="font-bold text-ink">«{goal.name}»</span> будет удалена. Накопленная сумма не вернётся.
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setShowDelete(false)} className="flex-1">Отмена</Button>
            <Button variant="danger" onClick={handleDeleteConfirm} className="flex-1">Удалить</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

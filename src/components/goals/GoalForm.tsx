import { useState } from 'react';
import Button from '../ui/Button';
import { Icon, GOAL_ICON_NAMES, GOAL_COLORS } from '../../lib/icons';
import { formatMoney } from '../../lib/format';
import { useGoalsStore } from '../../store/useGoalsStore';

interface GoalFormProps {
  onClose: () => void;
}

export function GoalForm({ onClose }: GoalFormProps) {
  const addGoal = useGoalsStore((s) => s.addGoal);
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [icon, setIcon] = useState(GOAL_ICON_NAMES[0]);
  const [color, setColor] = useState(GOAL_COLORS[0]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Введите название';
    const target = parseInt(targetAmount, 10);
    if (!target || target <= 0) e.targetAmount = 'Введите сумму цели';
    return e;
  }

  function handleSave() {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    addGoal({
      name: name.trim(),
      targetAmount: parseInt(targetAmount, 10),
      currentAmount: parseInt(currentAmount, 10) || 0,
      targetDate: targetDate || undefined,
      icon,
      color,
      isActive: true,
    });
    onClose();
  }

  return (
    <div className="space-y-4">
      {/* Icon picker */}
      <div>
        <label className="block text-xs text-muted mb-2">Иконка</label>
        <div className="flex flex-wrap gap-2">
          {GOAL_ICON_NAMES.map((ic) => (
            <button
              key={ic}
              onClick={() => setIcon(ic)}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                icon === ic
                  ? 'border-2 border-accent bg-accent-light'
                  : 'bg-alice border border-alice-dark'
              }`}
            >
              <Icon name={ic} size={20} className="text-ink-soft" />
            </button>
          ))}
        </div>
      </div>

      {/* Color picker */}
      <div>
        <label className="block text-xs text-muted mb-2">Цвет</label>
        <div className="flex gap-2">
          {GOAL_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              style={{ backgroundColor: c }}
              className={`w-8 h-8 rounded-full transition-all ${
                color === c ? 'ring-2 ring-ink ring-offset-2 ring-offset-card' : ''
              }`}
            />
          ))}
        </div>
      </div>

      {/* Name */}
      <div>
        <label className="block text-xs text-muted mb-1">Название цели</label>
        <input
          autoFocus
          type="text"
          value={name}
          onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: '' })); }}
          placeholder="Например: Новый iPhone"
          className="w-full bg-card border border-border rounded-xl px-4 py-3 text-ink focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-light placeholder:text-muted"
        />
        {errors.name && <p className="text-danger text-xs mt-1">{errors.name}</p>}
      </div>

      {/* Target amount */}
      <div>
        <label className="block text-xs text-muted mb-1">Сумма цели</label>
        <div className="relative">
          <input
            type="number"
            inputMode="numeric"
            value={targetAmount}
            onChange={(e) => { setTargetAmount(e.target.value); setErrors((p) => ({ ...p, targetAmount: '' })); }}
            placeholder="0"
            className="w-full bg-card border border-border rounded-xl px-4 py-3 pr-10 text-ink font-bold focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-light placeholder:text-muted"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted">₸</span>
        </div>
        {errors.targetAmount && <p className="text-danger text-xs mt-1">{errors.targetAmount}</p>}
        {targetAmount && !errors.targetAmount && (
          <p className="text-muted text-xs mt-1">{formatMoney(parseInt(targetAmount, 10) || 0)}</p>
        )}
      </div>

      {/* Current amount (optional) */}
      <div>
        <label className="block text-xs text-muted mb-1">Уже накоплено (необязательно)</label>
        <div className="relative">
          <input
            type="number"
            inputMode="numeric"
            value={currentAmount}
            onChange={(e) => setCurrentAmount(e.target.value)}
            placeholder="0"
            className="w-full bg-card border border-border rounded-xl px-4 py-3 pr-10 text-ink font-bold focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-light placeholder:text-muted"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted">₸</span>
        </div>
      </div>

      {/* Target date (optional) */}
      <div>
        <label className="block text-xs text-muted mb-1">Дата цели (необязательно)</label>
        <input
          type="date"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
          min={new Date().toISOString().split('T')[0]}
          className="w-full bg-card border border-border rounded-xl px-4 py-3 text-ink focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-light"
        />
      </div>

      <div className="flex gap-2 pt-2">
        <Button variant="ghost" onClick={onClose} className="flex-1">Отмена</Button>
        <Button onClick={handleSave} className="flex-1">Создать цель</Button>
      </div>
    </div>
  );
}

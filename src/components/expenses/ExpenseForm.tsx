import { useState } from 'react';
import { X } from 'lucide-react';
import { useExpenseStore } from '../../store/useExpenseStore';
import { useCategoryStore } from '../../store/useCategoryStore';
import type { ExpenseType } from '../../types';

interface Props {
  onClose: () => void;
  defaultType?: ExpenseType;
}

const TYPE_TABS: { id: ExpenseType; label: string }[] = [
  { id: 'mandatory', label: 'Обязательные' },
  { id: 'flexible',  label: 'Гибкие' },
  { id: 'savings',   label: 'Накопления' },
];

export function ExpenseForm({ onClose, defaultType = 'flexible' }: Props) {
  const addExpense = useExpenseStore((s) => s.addExpense);
  const categories = useCategoryStore((s) => s.categories);

  const [amount, setAmount] = useState('');
  const [type, setType] = useState<ExpenseType>(defaultType);
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [paidBy, setPaidBy] = useState<'husband' | 'wife' | 'shared'>('shared');

  const filteredCats = categories.filter((c) => c.type === type);
  const numAmount = parseInt(amount.replace(/\D/g, ''), 10) || 0;
  const isValid = numAmount > 0 && categoryId !== '';

  function handleAmountChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '');
    setAmount(digits ? parseInt(digits, 10).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : '');
  }

  function handleTypeChange(t: ExpenseType) {
    setType(t);
    setCategoryId(''); // reset category on type change
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    addExpense({
      amount: numAmount,
      date,
      categoryId,
      type,
      description: description.trim() || undefined,
      paidBy,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-card border border-border rounded-t-3xl pt-5 pb-8 px-5 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="w-10 h-1 rounded-full bg-border mx-auto mb-5" />

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-white">Новый расход</h2>
          <button onClick={onClose} className="text-muted hover:text-white p-1">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount */}
          <div>
            <label className="text-xs text-muted mb-1.5 block">Сумма</label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={amount}
                onChange={handleAmountChange}
                placeholder="0"
                autoFocus
                className="w-full bg-primary border border-border rounded-xl px-4 py-3.5 pr-10 text-white text-xl font-mono focus:outline-none focus:border-accent transition-colors"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted text-lg font-bold">₸</span>
            </div>
          </div>

          {/* Type tabs */}
          <div>
            <label className="text-xs text-muted mb-1.5 block">Тип</label>
            <div className="flex gap-2">
              {TYPE_TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleTypeChange(t.id)}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${
                    type === t.id
                      ? 'bg-accent text-primary'
                      : 'bg-primary border border-border text-muted hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Category grid */}
          <div>
            <label className="text-xs text-muted mb-1.5 block">Категория</label>
            <div className="grid grid-cols-3 gap-2">
              {filteredCats.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryId(cat.id)}
                  className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl text-center transition-all ${
                    categoryId === cat.id
                      ? 'bg-accent/20 border border-accent text-white'
                      : 'bg-primary border border-border text-muted hover:border-accent/40'
                  }`}
                >
                  <span className="text-xl">{cat.icon}</span>
                  <span className="text-[9px] leading-tight line-clamp-2">{cat.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs text-muted mb-1.5 block">Описание (необязательно)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="За что?"
              className="w-full bg-primary border border-border rounded-xl px-4 py-3 text-white placeholder:text-muted/40 focus:outline-none focus:border-accent transition-colors text-sm"
            />
          </div>

          {/* Date + PaidBy */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-muted mb-1.5 block">Дата</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-primary border border-border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-accent transition-colors"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-muted mb-1.5 block">Кто платил</label>
              <select
                value={paidBy}
                onChange={(e) => setPaidBy(e.target.value as typeof paidBy)}
                className="w-full bg-primary border border-border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-accent transition-colors"
              >
                <option value="shared">Общие</option>
                <option value="husband">Муж</option>
                <option value="wife">Жена</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={!isValid}
            className="w-full bg-accent text-primary font-bold py-3.5 rounded-xl transition-all disabled:opacity-40 active:scale-95 hover:bg-accent/90"
          >
            Сохранить расход
          </button>
        </form>
      </div>
    </div>
  );
}

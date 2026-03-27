import { useState } from 'react';
import { X } from '@phosphor-icons/react';
import { useExpenseStore } from '../../store/useExpenseStore';
import { useCategoryStore } from '../../store/useCategoryStore';
import { useToastStore } from '../../store/useToastStore';
import { Icon } from '../../lib/icons';
import { formatMoney } from '../../lib/format';
import { useSettingsStore } from '../../store/useSettingsStore';
import type { Expense, ExpenseType } from '../../types';

interface Props {
  onClose: () => void;
  defaultType?: ExpenseType;
  initialData?: Expense;
}

const PRESETS = [500, 1000, 2000, 5000];

export function ExpenseForm({ onClose, defaultType = 'flexible', initialData }: Props) {
  const addExpense = useExpenseStore((s) => s.addExpense);
  const updateExpense = useExpenseStore((s) => s.updateExpense);
  const categories = useCategoryStore((s) => s.categories);
  const payers = useSettingsStore((s) => s.payers);

  const [amount, setAmount] = useState(initialData?.amount ? String(initialData.amount) : '');
  const [type, setType] = useState<ExpenseType>(initialData?.type ?? defaultType);
  const [categoryId, setCategoryId] = useState(initialData?.categoryId ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [date, setDate] = useState(initialData?.date ?? new Date().toISOString().slice(0, 10));
  const [paidBy, setPaidBy] = useState<string>(initialData?.paidBy ?? '');
  const [saved, setSaved] = useState(false);

  const numAmount = parseInt(amount.replace(/\D/g, ''), 10) || 0;
  const isValid = numAmount > 0 && categoryId !== '';

  function handleAmountChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '');
    setAmount(digits ? parseInt(digits, 10).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : '');
  }

  function handlePreset(val: number) {
    setAmount(val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' '));
  }

  function handleCategorySelect(id: string) {
    setCategoryId(id);
    const cat = categories.find((c) => c.id === id);
    if (cat) setType(cat.type ?? 'flexible');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || saved) return;
    const cat = categories.find((c) => c.id === categoryId);
    if (initialData) {
      updateExpense(initialData.id, {
        amount: numAmount,
        date,
        categoryId,
        type,
        description: description.trim() || undefined,
        paidBy,
      });
      useToastStore.getState().show('Расход обновлён', 'success');
    } else {
      const result = await addExpense({
        amount: numAmount,
        date,
        categoryId,
        type,
        description: description.trim() || undefined,
        paidBy,
      });
      if (!result.ok) {
        useToastStore.getState().show('Ошибка: ' + result.error, 'error');
        return;
      }
      useToastStore.getState().show(
        'Расход добавлен · -' + formatMoney(numAmount) + ' · ' + (cat?.name ?? ''),
        'success'
      );
    }
    setSaved(true);
    setTimeout(() => onClose(), 600);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-card border border-border rounded-t-3xl pt-5 pb-8 px-5 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="w-10 h-1 rounded-full bg-border mx-auto mb-5" />

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-ink">Новый расход</h2>
          <button onClick={onClose} className="text-muted hover:text-ink p-1 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount */}
          <div>
            <label className="text-xs text-muted mb-1 block">Сумма</label>
            {/* Quick presets */}
            <div className="flex gap-2 mb-2">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handlePreset(p)}
                  className="flex-1 py-1.5 rounded-xl text-xs font-medium bg-alice border border-alice-dark text-ink-soft hover:border-accent/40 transition-all"
                >
                  {p.toLocaleString('ru')}
                </button>
              ))}
            </div>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={amount}
                onChange={handleAmountChange}
                placeholder="0"
                className="w-full bg-card border border-border rounded-xl px-4 py-3.5 pr-10 text-ink font-bold text-lg text-center focus:outline-none focus:border-accent transition-colors"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted text-lg font-bold">₸</span>
            </div>
          </div>

          {/* Category grid — all categories, type auto-derived */}
          <div>
            <label className="text-xs text-muted mb-1.5 block">Категория</label>
            <div className="grid grid-cols-3 gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategorySelect(cat.id)}
                  className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl text-center transition-all ${
                    categoryId === cat.id
                      ? 'bg-accent-light border border-accent text-ink'
                      : 'bg-card border border-border text-muted hover:border-accent/40'
                  }`}
                >
                  <Icon name={cat.icon} size={14} className={categoryId === cat.id ? 'text-accent' : 'text-muted'} />
                  <span className="text-[9px] leading-tight line-clamp-2 text-ink">{cat.name}</span>
                </button>
              ))}
            </div>
            {categoryId && (
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                  type === 'mandatory' ? 'bg-accent-light text-accent' :
                  type === 'savings' ? 'bg-success-bg text-success' :
                  'bg-sand text-text2'
                }`}>
                  {type === 'mandatory' ? 'Обязательные' : type === 'savings' ? 'Накопления' : 'Гибкие'}
                </span>
                <p className="text-[10px] text-muted">определяется категорией</p>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="text-xs text-muted mb-1.5 block">Описание (необязательно)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="За что?"
              className="w-full bg-card border border-border rounded-xl px-4 py-3 text-ink placeholder:text-muted focus:outline-none focus:border-accent transition-colors text-sm"
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
                className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-ink text-sm focus:outline-none focus:border-accent transition-colors"
              />
            </div>
            {payers.length > 0 && (
              <div className="flex-1">
                <label className="text-xs text-muted mb-1.5 block">Кто платил</label>
                <div className="flex flex-col gap-1">
                  {payers.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPaidBy(p.id)}
                      className={`py-1.5 rounded-[22px] text-xs font-medium transition-all ${
                        paidBy === p.id
                          ? 'bg-accent text-white'
                          : 'bg-alice border border-alice-dark text-muted'
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={!isValid}
            className={`w-full font-bold py-3.5 rounded-xl transition-all disabled:opacity-40 ${
              saved
                ? 'bg-success text-white scale-[1.02]'
                : 'bg-accent text-white active:scale-[0.98] hover:bg-accent/90'
            }`}
          >
            {saved ? '✓ Сохранено' : initialData ? 'Сохранить изменения' : 'Сохранить расход'}
          </button>
        </form>
      </div>
    </div>
  );
}

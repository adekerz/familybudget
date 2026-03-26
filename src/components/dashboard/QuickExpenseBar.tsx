import { useState } from 'react';
import { X, Check, Backspace, DotsThree } from '@phosphor-icons/react';
import { useCategoryStore } from '../../store/useCategoryStore';
import { useExpenseStore } from '../../store/useExpenseStore';
import { Icon } from '../../lib/icons';
import { ExpenseForm } from '../expenses/ExpenseForm';
import type { Category } from '../../types';

function getTopCategories(expenses: { date: string; categoryId: string }[], categories: Category[], limit = 4): Category[] {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const last30 = expenses.filter((e) => new Date(e.date) >= cutoff);
  const freq = last30.reduce<Record<string, number>>((acc, e) => {
    acc[e.categoryId] = (acc[e.categoryId] ?? 0) + 1;
    return acc;
  }, {});
  const quickCats = categories.filter((c) => c.isQuickAccess);
  const hasHistory = Object.keys(freq).length > 0;
  if (!hasHistory) {
    return quickCats.sort((a, b) => a.sortOrder - b.sortOrder).slice(0, limit);
  }
  return quickCats
    .sort((a, b) => (freq[b.id] ?? 0) - (freq[a.id] ?? 0))
    .slice(0, limit);
}

function AmountModal({ category, onClose }: { category: Category; onClose: () => void }) {
  const addExpense = useExpenseStore((s) => s.addExpense);
  const [raw, setRaw] = useState('');

  const amount = parseInt(raw.replace(/\D/g, ''), 10) || 0;
  const formatted = amount > 0
    ? amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
    : '';

  function handleKey(k: string) {
    if (k === 'DEL') {
      setRaw((p) => p.slice(0, -1));
    } else {
      if (raw.replace(/\D/g, '').length >= 8) return;
      setRaw((p) => p + k);
    }
  }

  function handleSave() {
    if (amount <= 0) return;
    addExpense({
      amount,
      date: new Date().toISOString().slice(0, 10),
      categoryId: category.id,
      type: category.type,
    });
    onClose();
  }

  const KEYS = ['1','2','3','4','5','6','7','8','9','000','0','DEL'];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-card border border-border rounded-t-3xl pt-5 pb-6 px-5 shadow-2xl">
        <div className="w-10 h-1 rounded-full bg-border mx-auto mb-4" />
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-[9px] bg-alice border border-alice-dark flex items-center justify-center">
              <Icon name={category.icon} size={16} strokeWidth={2} className="text-text2" />
            </span>
            <span className="text-base font-semibold text-ink font-sans">{category.name}</span>
          </div>
          <button onClick={onClose} className="text-muted hover:text-ink p-1 transition-colors">
            <X size={18} strokeWidth={2} />
          </button>
        </div>
        <div className="bg-card border border-border rounded-xl text-center py-4 mb-5">
          <p className="text-4xl font-bold text-ink min-h-[48px] font-sans">
            {formatted || <span className="text-muted/40">0</span>}
            <span className="text-2xl text-muted ml-1">₸</span>
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {KEYS.map((k) => (
            <button
              key={k}
              onClick={() => handleKey(k)}
              className={`py-3.5 rounded-xl text-lg font-bold font-sans transition-all active:scale-95 ${
                k === 'DEL'
                  ? 'bg-danger-bg text-danger border border-danger/20'
                  : 'bg-alice border border-alice-dark text-ink hover:bg-alice-dark'
              }`}
            >
              {k === 'DEL' ? <Backspace size={18} strokeWidth={2} /> : k}
            </button>
          ))}
        </div>
        <button
          onClick={handleSave}
          disabled={amount <= 0}
          className="w-full flex items-center justify-center gap-2 bg-accent text-white font-bold py-4 rounded-xl transition-all disabled:opacity-40 active:scale-95 font-sans"
        >
          <Check size={18} strokeWidth={2} />
          Сохранить
        </button>
      </div>
    </div>
  );
}

export function QuickExpenseBar() {
  const categories = useCategoryStore((s) => s.categories);
  const expenses = useExpenseStore((s) => s.expenses);
  const topCats = getTopCategories(expenses, categories, 4);

  const [selected, setSelected] = useState<Category | null>(null);
  const [showFullForm, setShowFullForm] = useState(false);

  return (
    <>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {topCats.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelected(cat)}
            className="flex flex-col items-center justify-center gap-1.5 shrink-0 w-16 h-[72px] rounded-[20px] bg-card border border-border hover:border-accent/50 transition-all active:scale-95"
          >
            <Icon name={cat.icon} size={18} strokeWidth={2} className="text-text2" />
            <span className="text-[10px] text-text2 font-semibold leading-tight text-center px-1 line-clamp-2 w-full font-sans">
              {cat.name}
            </span>
          </button>
        ))}
        <button
          onClick={() => setShowFullForm(true)}
          className="flex flex-col items-center gap-1 shrink-0 w-16 py-2.5 rounded-[20px] bg-alice border border-alice-dark hover:border-accent/50 transition-all active:scale-95"
        >
          <DotsThree size={18} strokeWidth={2} className="text-ink" />
          <span className="text-[10px] text-ink font-semibold font-sans">Ещё</span>
        </button>
      </div>

      {selected && (
        <AmountModal category={selected} onClose={() => setSelected(null)} />
      )}
      {showFullForm && (
        <ExpenseForm onClose={() => setShowFullForm(false)} />
      )}
    </>
  );
}

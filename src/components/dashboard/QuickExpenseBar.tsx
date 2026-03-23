import { useState } from 'react';
import { Plus, X, Check } from 'lucide-react';
import { useCategoryStore } from '../../store/useCategoryStore';
import { useExpenseStore } from '../../store/useExpenseStore';
import type { Category } from '../../types';

function AmountModal({ category, onClose }: { category: Category; onClose: () => void }) {
  const addExpense = useExpenseStore((s) => s.addExpense);
  const [raw, setRaw] = useState('');

  const amount = parseInt(raw.replace(/\D/g, ''), 10) || 0;
  const formatted = amount > 0
    ? amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
    : '';

  function handleKey(k: string) {
    if (k === '⌫') {
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

  const KEYS = ['1','2','3','4','5','6','7','8','9','000','0','⌫'];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-card border border-border rounded-t-3xl pt-5 pb-6 px-5 shadow-2xl">
        {/* Handle */}
        <div className="w-10 h-1 rounded-full bg-border mx-auto mb-4" />

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{category.icon}</span>
            <span className="text-base font-semibold text-white">{category.name}</span>
          </div>
          <button onClick={onClose} className="text-muted hover:text-white p-1">
            <X size={18} />
          </button>
        </div>

        {/* Amount display */}
        <div className="text-center mb-5">
          <p className="text-4xl font-bold font-mono text-white min-h-[48px]">
            {formatted || <span className="text-muted/40">0</span>}
            <span className="text-2xl text-muted ml-1">₸</span>
          </p>
        </div>

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {KEYS.map((k) => (
            <button
              key={k}
              onClick={() => handleKey(k)}
              className={`py-3.5 rounded-xl text-lg font-semibold transition-all active:scale-95 ${
                k === '⌫'
                  ? 'bg-danger/15 text-danger'
                  : 'bg-primary text-white hover:bg-border'
              }`}
            >
              {k}
            </button>
          ))}
        </div>

        <button
          onClick={handleSave}
          disabled={amount <= 0}
          className="w-full flex items-center justify-center gap-2 bg-accent text-primary font-bold py-4 rounded-xl transition-all disabled:opacity-40 active:scale-95"
        >
          <Check size={18} />
          Сохранить
        </button>
      </div>
    </div>
  );
}

export function QuickExpenseBar() {
  // NOTE: using categories directly (not getQuickAccessCategories()) to avoid
  // infinite re-render — selectors returning new arrays each call break Zustand
  const categories = useCategoryStore((s) => s.categories);
  const quickCats = categories
    .filter((c) => c.isQuickAccess)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const [selected, setSelected] = useState<Category | null>(null);

  return (
    <>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {quickCats.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelected(cat)}
            className="flex flex-col items-center gap-1 shrink-0 w-16 py-2.5 rounded-xl bg-card border border-border hover:border-accent/50 transition-all active:scale-95"
          >
            <span className="text-xl">{cat.icon}</span>
            <span className="text-[9px] text-muted leading-tight text-center px-0.5 line-clamp-2">
              {cat.name}
            </span>
          </button>
        ))}
        <button className="flex flex-col items-center gap-1 shrink-0 w-16 py-2.5 rounded-xl bg-card border border-dashed border-border hover:border-accent/50 transition-all active:scale-95">
          <Plus size={20} className="text-muted" />
          <span className="text-[9px] text-muted">Другое</span>
        </button>
      </div>

      {selected && (
        <AmountModal category={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}

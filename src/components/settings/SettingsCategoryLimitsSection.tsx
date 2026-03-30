import { useState } from 'react';
import { Tag } from '@phosphor-icons/react';
import { useCategoryStore } from '../../store/useCategoryStore';
import { formatMoney } from '../../lib/format';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

export function SettingsCategoryLimitsSection() {
  const categories = useCategoryStore((s) => s.categories);
  const setCategoryLimit = useCategoryStore((s) => s.setCategoryLimit);

  const [editId, setEditId] = useState<string | null>(null);
  const [input, setInput] = useState('');

  function handleOpen(catId: string) {
    const cat = categories.find((c) => c.id === catId);
    setInput(cat?.monthlyLimit ? String(cat.monthlyLimit) : '');
    setEditId(catId);
  }

  function handleSave() {
    if (!editId) return;
    const val = parseInt(input, 10);
    setCategoryLimit(editId, val > 0 ? val : undefined);
    setEditId(null);
  }

  const editCat = categories.find((c) => c.id === editId);

  return (
    <>
      <section className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Tag size={16} className="text-accent" />
          <p className="font-semibold text-ink text-sm">Лимиты категорий</p>
        </div>
        <div className="divide-y divide-border">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center justify-between px-4 py-2.5">
              <p className="text-sm text-ink">{cat.name}</p>
              <button
                onClick={() => handleOpen(cat.id)}
                className={`text-xs font-semibold transition-colors ${cat.monthlyLimit ? 'text-accent hover:text-accent-dark' : 'text-muted hover:text-ink'}`}
              >
                {cat.monthlyLimit ? formatMoney(cat.monthlyLimit) : 'Нет лимита'}
              </button>
            </div>
          ))}
        </div>
      </section>

      <Modal isOpen={!!editId} onClose={() => setEditId(null)} title={`Лимит: ${editCat?.name ?? ''}`}>
        <div className="space-y-4">
          <p className="text-muted text-sm">Месячный лимит. Оставьте пустым, чтобы убрать.</p>
          <div className="relative">
            <input
              type="number" inputMode="numeric" value={input}
              onChange={(e) => setInput(e.target.value)} placeholder="0"
              className="w-full bg-card border border-border rounded-xl px-4 py-3 pr-10 text-ink font-bold text-lg focus:outline-none focus:border-accent placeholder:text-muted"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted">₸</span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setEditId(null)} className="flex-1">Отмена</Button>
            <Button onClick={handleSave} className="flex-1">Сохранить</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

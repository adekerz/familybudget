import { useState } from 'react';
import { X } from '@phosphor-icons/react';
import { usePayPeriodStore } from '../../store/usePayPeriodStore';

interface Props { onClose: () => void; }

export function AddSinkingFundModal({ onClose }: Props) {
  const [name, setName]       = useState('');
  const [target, setTarget]   = useState('');
  const [date, setDate]       = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const addSinkingFund = usePayPeriodStore(s => s.addSinkingFund);

  const monthlyPreview = (() => {
    const t = parseInt(target);
    if (!t || !date) return 0;
    const months = Math.max(1, Math.ceil(
      (new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30)
    ));
    return Math.ceil(t / months);
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('Укажи название'); return; }
    const t = parseInt(target);
    if (!t || t <= 0) { setError('Укажи сумму цели'); return; }
    if (!date) { setError('Укажи дату'); return; }
    if (new Date(date) <= new Date()) { setError('Дата должна быть в будущем'); return; }

    setLoading(true);
    const res = await addSinkingFund({ name: name.trim(), targetAmount: t, targetDate: date });
    setLoading(false);
    if (res.ok) onClose();
    else setError(res.error ?? 'Ошибка');
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat('ru-KZ', { style: 'currency', currency: 'KZT', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm px-4 pb-safe">
      <div className="w-full max-w-md bg-card border border-border rounded-3xl p-6 space-y-4 shadow-2xl animate-modal-in">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">Новый накопительный фонд</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-alice">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-muted font-medium">Название</label>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="Отпуск, новый телефон, страховка..."
              className="mt-1 w-full border border-border rounded-xl px-3 py-2.5 bg-card text-sm outline-none focus:border-accent" />
          </div>
          <div>
            <label className="text-xs text-muted font-medium">Целевая сумма (₸)</label>
            <input type="number" value={target} onChange={e => setTarget(e.target.value)}
              placeholder="0"
              className="mt-1 w-full border border-border rounded-xl px-3 py-2.5 bg-card text-sm outline-none focus:border-accent" />
          </div>
          <div>
            <label className="text-xs text-muted font-medium">Дата цели</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="mt-1 w-full border border-border rounded-xl px-3 py-2.5 bg-card text-sm outline-none focus:border-accent" />
          </div>

          {monthlyPreview > 0 && (
            <div className="rounded-xl bg-accent/10 px-4 py-3 text-sm text-accent font-medium">
              Ежемесячный взнос: {fmt(monthlyPreview)}
            </div>
          )}

          {error && <p className="text-red-500 text-xs">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full py-3 bg-accent text-white rounded-2xl font-semibold text-sm disabled:opacity-50">
            {loading ? 'Создаём...' : 'Создать фонд'}
          </button>
        </form>
      </div>
    </div>
  );
}

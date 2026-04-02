import { useState } from 'react';
import { X } from '@phosphor-icons/react';
import { usePayPeriodStore } from '../../store/usePayPeriodStore';

interface Props { onClose: () => void; }

export function CreatePayPeriodModal({ onClose }: Props) {
  const today = new Date().toISOString().split('T')[0];
  const in30  = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate]     = useState(in30);
  const [salary, setSalary]       = useState('');
  const [notes, setNotes]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  const createPayPeriod = usePayPeriodStore(s => s.createPayPeriod);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const sal = parseInt(salary);
    if (!sal || sal <= 0) { setError('Укажи сумму ЗП'); return; }
    if (new Date(endDate) <= new Date(startDate)) { setError('Конец должен быть позже начала'); return; }
    setLoading(true);
    const res = await createPayPeriod({ startDate, endDate, salaryAmount: sal, notes: notes || undefined });
    setLoading(false);
    if (res.ok) onClose();
    else setError(res.error ?? 'Ошибка');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-4 pb-8">
      <div className="w-full max-w-md bg-surface rounded-3xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">Новый период</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-surface-alt">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-muted font-medium">Дата получения ЗП</label>
            <input
              type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="mt-1 w-full border border-border rounded-xl px-3 py-2.5 bg-surface text-sm outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="text-xs text-muted font-medium">Следующая ЗП (конец периода)</label>
            <input
              type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="mt-1 w-full border border-border rounded-xl px-3 py-2.5 bg-surface text-sm outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="text-xs text-muted font-medium">Сумма ЗП (₸)</label>
            <input
              type="number" value={salary} onChange={e => setSalary(e.target.value)}
              placeholder="350 000"
              className="mt-1 w-full border border-border rounded-xl px-3 py-2.5 bg-surface text-sm outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="text-xs text-muted font-medium">Заметка (необязательно)</label>
            <input
              type="text" value={notes} onChange={e => setNotes(e.target.value)}
              className="mt-1 w-full border border-border rounded-xl px-3 py-2.5 bg-surface text-sm outline-none focus:border-accent"
            />
          </div>
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <button
            type="submit" disabled={loading}
            className="w-full py-3 bg-accent text-white rounded-2xl font-semibold text-sm disabled:opacity-50"
          >
            {loading ? 'Создаём...' : 'Начать период'}
          </button>
        </form>
      </div>
    </div>
  );
}

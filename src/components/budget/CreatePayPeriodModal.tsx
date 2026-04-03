import { useState } from 'react';
import { X } from '@phosphor-icons/react';
import { usePayPeriodStore } from '../../store/usePayPeriodStore';
import { useSettingsStore } from '../../store/useSettingsStore';

interface Props { onClose: () => void; }

export function CreatePayPeriodModal({ onClose }: Props) {
  const today = new Date().toISOString().split('T')[0];
  // in30 оставляем как fallback
  const in30 = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

  // Вычисляем умную дату до первого рендера
  const getSmartEnd = () => {
    const sources = useSettingsStore.getState().incomeSources;
    if (!sources.length) return in30;
    const src = sources.find(s => typeof s.day === 'number');
    if (!src || typeof src.day !== 'number') return in30;
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth() + 1, src.day as number);
    return d.toISOString().split('T')[0];
  };

  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate]     = useState(getSmartEnd);
  const [salary, setSalary]       = useState('');
  const [notes, setNotes]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  const createPayPeriod = usePayPeriodStore(s => s.createPayPeriod);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const startDateObj = new Date(startDate);
    const todayObj = new Date();
    todayObj.setHours(0, 0, 0, 0);
    startDateObj.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((startDateObj.getTime() - todayObj.getTime()) / 86400000);
    if (diffDays > 1) {
      setError(
        `Дата получения ЗП — ${startDate} — это будущее. ` +
        `Создавай период когда ЗП уже пришла. ` +
        `Обычно это сегодня (${today}) или недавняя дата.`
      );
      return;
    }

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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm px-4 pb-safe">
      <div className="w-full max-w-md bg-card border border-border rounded-3xl p-6 space-y-5 shadow-2xl animate-modal-in">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">Новый период</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-alice">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-muted font-medium">
              Когда получил зарплату
              <span className="ml-1 text-accent font-normal">(обычно сегодня)</span>
            </label>
            <input
              type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="mt-1 w-full border border-border rounded-xl px-3 py-2.5 bg-card text-sm outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="text-xs text-muted font-medium">
              Дата следующей зарплаты
            </label>
            <input
              type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="mt-1 w-full border border-border rounded-xl px-3 py-2.5 bg-card text-sm outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="text-xs text-muted font-medium">Сумма ЗП (₸)</label>
            <input
              type="number" value={salary} onChange={e => setSalary(e.target.value)}
              placeholder="350 000"
              className="mt-1 w-full border border-border rounded-xl px-3 py-2.5 bg-card text-sm outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="text-xs text-muted font-medium">Заметка (необязательно)</label>
            <input
              type="text" value={notes} onChange={e => setNotes(e.target.value)}
              className="mt-1 w-full border border-border rounded-xl px-3 py-2.5 bg-card text-sm outline-none focus:border-accent"
            />
          </div>
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <div className="rounded-xl bg-alice border border-alice-dark px-3 py-2.5 text-xs text-ink-soft">
            <p className="font-semibold mb-1">💡 Как пользоваться:</p>
            <p>1. Получил зарплату → сразу создай период</p>
            <p>2. «Когда получил» = сегодня или дата прихода ЗП</p>
            <p>3. «Следующая ЗП» = дата когда придёт следующая</p>
          </div>
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

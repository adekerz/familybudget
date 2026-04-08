import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePayPeriodStore } from '../../store/usePayPeriodStore';
import BottomSheet from '../ui/BottomSheet';

interface Props { onClose: () => void; }

export function AddSinkingFundModal({ onClose }: Props) {
  const { t } = useTranslation();
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
    if (!name.trim()) { setError(t('specify_title')); return; }
    const tgt = parseInt(target);
    if (!tgt || tgt <= 0) { setError(t('specify_target_amount')); return; }
    if (!date) { setError(t('specify_date')); return; }
    if (new Date(date) <= new Date()) { setError(t('date_must_be_future')); return; }

    setLoading(true);
    const res = await addSinkingFund({ name: name.trim(), targetAmount: tgt, targetDate: date });
    setLoading(false);
    if (res.ok) onClose();
    else setError(res.error ?? t('error'));
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat('ru-KZ', { style: 'currency', currency: 'KZT', maximumFractionDigits: 0 }).format(n);

  return (
    <BottomSheet isOpen={true} onClose={onClose} title={t('new_sinking_fund')} showDragHandle={false}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="text-xs text-muted font-medium">{t('source_name')}</label>
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder="Отпуск, новый телефон, страховка..."
            className="mt-1 w-full border border-border rounded-xl px-3 py-2.5 bg-card text-sm outline-none focus:border-accent" />
        </div>
        <div>
          <label className="text-xs text-muted font-medium">{t('target_amount_label')}</label>
          <input type="number" value={target} onChange={e => setTarget(e.target.value)}
            placeholder="0"
            className="mt-1 w-full border border-border rounded-xl px-3 py-2.5 bg-card text-sm outline-none focus:border-accent" />
        </div>
        <div>
          <label className="text-xs text-muted font-medium">{t('target_date_label')}</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="mt-1 w-full border border-border rounded-xl px-3 py-2.5 bg-card text-sm outline-none focus:border-accent" />
        </div>

        {monthlyPreview > 0 && (
          <div className="rounded-xl bg-accent/10 px-4 py-3 text-sm text-accent font-medium">
            {t('monthly_contribution_preview', { amount: fmt(monthlyPreview) })}
          </div>
        )}

        {error && <p className="text-red-500 text-xs">{error}</p>}

        <button type="submit" disabled={loading}
          className="w-full py-3 bg-accent text-white rounded-2xl font-semibold text-sm disabled:opacity-50">
          {loading ? t('creating') : t('create_fund')}
        </button>
      </form>
    </BottomSheet>
  );
}

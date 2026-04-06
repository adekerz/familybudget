import type { PaceResult } from '../../types';
import { useTranslation } from 'react-i18next';

const fmt = (n: number) =>
  new Intl.NumberFormat('ru-KZ', { style: 'currency', currency: 'KZT', maximumFractionDigits: 0 }).format(n);

export function PaceIndicator({ pace }: { pace: PaceResult }) {
  const { t } = useTranslation();
  const STATUS_CONFIG = {
    on_track: { label: t('pace_on_track_label'), color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
    warning:  { label: t('pace_warning_label'),  color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
    danger:   { label: t('pace_danger_label'),   color: 'bg-red-100 text-red-700',     dot: 'bg-red-500' },
  };
  const cfg = STATUS_CONFIG[pace.status];
  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-ink">{t('pace_title')}</span>
        <span className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${cfg.color}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
          {cfg.label}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <div className="text-muted text-xs">{t('pace_expected')}</div>
          <div className="font-semibold text-ink">{fmt(pace.expectedSpent)}</div>
        </div>
        <div>
          <div className="text-muted text-xs">{t('pace_actual')}</div>
          <div className={`font-semibold ${pace.actualSpent > pace.expectedSpent ? 'text-red-500' : 'text-ink'}`}>
            {fmt(pace.actualSpent)}
          </div>
        </div>
      </div>
      <div className="text-xs text-muted border-t border-border pt-2">
        {t('pace_projection')}{' '}
        <span className={`font-semibold ${pace.projectedEndBalance < 0 ? 'text-red-500' : 'text-green-600'}`}>
          {fmt(pace.projectedEndBalance)}
        </span>
      </div>
    </div>
  );
}

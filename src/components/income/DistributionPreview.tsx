import { formatMoney } from '../../lib/format';
import { Icon } from '../../lib/icons';
import type { Distribution } from '../../types';

interface Props {
  amount: number;
  ratios: { mandatory: number; flexible: number; savings: number };
  distribution: Distribution;
  fixedTotal: number;
  onAdjust: () => void;
  onConfirm: () => void;
}

const ROWS = [
  {
    key: 'mandatory' as const,
    label: 'Обязательные',
    iconName: 'Home',
    rowClass: 'bg-accent-light border border-accent/20',
    labelClass: 'text-accent',
  },
  {
    key: 'flexible' as const,
    label: 'Гибкие',
    iconName: 'ShoppingCart',
    rowClass: 'bg-sand border border-[#C8BAA0]/30',
    labelClass: 'text-text2',
  },
  {
    key: 'savings' as const,
    label: 'Накопления',
    iconName: 'Landmark',
    rowClass: 'bg-success-bg border border-success/20',
    labelClass: 'text-success',
  },
];

export function DistributionPreview({ amount, ratios, distribution, fixedTotal, onAdjust, onConfirm }: Props) {
  const distributable = Math.max(0, amount - fixedTotal);

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-ink font-sans">
          Распределение {formatMoney(amount)}
        </p>
        <button
          onClick={onAdjust}
          className="text-xs text-accent hover:underline font-sans"
        >
          Изменить %
        </button>
      </div>

      {fixedTotal > 0 && (
        <div className="mb-3 rounded-xl bg-card border border-border px-4 py-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted font-sans">Фиксированные расходы</span>
            <span className="text-sm font-bold text-danger font-sans">-{formatMoney(fixedTotal)}</span>
          </div>
          <div className="border-t border-border pt-1.5 flex items-center justify-between">
            <span className="text-xs text-muted font-sans">Остаток для распределения</span>
            <span className="text-sm font-bold text-ink font-sans">{formatMoney(distributable)}</span>
          </div>
        </div>
      )}

      <div className="space-y-2 mb-4">
        {ROWS.map((row) => (
          <div
            key={row.key}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 ${row.rowClass}`}
          >
            <span className="w-7 h-7 rounded-[9px] bg-card flex items-center justify-center shrink-0">
              <Icon name={row.iconName} size={14} strokeWidth={2} className={row.labelClass} />
            </span>
            <div className="flex-1">
              <p className={`text-sm font-medium font-sans ${row.labelClass}`}>{row.label}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-ink font-sans">
                {formatMoney(distribution[row.key])}
              </p>
              <p className="text-[10px] text-muted font-sans">
                {Math.round(ratios[row.key] * 100)}%
              </p>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onConfirm}
        className="w-full bg-accent text-white font-bold py-3.5 rounded-xl transition-all active:scale-95 hover:bg-accent/90 font-sans"
      >
        Сохранить
      </button>
    </div>
  );
}

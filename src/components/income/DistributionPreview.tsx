import { formatMoney } from '../../lib/format';
import type { Distribution } from '../../types';

interface Props {
  amount: number;
  ratios: { mandatory: number; flexible: number; savings: number };
  distribution: Distribution;
  onAdjust: () => void;
  onConfirm: () => void;
}

export function DistributionPreview({ amount, ratios, distribution, onAdjust, onConfirm }: Props) {
  const rows = [
    { icon: '🔵', label: 'Обязательные', pct: Math.round(ratios.mandatory * 100), amount: distribution.mandatory, color: '#4A90D9' },
    { icon: '🟢', label: 'Гибкие',       pct: Math.round(ratios.flexible * 100),  amount: distribution.flexible,  color: '#2EA043' },
    { icon: '🟡', label: 'Накопления',   pct: Math.round(ratios.savings * 100),   amount: distribution.savings,   color: '#E3B341' },
  ];

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-white">
          Распределение {formatMoney(amount)}
        </p>
        <button
          onClick={onAdjust}
          className="text-xs text-accent hover:underline"
        >
          Изменить %
        </button>
      </div>

      <div className="space-y-2 mb-4">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-3 bg-primary rounded-xl px-4 py-3">
            <span className="text-xl">{row.icon}</span>
            <div className="flex-1">
              <p className="text-sm text-white">{row.label}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold font-mono" style={{ color: row.color }}>
                {formatMoney(row.amount)}
              </p>
              <p className="text-[10px] text-muted">{row.pct}%</p>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onConfirm}
        className="w-full bg-accent text-primary font-bold py-3.5 rounded-xl transition-all active:scale-95 hover:bg-accent/90"
      >
        Сохранить →
      </button>
    </div>
  );
}

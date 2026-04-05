// src/components/dashboard/BankBreakdown.tsx
import { useEngine } from '../../store/useFinanceEngine';
import { getBankById } from '../../constants/banks';
import { formatTenge } from '../../lib/calculations';

export function BankBreakdown() {
  const engine = useEngine();
  if (!engine) return null;

  const { bankBreakdown, totalExpenses } = engine;
  const entries = Object.entries(bankBreakdown)
    .filter(([, amount]) => amount > 0)
    .sort(([, a], [, b]) => b - a);

  if (!entries.length) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">
        Расходы по банкам
      </h3>
      <div className="space-y-2">
        {entries.map(([bankId, amount]) => {
          const bank = getBankById(bankId);
          const pct = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
          return (
            <div key={bankId}>
              <div className="flex justify-between text-xs mb-1">
                <span className="flex items-center gap-1.5 text-ink font-medium">
                  <span style={{ fontSize: 14 }}>{bank.icon}</span>
                  {bank.name}
                </span>
                <span className="text-muted">{formatTenge(amount)}</span>
              </div>
              <div className="h-1.5 rounded-full bg-sand overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: bank.color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

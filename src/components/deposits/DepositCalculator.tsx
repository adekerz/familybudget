import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { formatMoney } from '../../lib/format';
import { useDepositStore } from '../../store/useDepositStore';

interface Props {
  onClose?: () => void;
}

interface GrowthPoint {
  month: number;
  total: number;
  income: number;
}

function calcGrowth(
  principal: number,
  rate: number,          // годовая %
  months: number,
  monthly: number,       // ежемесячное пополнение
  capitalization: boolean,
): GrowthPoint[] {
  const points: GrowthPoint[] = [];
  const monthRate = rate / 100 / 12;
  let total = principal;

  for (let m = 1; m <= months; m++) {
    if (capitalization) {
      total = total * (1 + monthRate) + monthly;
    } else {
      // простые проценты — проценты выплачиваются в конце
      total += monthly;
    }
    points.push({ month: m, total: Math.round(total), income: Math.round(total - principal - monthly * m) });
  }

  if (!capitalization) {
    // пересчитываем простые проценты как итоговая выплата
    const simpleInterest = principal * (rate / 100) * (months / 12);
    const last = points[points.length - 1];
    if (last) last.income = Math.round(simpleInterest);
  }

  return points;
}

export function DepositCalculator({ onClose }: Props) {
  const { t } = useTranslation();
  const addDeposit = useDepositStore((s) => s.addDeposit);
  const [amount, setAmount] = useState('1000000');
  const [rate, setRate] = useState('16');
  const [months, setMonths] = useState('12');
  const [monthly, setMonthly] = useState('0');
  const [capitalization, setCapitalization] = useState(true);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const growth = useMemo(() => {
    const a = parseFloat(amount) || 0;
    const r = parseFloat(rate) || 0;
    const m = parseInt(months) || 1;
    const mon = parseFloat(monthly) || 0;
    return calcGrowth(a, r, m, mon, capitalization);
  }, [amount, rate, months, monthly, capitalization]);

  const finalPoint = growth[growth.length - 1];
  const finalTotal = finalPoint?.total ?? 0;
  const finalIncome = finalPoint?.income ?? 0;

  async function handleSave() {
    if (!name || !amount) return;
    setSaving(true);
    const today = new Date().toISOString().slice(0, 10);
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + (parseInt(months) || 12));
    await addDeposit({
      name,
      initialAmount: parseFloat(amount) || 0,
      currentAmount: parseFloat(amount) || 0,
      interestRate: parseFloat(rate) || 0,
      startDate: today,
      endDate: endDate.toISOString().slice(0, 10),
      isReplenishable: parseFloat(monthly) > 0,
      capitalization,
      frequency: 'monthly',
    });
    setSaving(false);
    onClose?.();
  }

  return (
    <div className="space-y-5">
      <h3 className="text-lg font-extrabold" style={{ color: 'var(--ink)' }}>{t('deposit_calculator_title')}</h3>

      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1.5">
          <span className="text-xs font-semibold" style={{ color: 'var(--text3)' }}>{t('amount_currency_label')}</span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'var(--sand)', color: 'var(--ink)' }}
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-semibold" style={{ color: 'var(--text3)' }}>{t('rate_label')}</span>
          <input
            type="number"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'var(--sand)', color: 'var(--ink)' }}
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-semibold" style={{ color: 'var(--text3)' }}>{t('term_months')}</span>
          <input
            type="number"
            value={months}
            onChange={(e) => setMonths(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'var(--sand)', color: 'var(--ink)' }}
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-semibold" style={{ color: 'var(--text3)' }}>{t('monthly_top_up')}</span>
          <input
            type="number"
            value={monthly}
            onChange={(e) => setMonthly(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'var(--sand)', color: 'var(--ink)' }}
          />
        </label>
      </div>

      {/* Капитализация toggle */}
      <div className="flex items-center justify-between px-1">
        <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{t('capitalization_label')}</span>
        <button
          onClick={() => setCapitalization((v) => !v)}
          className="w-12 h-6 rounded-full transition-colors relative"
          style={{ background: capitalization ? 'var(--cer)' : 'var(--sand)' }}
        >
          <span
            className="absolute top-1 w-4 h-4 rounded-full transition-all"
            style={{
              background: '#fff',
              left: capitalization ? 'calc(100% - 20px)' : '4px',
            }}
          />
        </button>
      </div>

      {/* Result */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl p-4" style={{ background: 'var(--card)' }}>
          <p className="text-xs mb-1" style={{ color: 'var(--text3)' }}>{t('final_amount')}</p>
          <p className="text-lg font-extrabold tabular-nums" style={{ color: 'var(--cer)' }}>
            {formatMoney(finalTotal)}
          </p>
        </div>
        <div className="rounded-2xl p-4" style={{ background: 'var(--card)' }}>
          <p className="text-xs mb-1" style={{ color: 'var(--text3)' }}>{t('income_label')}</p>
          <p className="text-lg font-extrabold tabular-nums" style={{ color: 'var(--income)' }}>
            +{formatMoney(finalIncome)}
          </p>
        </div>
      </div>

      {/* Chart */}
      {growth.length > 1 && (
        <div style={{ height: 160 }}>
          <ResponsiveContainer width="100%" height={160} minWidth={100}>
            <LineChart data={growth} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <XAxis
                dataKey="month"
                tick={{ fontSize: 10, fill: 'var(--text3)' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis hide />
              <Tooltip
                formatter={(v) => formatMoney(Number(v) || 0)}
                contentStyle={{
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  color: 'var(--ink)',
                  fontSize: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="total"
                stroke="var(--cer)"
                strokeWidth={2}
                dot={false}
                name={t('chart_amount')}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Save section */}
      <div className="space-y-3 pt-1">
        <input
          placeholder={t('deposit_name_placeholder')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-3 rounded-xl text-sm outline-none"
          style={{ background: 'var(--sand)', color: 'var(--ink)' }}
        />
        <div className="flex gap-3">
          {onClose && (
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl text-sm font-semibold"
              style={{ background: 'var(--sand)', color: 'var(--text2)' }}
            >
              {t('close_label')}
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!name || saving}
            className="flex-1 py-3 rounded-xl text-sm font-bold transition-all"
            style={{
              background: name && !saving ? 'var(--cer)' : 'var(--sand)',
              color: name && !saving ? '#fff' : 'var(--text3)',
            }}
          >
            {saving ? t('saving_label') : t('create_deposit')}
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { formatMoney } from '../../lib/format';

interface DonutSlice {
  id: string;
  name: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutSlice[];
  totalLabel?: string;
  compact?: boolean; // compact = true для dashboard, false = full для AnalyticsPage
}

function CustomLabel({ cx, cy, total }: { cx: number; cy: number; total: number }) {
  return (
    <g>
      <text x={cx} y={cy - 8} textAnchor="middle" fill="var(--ink)" style={{ fontSize: 18, fontWeight: 800, fontFamily: 'Manrope' }}>
        {formatMoney(total)}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill="var(--text3)" style={{ fontSize: 11, fontFamily: 'Manrope' }}>
        expenses
      </text>
    </g>
  );
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number; payload: DonutSlice }[] }) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div
      className="rounded-xl px-3 py-2 text-sm shadow-lg border"
      style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--ink)' }}
    >
      <p className="font-semibold">{item.name}</p>
      <p className="font-bold" style={{ color: item.payload.color }}>{formatMoney(item.value)}</p>
    </div>
  );
}

export function DonutChart({ data, totalLabel, compact = false }: DonutChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const filtered = data.filter(d => d.value > 0);
  if (filtered.length === 0) return null;

  const total = filtered.reduce((s, d) => s + d.value, 0);
  const chartHeight = compact ? 180 : 240;
  const innerR = compact ? 52 : 70;
  const outerR = compact ? 76 : 100;

  return (
    <div>
      <div style={{ height: chartHeight, minWidth: 0 }}>
        <ResponsiveContainer width="100%" height={chartHeight} minWidth={100}>
          <PieChart>
            <Pie
              data={filtered}
              cx="50%"
              cy="50%"
              innerRadius={innerR}
              outerRadius={outerR}
              paddingAngle={2}
              dataKey="value"
              animationBegin={0}
              animationDuration={600}
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              {filtered.map((entry, index) => (
                <Cell
                  key={entry.id}
                  fill={entry.color}
                  opacity={activeIndex === null || activeIndex === index ? 1 : 0.5}
                  stroke="none"
                />
              ))}
              {/* Центральная подпись */}
              {!compact && (
                <g>
                  <CustomLabel cx={0} cy={0} total={total} />
                </g>
              )}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Легенда */}
      <div className={`grid gap-1.5 mt-2 ${compact ? 'grid-cols-1' : 'grid-cols-2'}`}>
        {filtered.map((item, index) => {
          const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
          return (
            <div
              key={item.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded-xl transition-all cursor-default"
              style={{
                background: activeIndex === index ? 'var(--card2)' : 'transparent',
              }}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: item.color }} />
              <span className="text-xs truncate flex-1" style={{ color: 'var(--text2)' }}>{item.name}</span>
              <span className="text-xs font-bold tabular-nums shrink-0" style={{ color: 'var(--ink)' }}>
                {pct}%
              </span>
              {!compact && (
                <span className="text-xs tabular-nums shrink-0" style={{ color: 'var(--text3)' }}>
                  {formatMoney(item.value)}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {totalLabel && (
        <p className="text-center text-xs mt-2" style={{ color: 'var(--text3)' }}>
          {totalLabel}: <span className="font-bold" style={{ color: 'var(--ink)' }}>{formatMoney(total)}</span>
        </p>
      )}
    </div>
  );
}

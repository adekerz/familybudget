import { useState } from 'react';
import { Header } from '../components/layout/Header';
import { useExpenseStore } from '../store/useExpenseStore';
import { useIncomeStore } from '../store/useIncomeStore';
import { useCategoryStore } from '../store/useCategoryStore';
import { formatMoney } from '../lib/format';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

const PIE_COLORS = ['#4A90D9', '#2EA043', '#E3B341', '#F85149', '#A855F7', '#00B4D8', '#E85D75'];

type Period = 'month' | 'prev' | 'q3';

function getRange(period: Period): { start: Date; end: Date } {
  const now = new Date();
  if (period === 'month') {
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
    };
  }
  if (period === 'prev') {
    return {
      start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59),
    };
  }
  return {
    start: new Date(now.getFullYear(), now.getMonth() - 2, 1),
    end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
  };
}

const PERIOD_LABELS: Record<Period, string> = {
  month: 'Этот месяц',
  prev: 'Прошлый месяц',
  q3: '3 месяца',
};

export function AnalyticsPage() {
  const expenses = useExpenseStore((s) => s.expenses);
  const incomes = useIncomeStore((s) => s.incomes);
  const getCategory = useCategoryStore((s) => s.getCategory);

  const [period, setPeriod] = useState<Period>('month');
  const { start, end } = getRange(period);

  const periodExpenses = expenses.filter((e) => {
    const d = new Date(e.date);
    return d >= start && d <= end;
  });
  const periodIncomes = incomes.filter((i) => {
    const d = new Date(i.date);
    return d >= start && d <= end;
  });

  const totalSpent = periodExpenses.reduce((s, e) => s + e.amount, 0);
  const totalIncome = periodIncomes.reduce((s, i) => s + i.amount, 0);
  const saved = totalIncome - totalSpent;

  const maxExp = periodExpenses.length > 0
    ? periodExpenses.reduce((prev, cur) => cur.amount > prev.amount ? cur : prev)
    : null;
  const maxCat = maxExp ? getCategory(maxExp.categoryId) : null;

  const byCat = periodExpenses.reduce<Record<string, number>>((acc, e) => {
    const name = getCategory(e.categoryId)?.name ?? 'Прочее';
    acc[name] = (acc[name] ?? 0) + e.amount;
    return acc;
  }, {});
  const pieData = Object.entries(byCat)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 7)
    .map(([name, value]) => ({ name, value }));

  const weekData: { week: string; income: number; expense: number }[] = [];
  for (let w = 0; w < 5; w++) {
    const wStart = new Date(start.getFullYear(), start.getMonth(), 1 + w * 7);
    const wEnd = new Date(start.getFullYear(), start.getMonth(), 7 + w * 7, 23, 59, 59);
    if (wStart > end) break;
    weekData.push({
      week: `${wStart.getDate()}–${Math.min(wEnd.getDate(), end.getDate())}`,
      income: periodIncomes
        .filter((i) => { const d = new Date(i.date); return d >= wStart && d <= wEnd; })
        .reduce((s, i) => s + i.amount, 0),
      expense: periodExpenses
        .filter((e) => { const d = new Date(e.date); return d >= wStart && d <= wEnd; })
        .reduce((s, e) => s + e.amount, 0),
    });
  }

  return (
    <div className="flex flex-col min-h-screen bg-primary">
      <Header />
      <main className="flex-1 overflow-y-auto px-4 pt-4 pb-28 space-y-5">
        <h2 className="text-base font-semibold text-white">Аналитика</h2>

        {/* Period selector */}
        <div className="flex gap-2">
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${
                period === p
                  ? 'bg-accent text-primary'
                  : 'bg-card border border-border text-muted hover:text-white'
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Потрачено',   value: formatMoney(totalSpent),           color: '#F85149' },
            { label: 'Сэкономлено', value: formatMoney(Math.max(0, saved)),   color: '#2EA043' },
            { label: 'Макс. трата', value: maxExp ? formatMoney(maxExp.amount) : '—', color: '#E3B341' },
          ].map((stat) => (
            <div key={stat.label} className="bg-card border border-border rounded-xl p-3 text-center">
              <p className="text-[10px] text-muted mb-1">{stat.label}</p>
              <p className="text-xs font-bold font-mono" style={{ color: stat.color }}>
                {stat.value}
              </p>
              {stat.label === 'Макс. трата' && maxCat && (
                <p className="text-[9px] text-muted/60 mt-0.5">{maxCat.name}</p>
              )}
            </div>
          ))}
        </div>

        {/* Bar chart */}
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">
            Доходы vs Расходы по неделям
          </p>
          {weekData.some((w) => w.income > 0 || w.expense > 0) ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={weekData} barGap={4}>
                <XAxis dataKey="week" tick={{ fill: '#8B949E', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  formatter={(val) => typeof val === 'number' ? formatMoney(val) : String(val)}
                  contentStyle={{ background: '#161B22', border: '1px solid #30363D', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#8B949E' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Bar dataKey="income" name="Доходы" fill="#2EA043" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Расходы" fill="#F85149" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center text-muted text-sm">
              Нет данных за этот период
            </div>
          )}
        </div>

        {/* Pie chart */}
        {pieData.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">
              По категориям
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val) => typeof val === 'number' ? formatMoney(val) : String(val)}
                  contentStyle={{ background: '#161B22', border: '1px solid #30363D', borderRadius: 8, fontSize: 12 }}
                  itemStyle={{ color: '#fff' }}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: '#8B949E' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </main>
    </div>
  );
}

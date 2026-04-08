import { useEffect, useState } from 'react';
import { CalendarBlank, Warning } from '@phosphor-icons/react';
import { RecurringEngine } from '../../services/RecurringEngine';
import { useAuthStore } from '../../store/useAuthStore';
import { formatMoney } from '../../lib/format';
import type { RecurringTransaction } from '../../types';

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

export function UpcomingObligations() {
  const spaceId = useAuthStore((s) => s.user?.spaceId);
  const [obligations, setObligations] = useState<RecurringTransaction[]>([]);

  useEffect(() => {
    if (!spaceId) return;
    const from = new Date();
    const to = new Date();
    to.setDate(to.getDate() + 14); // ближайшие 14 дней
    RecurringEngine.getUpcomingObligations(spaceId, from, to).then(setObligations);
  }, [spaceId]);

  if (obligations.length === 0) return null;

  return (
    <div className="px-4 pb-2">
      <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text3)' }}>
        Предстоящие платежи
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {obligations.map((ob) => {
          const days = daysUntil(ob.nextOccurrence);
          const isUrgent = days <= 3;
          return (
            <div
              key={ob.id}
              className="flex-shrink-0 rounded-xl px-3 py-2.5 min-w-[140px]"
              style={{
                background: isUrgent ? 'var(--expense-bg)' : 'var(--card)',
                border: `1px solid ${isUrgent ? 'var(--expense)' : 'var(--border)'}`,
              }}
            >
              <div className="flex items-center gap-1 mb-1">
                {isUrgent
                  ? <Warning size={12} style={{ color: 'var(--expense)' }} weight="fill" />
                  : <CalendarBlank size={12} style={{ color: 'var(--text3)' }} />
                }
                <p className="text-xs font-semibold truncate" style={{ color: isUrgent ? 'var(--expense)' : 'var(--ink)' }}>
                  {ob.description ?? ob.categoryId}
                </p>
              </div>
              <p className="text-sm font-bold tabular-nums" style={{ color: 'var(--ink)' }}>
                {formatMoney(ob.amount)}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>
                {days === 0 ? 'Сегодня' : days === 1 ? 'Завтра' : `через ${days} дн.`} · {formatDate(ob.nextOccurrence)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { Home, TrendingUp, ShoppingCart, Target, Sparkles, BarChart2, ShieldCheck } from 'lucide-react';
import { useExpenseStore } from '../../store/useExpenseStore';
import { useAuthStore } from '../../store/useAuthStore';
import type { PageTab } from '../../types';

interface BottomNavProps {
  activeTab: PageTab;
  onChange: (tab: PageTab) => void;
}

const TABS: { id: PageTab; label: string; Icon: typeof Home }[] = [
  { id: 'dashboard',  label: 'Главная',   Icon: Home },
  { id: 'expenses',   label: 'Расходы',   Icon: ShoppingCart },
  { id: 'income',     label: 'Доходы',    Icon: TrendingUp },
  { id: 'analytics',  label: 'Анализ',    Icon: BarChart2 },
  { id: 'goals',      label: 'Цели',      Icon: Target },
  { id: 'assistant',  label: 'Ассистент', Icon: Sparkles },
];

export function BottomNav({ activeTab, onChange }: BottomNavProps) {
  const user = useAuthStore((s) => s.user);
  const expenses = useExpenseStore((s) => s.expenses);
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const uncategorized = expenses.filter(
    (e) =>
      (e.categoryId === 'other' || e.categoryId === 'other_flex') &&
      new Date(e.createdAt) > cutoff
  ).length;

  const tabs = user?.role === 'superadmin'
    ? [...TABS, { id: 'admin' as PageTab, label: 'Админ', Icon: ShieldCheck }]
    : TABS;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border pb-safe">
      <div className="flex">
        {tabs.map(({ id, label, Icon }) => {
          const active = activeTab === id;
          const showBadge = id === 'expenses' && uncategorized > 0;
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className={`relative flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
                active ? 'text-accent' : 'text-muted hover:text-ink'
              }`}
            >
              <div className="relative">
                <Icon size={22} strokeWidth={active ? 2.5 : 1.5} />
                {showBadge && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-warning text-white text-[9px] font-bold flex items-center justify-center">
                    {uncategorized > 9 ? '9+' : uncategorized}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-semibold leading-none">{label}</span>
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 bg-accent rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

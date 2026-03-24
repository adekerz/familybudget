import { Home, TrendingUp, ShoppingCart, BarChart3, Target, Settings } from 'lucide-react';
import type { PageTab } from '../../types';

interface BottomNavProps {
  activeTab: PageTab;
  onChange: (tab: PageTab) => void;
}

const TABS: { id: PageTab; label: string; Icon: typeof Home }[] = [
  { id: 'dashboard', label: 'Главная',   Icon: Home },
  { id: 'income',    label: 'Доходы',    Icon: TrendingUp },
  { id: 'expenses',  label: 'Расходы',   Icon: ShoppingCart },
  { id: 'goals',     label: 'Цели',      Icon: Target },
  { id: 'analytics', label: 'Аналитика', Icon: BarChart3 },
  { id: 'settings',  label: 'Настройки', Icon: Settings },
];

export function BottomNav({ activeTab, onChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border">
      <div className="flex">
        {TABS.map(({ id, label, Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className={`relative flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors ${
                active ? 'text-accent' : 'text-muted hover:text-ink'
              }`}
            >
              <Icon size={18} strokeWidth={active ? 2.5 : 1.5} />
              <span className="text-[9px] font-medium leading-none">{label}</span>
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-6 bg-accent rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

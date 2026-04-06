import {
  House, ShoppingCart, ChartBar, TrendUp, Target, Sparkle,
  CalendarBlank, Gear, ShieldCheck, Plus, CreditCard, Vault,
} from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/useAuthStore';
import { navigateTo } from '../../lib/navigation';
import { ThemeSwitcherCompact } from '../ui/ThemeSwitcher';
import { FluxLogo } from '../ui/FluxLogo';
import type { PageTab } from '../../types';

interface AppShellProps {
  activeTab: PageTab;
  onChange: (tab: PageTab) => void;
  onAddClick: () => void;
  children: React.ReactNode;
}

type NavItem = { id: PageTab; labelKey: string; Icon: typeof House };

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', labelKey: 'dashboard', Icon: House },
  { id: 'expenses',  labelKey: 'expenses',  Icon: ShoppingCart },
  { id: 'budget',    labelKey: 'budget',    Icon: CalendarBlank },
  { id: 'income',    labelKey: 'income_tab', Icon: TrendUp },
  { id: 'analytics', labelKey: 'analytics', Icon: ChartBar },
  { id: 'goals',     labelKey: 'goals',     Icon: Target },
  { id: 'debts',     labelKey: 'debts',    Icon: CreditCard },
  { id: 'deposits',  labelKey: 'deposits', Icon: Vault },
  { id: 'assistant', labelKey: 'assistant', Icon: Sparkle },
];

export function AppShell({ activeTab, onChange, onAddClick, children }: AppShellProps) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);

  function capitalize(s: string) {
    if (!s) return s;
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  const navItems: NavItem[] = user?.role === 'admin'
    ? [...NAV_ITEMS, { id: 'admin' as PageTab, labelKey: 'admin', Icon: ShieldCheck }]
    : NAV_ITEMS;

  function handleNav(id: PageTab) {
    onChange(id);
    navigateTo(id);
  }

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--page)' }}>
      {/* Sidebar — only on md+ */}
      <aside
        className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 z-30"
        style={{
          width: '256px',
          background: 'rgba(11,15,26,0.95)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Logo */}
        <div className="p-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <FluxLogo size={32} />
        </div>

        {/* Add button */}
        <div className="p-4">
          <button
            onClick={onAddClick}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm transition-all active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #00D4FF, #7DD3FC)',
              color: '#0B0F1A',
              boxShadow: '0 0 20px rgba(0,212,255,0.2)',
            }}
          >
            <Plus size={18} weight="bold" />
            Добавить расход
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          {navItems.map(({ id, labelKey, Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => handleNav(id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all text-left"
                style={{
                  background: active ? 'rgba(0,212,255,0.1)' : 'transparent',
                  color: active ? '#00D4FF' : '#475569',
                }}
              >
                <Icon size={20} weight={active ? 'fill' : 'regular'} />
                {t(labelKey)}
              </button>
            );
          })}
        </nav>

        {/* Bottom: theme + user */}
        <div className="p-4 border-t space-y-3" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <button
            onClick={() => handleNav('settings')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all text-left"
            style={{
              background: activeTab === 'settings' ? 'rgba(0,212,255,0.1)' : 'transparent',
              color: activeTab === 'settings' ? '#00D4FF' : '#475569',
            }}
          >
            <Gear size={20} weight={activeTab === 'settings' ? 'fill' : 'regular'} />
            {t('settings')}
          </button>
          {user && (
            <div className="flex items-center gap-3 px-1">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                style={{ background: 'rgba(0,212,255,0.1)', color: '#00D4FF' }}
              >
                {capitalize(user.username).charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: '#F1F5F9' }}>
                  {capitalize(user.username)}
                </p>
                <p className="text-xs truncate" style={{ color: '#475569' }}>{user.spaceName}</p>
              </div>
              <ThemeSwitcherCompact />
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 md:ml-64 min-h-screen">
        <div className="max-w-5xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

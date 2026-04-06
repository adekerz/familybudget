import { useState } from 'react';
import {
  House, ShoppingCart, Plus, ChartBar, DotsThree,
  TrendUp, Target, Sparkle, CalendarBlank, Gear, ShieldCheck, X, CreditCard, Vault,
} from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { useExpenseStore } from '../../store/useExpenseStore';
import { useAuthStore } from '../../store/useAuthStore';
import { navigateTo } from '../../lib/navigation';
import type { PageTab } from '../../types';

interface BottomNavProps {
  activeTab: PageTab;
  onChange: (tab: PageTab) => void;
  onAddClick: () => void;
}

type MainTab = { id: PageTab; labelKey: string; Icon: typeof House };

const MAIN_TABS: MainTab[] = [
  { id: 'dashboard', labelKey: 'dashboard', Icon: House },
  { id: 'expenses',  labelKey: 'expenses',  Icon: ShoppingCart },
];

const MORE_ITEMS: MainTab[] = [
  { id: 'budget',    labelKey: 'budget',     Icon: CalendarBlank },
  { id: 'income',    labelKey: 'income_tab', Icon: TrendUp },
  { id: 'goals',     labelKey: 'goals',      Icon: Target },
  { id: 'debts',     labelKey: 'debts',      Icon: CreditCard },
  { id: 'deposits',  labelKey: 'deposits',   Icon: Vault },
  { id: 'assistant', labelKey: 'assistant',  Icon: Sparkle },
  { id: 'settings',  labelKey: 'settings',   Icon: Gear },
];

export function BottomNav({ activeTab, onChange, onAddClick }: BottomNavProps) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const expenses = useExpenseStore((s) => s.expenses);
  const [moreOpen, setMoreOpen] = useState(false);

  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const uncategorized = expenses.filter(
    (e) =>
      (e.categoryId === 'other' || e.categoryId === 'other_flex') &&
      new Date(e.createdAt) > cutoff
  ).length;

  const RIGHT_TABS: MainTab[] = [
    { id: 'analytics', labelKey: 'analytics', Icon: ChartBar },
  ];

  const moreItems = user?.role === 'admin'
    ? [...MORE_ITEMS, { id: 'admin' as PageTab, labelKey: 'admin', Icon: ShieldCheck }]
    : MORE_ITEMS;

  const isMoreActive = moreItems.some(item => item.id === activeTab);

  function handleTabClick(id: PageTab) {
    onChange(id);
    navigateTo(id);
    setMoreOpen(false);
  }

  function getLabel(id: PageTab, labelKey: string) {
    if (id === 'admin') return t('admin');
    if (id === 'debts') return t('debts');
    if (id === 'deposits') return t('deposits');
    return t(labelKey);
  }

  return (
    <>
      {/* Drawer "Ещё" — conditional rendering для надёжной анимации на mobile */}
      {moreOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
            onClick={() => setMoreOpen(false)}
          />
          <div
            className="fixed left-0 right-0 z-50 md:hidden animate-slide-up"
            style={{ bottom: 'calc(64px + env(safe-area-inset-bottom, 0px))' }}
          >
            <div
              className="mx-3 mb-2 rounded-2xl border overflow-hidden"
              style={{
                background: 'var(--card)',
                borderColor: 'var(--border)',
                boxShadow: '0 -8px 32px rgba(0,0,0,0.3)',
              }}
            >
              <div className="flex justify-between items-center px-4 pt-3 pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text3)' }}>
                  {t('more')}
                </span>
                <button onClick={() => setMoreOpen(false)} className="p-1 rounded-full" style={{ color: 'var(--text3)' }}>
                  <X size={16} />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-px p-1" style={{ background: 'var(--border)' }}>
                {moreItems.map(({ id, labelKey, Icon }) => {
                  const active = activeTab === id;
                  return (
                    <button
                      key={id}
                      onClick={() => handleTabClick(id)}
                      className="flex flex-col items-center gap-2 py-4 px-2 rounded-xl transition-all active:scale-95"
                      style={{
                        background: active ? 'var(--cer-light)' : 'var(--card)',
                        color: active ? 'var(--cer)' : 'var(--text2)',
                      }}
                    >
                      <Icon size={22} weight={active ? 'fill' : 'regular'} />
                      <span className="text-[11px] font-semibold leading-none">
                        {getLabel(id, labelKey)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Main nav bar — только mobile */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 border-t md:hidden"
        style={{
          background: 'rgba(11,15,26,0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderColor: 'rgba(255,255,255,0.06)',
          height: 'calc(64px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <div className="flex items-center h-16">
          {/* Left: Главная, Расходы */}
          {MAIN_TABS.map(({ id, labelKey, Icon }) => {
            const active = activeTab === id;
            const showBadge = id === 'expenses' && uncategorized > 0;
            return (
              <button
                key={id}
                onClick={() => handleTabClick(id)}
                className="relative flex-1 flex flex-col items-center gap-1 py-3 transition-colors"
                style={{ color: active ? 'var(--cer)' : '#475569' }}
              >
                <div className="relative">
                  <Icon size={22} weight={active ? 'fill' : 'regular'} />
                  {showBadge && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-white text-[9px] font-bold flex items-center justify-center"
                      style={{ background: 'var(--warning)' }}>
                      {uncategorized > 9 ? '9+' : uncategorized}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-semibold leading-none">{t(labelKey)}</span>
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full" style={{ background: 'var(--cer)' }} />
                )}
              </button>
            );
          })}

          {/* Center: (+) button */}
          <div className="flex-1 flex items-center justify-center">
            <button
              onClick={onAddClick}
              className="w-14 h-14 rounded-full flex items-center justify-center active:scale-95 transition-all -mt-5"
              style={{
                background: 'linear-gradient(135deg, #00D4FF, #7DD3FC)',
                boxShadow: '0 0 20px rgba(0,212,255,0.35)',
              }}
              aria-label="Добавить транзакцию"
            >
              <Plus size={26} weight="bold" color="#0B0F1A" />
            </button>
          </div>

          {/* Right: Аналитика */}
          {RIGHT_TABS.map(({ id, labelKey, Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => handleTabClick(id)}
                className="relative flex-1 flex flex-col items-center gap-1 py-3 transition-colors"
                style={{ color: active ? 'var(--cer)' : '#475569' }}
              >
                <Icon size={22} weight={active ? 'fill' : 'regular'} />
                <span className="text-[10px] font-semibold leading-none">{t(labelKey)}</span>
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full" style={{ background: 'var(--cer)' }} />
                )}
              </button>
            );
          })}

          {/* Ещё */}
          <button
            onClick={() => setMoreOpen(v => !v)}
            className="relative flex-1 flex flex-col items-center gap-1 py-3 transition-colors"
            style={{ color: isMoreActive || moreOpen ? 'var(--cer)' : '#475569' }}
          >
            <DotsThree size={22} weight={moreOpen ? 'fill' : 'regular'} />
            <span className="text-[10px] font-semibold leading-none">{t('more')}</span>
            {(isMoreActive || moreOpen) && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full" style={{ background: 'var(--cer)' }} />
            )}
          </button>
        </div>
      </nav>
    </>
  );
}

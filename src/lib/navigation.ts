import type { PageTab } from '../types';

// Маппинг URL путей ↔ вкладки приложения
const PATH_TO_TAB: Record<string, PageTab> = {
  '/':           'dashboard',
  '/dashboard':  'dashboard',
  '/income':     'income',
  '/expenses':   'expenses',
  '/analytics':  'analytics',
  '/goals':      'goals',
  '/settings':   'settings',
  '/assistant':  'assistant',
  '/admin':      'admin',
  '/budget':     'budget',
  '/debts':      'debts',
  '/deposits':   'deposits',
  '/login':      'dashboard', // редирект на dashboard, AuthPage покажется через isAuthenticated
};

const TAB_TO_PATH: Record<PageTab, string> = {
  dashboard:  '/dashboard',
  income:     '/income',
  expenses:   '/expenses',
  analytics:  '/analytics',
  goals:      '/goals',
  settings:   '/settings',
  assistant:  '/assistant',
  admin:      '/admin',
  budget:     '/budget',
  debts:      '/debts',
  deposits:   '/deposits',
};

let _setTab: ((tab: PageTab) => void) | null = null;

export function registerSetTab(fn: (tab: PageTab) => void) {
  _setTab = fn;
}

export function navigateTo(tab: PageTab) {
  _setTab?.(tab);
  const path = TAB_TO_PATH[tab] ?? '/dashboard';
  if (window.location.pathname !== path) {
    window.history.pushState({ tab }, '', path);
  }
}

/** Читает текущий URL и возвращает соответствующую вкладку */
export function getTabFromPath(): PageTab {
  const path = window.location.pathname;
  return (PATH_TO_TAB[path] as PageTab) ?? 'dashboard';
}

/** Слушает popstate (кнопки назад/вперёд) */
export function listenPopState(onTabChange: (tab: PageTab) => void): () => void {
  const handler = (e: PopStateEvent) => {
    const tab = (e.state?.tab as PageTab) || getTabFromPath();
    onTabChange(tab);
  };
  window.addEventListener('popstate', handler);
  return () => window.removeEventListener('popstate', handler);
}

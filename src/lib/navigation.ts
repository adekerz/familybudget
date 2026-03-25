import type { PageTab } from '../types';

let _setTab: ((tab: PageTab) => void) | null = null;

export function registerSetTab(fn: (tab: PageTab) => void) {
  _setTab = fn;
}

export function navigateTo(tab: PageTab) {
  _setTab?.(tab);
}

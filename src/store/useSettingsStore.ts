import { create } from 'zustand';
import type { IncomeSourceConfig, DistributionRatios } from '../types';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './useAuthStore';
import { useToastStore } from './useToastStore';

export type { DistributionRatios };

export interface PayerConfig {
  id: string;
  name: string;
}

// Дефолтные источники дохода
export const FAMILY_INCOME_SOURCES: IncomeSourceConfig[] = [
  { id: 'salary_1', name: 'Зарплата', day: 29 },
  { id: 'general',  name: 'Другой доход', day: 10 },
];

export const FAMILY_PAYERS: PayerConfig[] = [
  { id: 'me',      name: 'Я' },
  { id: 'partner', name: 'Партнёр' },
  { id: 'shared',  name: 'Общие' },
];

interface SettingsStore {
  _spaceId: string | null;
  loading: boolean;

  defaultRatios: DistributionRatios;
  updateDefaultRatios: (ratios: DistributionRatios) => Promise<void>;

  incomeSources: IncomeSourceConfig[];
  addIncomeSource: (source: Omit<IncomeSourceConfig, 'id'>) => Promise<void>;
  updateIncomeSource: (id: string, patch: Partial<Omit<IncomeSourceConfig, 'id'>>) => Promise<void>;
  removeIncomeSource: (id: string) => Promise<void>;

  payers: PayerConfig[];
  addPayer: (name: string) => Promise<void>;
  removePayer: (id: string) => Promise<void>;
  renamePayer: (id: string, name: string) => Promise<void>;

  loadSettings: (spaceId: string, isFamily: boolean) => Promise<void>;
  subscribeRealtime: () => () => void;
}

async function saveSettings(spaceId: string, patch: Record<string, unknown>): Promise<boolean> {
  const { error } = await supabase
    .from('space_settings')
    .update(patch)
    .eq('space_id', spaceId);
  if (error) {
    useToastStore.getState().show('Не удалось сохранить настройки', 'error');
    return false;
  }
  return true;
}

export const useSettingsStore = create<SettingsStore>()((set, get) => ({
  _spaceId: null,
  loading: false,

  defaultRatios: { mandatory: 0.5, flexible: 0.3, savings: 0.2 },
  incomeSources: [],
  payers: [],

  subscribeRealtime: () => {
    const spaceId = get()._spaceId || useAuthStore.getState().user?.spaceId;
    if (!spaceId) return () => {};
    const channel = supabase
      .channel(`settings-realtime-${spaceId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'space_settings', filter: `space_id=eq.${spaceId}` },
        (payload) => {
          const r = payload.new as Record<string, unknown>;
          set({
            defaultRatios: r.default_ratios as DistributionRatios,
            incomeSources: r.income_sources as IncomeSourceConfig[],
            payers: r.payers as PayerConfig[],
          });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  },

  loadSettings: async (spaceId, isFamily) => {
    set({ loading: true, _spaceId: spaceId });

    let { data, error } = await supabase
      .from('space_settings')
      .select('*')
      .eq('space_id', spaceId)
      .single();

    if (error || !data) {
      const defaultData = {
        space_id: spaceId,
        default_ratios: { mandatory: 0.5, flexible: 0.3, savings: 0.2 },
        income_sources: isFamily ? FAMILY_INCOME_SOURCES : [],
        payers: isFamily ? FAMILY_PAYERS : [],
      };
      await supabase.from('space_settings').insert(defaultData);

      set({
        defaultRatios: defaultData.default_ratios,
        incomeSources: defaultData.income_sources,
        payers: defaultData.payers,
        loading: false,
      });
      return;
    }

    set({
      defaultRatios: data.default_ratios,
      incomeSources: data.income_sources,
      payers: data.payers,
      loading: false,
    });
  },

  updateDefaultRatios: async (ratios) => {
    const spaceId = get()._spaceId;
    if (!spaceId) return;
    // Нормализуем: сумма должна быть ровно 1.0 (защита от ввода 60%+50%+20%)
    const total = ratios.mandatory + ratios.flexible + ratios.savings;
    const normalized: DistributionRatios = total > 0
      ? { mandatory: ratios.mandatory / total, flexible: ratios.flexible / total, savings: ratios.savings / total }
      : { mandatory: 0.5, flexible: 0.3, savings: 0.2 };
    const prev = get().defaultRatios;
    set({ defaultRatios: normalized }); // оптимистично
    const ok = await saveSettings(spaceId, { default_ratios: normalized });
    if (!ok) set({ defaultRatios: prev }); // rollback
  },

  addIncomeSource: async (source) => {
    const spaceId = get()._spaceId;
    if (!spaceId) return;
    const newSource = { ...source, id: crypto.randomUUID() };
    const prev = get().incomeSources;
    const newSources = [...prev, newSource];
    set({ incomeSources: newSources }); // оптимистично
    const ok = await saveSettings(spaceId, { income_sources: newSources });
    if (!ok) set({ incomeSources: prev }); // rollback
  },

  updateIncomeSource: async (id, patch) => {
    const spaceId = get()._spaceId;
    if (!spaceId) return;
    const prev = get().incomeSources;
    const newSources = prev.map(src => src.id === id ? { ...src, ...patch } : src);
    set({ incomeSources: newSources }); // оптимистично
    const ok = await saveSettings(spaceId, { income_sources: newSources });
    if (!ok) set({ incomeSources: prev }); // rollback
  },

  removeIncomeSource: async (id) => {
    const spaceId = get()._spaceId;
    if (!spaceId) return;
    const prev = get().incomeSources;
    const newSources = prev.filter(src => src.id !== id);
    set({ incomeSources: newSources }); // оптимистично
    const ok = await saveSettings(spaceId, { income_sources: newSources });
    if (!ok) set({ incomeSources: prev }); // rollback
  },

  addPayer: async (name) => {
    const spaceId = get()._spaceId;
    if (!spaceId) return;
    const prev = get().payers;
    const newPayers = [...prev, { id: crypto.randomUUID(), name }];
    set({ payers: newPayers }); // оптимистично
    const ok = await saveSettings(spaceId, { payers: newPayers });
    if (!ok) set({ payers: prev }); // rollback
  },

  removePayer: async (id) => {
    const spaceId = get()._spaceId;
    if (!spaceId) return;
    const prev = get().payers;
    const newPayers = prev.filter(p => p.id !== id);
    set({ payers: newPayers }); // оптимистично
    const ok = await saveSettings(spaceId, { payers: newPayers });
    if (!ok) set({ payers: prev }); // rollback
  },

  renamePayer: async (id, name) => {
    const spaceId = get()._spaceId;
    if (!spaceId) return;
    const prev = get().payers;
    const newPayers = prev.map(p => p.id === id ? { ...p, name } : p);
    set({ payers: newPayers }); // оптимистично
    const ok = await saveSettings(spaceId, { payers: newPayers });
    if (!ok) set({ payers: prev }); // rollback
  },
}));

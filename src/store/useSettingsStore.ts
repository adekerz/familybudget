import { create } from 'zustand';
import type { IncomeSourceConfig, DistributionRatios } from '../types';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './useAuthStore';

export type { DistributionRatios };

export interface PayerConfig {
  id: string;
  name: string;
}

// Дефолтные источники для family-пространства
export const FAMILY_INCOME_SOURCES: IncomeSourceConfig[] = [
  { id: 'husband_salary', name: 'Зарплата мужа',  day: 29 },
  { id: 'wife_advance',   name: 'Аванс жены',      day: 15 },
  { id: 'wife_salary',    name: 'Зарплата жены',   day: 'last' },
  { id: 'general',        name: 'Общий доход',     day: 10 },
];

export const FAMILY_PAYERS: PayerConfig[] = [
  { id: 'husband', name: 'Муж' },
  { id: 'wife',    name: 'Жена' },
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
          const r = payload.new as Record<string, any>;
          set({
            defaultRatios: r.default_ratios,
            incomeSources: r.income_sources,
            payers: r.payers,
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
      // Инициализируем настройки для нового пространства (если ещё нет в БД)
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
    await supabase.from('space_settings').update({ default_ratios: ratios }).eq('space_id', spaceId);
  },

  addIncomeSource: async (source) => {
    const spaceId = get()._spaceId;
    if (!spaceId) return;
    const newSources = [...get().incomeSources, { ...source, id: crypto.randomUUID() }];
    await supabase.from('space_settings').update({ income_sources: newSources }).eq('space_id', spaceId);
  },

  updateIncomeSource: async (id, patch) => {
    const spaceId = get()._spaceId;
    if (!spaceId) return;
    const newSources = get().incomeSources.map(src => src.id === id ? { ...src, ...patch } : src);
    await supabase.from('space_settings').update({ income_sources: newSources }).eq('space_id', spaceId);
  },

  removeIncomeSource: async (id) => {
    const spaceId = get()._spaceId;
    if (!spaceId) return;
    const newSources = get().incomeSources.filter(src => src.id !== id);
    await supabase.from('space_settings').update({ income_sources: newSources }).eq('space_id', spaceId);
  },

  addPayer: async (name) => {
    const spaceId = get()._spaceId;
    if (!spaceId) return;
    const newPayers = [...get().payers, { id: crypto.randomUUID(), name }];
    await supabase.from('space_settings').update({ payers: newPayers }).eq('space_id', spaceId);
  },

  removePayer: async (id) => {
    const spaceId = get()._spaceId;
    if (!spaceId) return;
    const newPayers = get().payers.filter(p => p.id !== id);
    await supabase.from('space_settings').update({ payers: newPayers }).eq('space_id', spaceId);
  },

  renamePayer: async (id, name) => {
    const spaceId = get()._spaceId;
    if (!spaceId) return;
    const newPayers = get().payers.map(p => p.id === id ? { ...p, name } : p);
    await supabase.from('space_settings').update({ payers: newPayers }).eq('space_id', spaceId);
  },
}));

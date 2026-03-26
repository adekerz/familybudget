import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { IncomeSourceConfig } from '../types';

export interface DistributionRatios {
  mandatory: number;
  flexible: number;
  savings: number;
}

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

// Дефолтные плательщики для family-пространства
export const FAMILY_PAYERS: PayerConfig[] = [
  { id: 'husband', name: 'Муж' },
  { id: 'wife',    name: 'Жена' },
  { id: 'shared',  name: 'Общие' },
];

interface SettingsStore {
  _spaceId: string | null;

  defaultRatios: DistributionRatios;
  updateDefaultRatios: (ratios: DistributionRatios) => void;

  incomeSources: IncomeSourceConfig[];
  addIncomeSource: (source: Omit<IncomeSourceConfig, 'id'>) => void;
  updateIncomeSource: (id: string, patch: Partial<Omit<IncomeSourceConfig, 'id'>>) => void;
  removeIncomeSource: (id: string) => void;

  payers: PayerConfig[];
  addPayer: (name: string) => void;
  removePayer: (id: string) => void;
  renamePayer: (id: string, name: string) => void;

  /** Вызывается при входе — сбрасывает настройки если пространство изменилось */
  initForSpace: (spaceId: string, isFamily: boolean) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      _spaceId: null,

      defaultRatios: { mandatory: 0.5, flexible: 0.3, savings: 0.2 },
      updateDefaultRatios: (ratios) => set({ defaultRatios: ratios }),

      incomeSources: FAMILY_INCOME_SOURCES,
      addIncomeSource: (source) => set((s) => ({
        incomeSources: [
          ...s.incomeSources,
          { ...source, id: crypto.randomUUID() },
        ],
      })),
      updateIncomeSource: (id, patch) => set((s) => ({
        incomeSources: s.incomeSources.map((src) =>
          src.id === id ? { ...src, ...patch } : src
        ),
      })),
      removeIncomeSource: (id) => set((s) => ({
        incomeSources: s.incomeSources.filter((src) => src.id !== id),
      })),

      payers: FAMILY_PAYERS,
      addPayer: (name) => set((s) => ({
        payers: [...s.payers, { id: crypto.randomUUID(), name }],
      })),
      removePayer: (id) => set((s) => ({
        payers: s.payers.filter((p) => p.id !== id),
      })),
      renamePayer: (id, name) => set((s) => ({
        payers: s.payers.map((p) => p.id === id ? { ...p, name } : p),
      })),

      initForSpace: (spaceId, isFamily) => {
        const current = get()._spaceId;
        if (current === spaceId) return; // уже инициализировано для этого пространства

        // Новое пространство — сбрасываем настройки
        set({
          _spaceId: spaceId,
          defaultRatios: { mandatory: 0.5, flexible: 0.3, savings: 0.2 },
          incomeSources: isFamily ? FAMILY_INCOME_SOURCES : [],
          payers: isFamily ? FAMILY_PAYERS : [],
        });
      },
    }),
    { name: 'family-budget-settings-v3' }
  )
);

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface DistributionRatios {
  mandatory: number;
  flexible: number;
  savings: number;
}

export interface IncomeDays {
  husband_salary: number;
  wife_advance: number;
  wife_salary: number | 'last';
  general: number;
}

interface SettingsStore {
  defaultRatios: DistributionRatios;
  updateDefaultRatios: (ratios: DistributionRatios) => void;
  incomeDays: IncomeDays;
  updateIncomeDay: (source: keyof IncomeDays, day: number | 'last') => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      defaultRatios: { mandatory: 0.5, flexible: 0.3, savings: 0.2 },
      updateDefaultRatios: (ratios) => set({ defaultRatios: ratios }),

      incomeDays: {
        husband_salary: 29,
        wife_advance: 15,
        wife_salary: 'last',
        general: 10,
      },
      updateIncomeDay: (source, day) => set(s => ({
        incomeDays: { ...s.incomeDays, [source]: day },
      })),
    }),
    { name: 'family-budget-settings' }
  )
);

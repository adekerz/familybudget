import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface DistributionRatios {
  mandatory: number;
  flexible: number;
  savings: number;
}

interface SettingsStore {
  defaultRatios: DistributionRatios;
  updateDefaultRatios: (ratios: DistributionRatios) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      defaultRatios: { mandatory: 0.5, flexible: 0.3, savings: 0.2 },

      updateDefaultRatios: (ratios) => set({ defaultRatios: ratios }),
    }),
    { name: 'family-budget-settings' }
  )
);

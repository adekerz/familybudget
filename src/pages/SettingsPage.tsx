import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Header } from '../components/layout/Header';
import { SettingsThemeSection } from '../components/settings/SettingsThemeSection';
import { SettingsIncomeSourcesSection } from '../components/settings/SettingsIncomeSourcesSection';
import { SettingsPayersSection } from '../components/settings/SettingsPayersSection';
import { SettingsDistributionSection } from '../components/settings/SettingsDistributionSection';
import { SettingsFixedExpensesSection } from '../components/settings/SettingsFixedExpensesSection';
import { SettingsCategoryLimitsSection } from '../components/settings/SettingsCategoryLimitsSection';
import { SettingsSecuritySection } from '../components/settings/SettingsSecuritySection';
import { SettingsDataSection } from '../components/settings/SettingsDataSection';
import { SettingsLanguageSection } from '../components/settings/SettingsLanguageSection';
import { RecurringSection } from '../components/settings/RecurringSection';
import { SettingsAccountsSection } from '../components/settings/SettingsAccountsSection';
import { SettingsShortcutsSection } from '../components/settings/SettingsShortcutsSection';

function SectionGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="text-[11px] font-bold uppercase tracking-widest px-1"
        style={{ color: 'var(--text3)' }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

export function SettingsPage() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--page)' }}>
      <Header />
      <main className="px-4 pt-4 space-y-8 max-w-lg mx-auto">

        <SectionGroup title={t('appearance')}>
          <SettingsLanguageSection />
          <SettingsThemeSection />
        </SectionGroup>

        <SectionGroup title={t('budget_settings')}>
          <SettingsDistributionSection />
          <SettingsIncomeSourcesSection />
          <SettingsFixedExpensesSection />
          <SettingsCategoryLimitsSection />
          <RecurringSection />
        </SectionGroup>

        <SectionGroup title={t('accounts_and_payers')}>
          <SettingsAccountsSection />
          <SettingsPayersSection />
        </SectionGroup>

        <SectionGroup title={t('security')}>
          <SettingsSecuritySection />
        </SectionGroup>

        <SectionGroup title={t('data_section')}>
          <SettingsShortcutsSection />
          <SettingsDataSection />
        </SectionGroup>

        <p className="text-center text-[11px] pb-4" style={{ color: 'var(--text3)' }}>
          Flux v2.0
        </p>
      </main>
    </div>
  );
}

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

export function SettingsPage() {
  return (
    <div className="min-h-screen bg-primary pb-24">
      <Header />
      <main className="px-4 pt-4 space-y-4 max-w-lg mx-auto">
        <SettingsLanguageSection />
        <SettingsThemeSection />
        <SettingsIncomeSourcesSection />
        <SettingsPayersSection />
        <SettingsDistributionSection />
        <SettingsAccountsSection />
        <SettingsFixedExpensesSection />
        <SettingsCategoryLimitsSection />
        <RecurringSection />
        <SettingsSecuritySection />
        <SettingsShortcutsSection />
        <SettingsDataSection />
        <p className="text-center text-muted text-xs pb-2">Flux v2.0 · Данные хранятся в Supabase</p>
      </main>
    </div>
  );
}

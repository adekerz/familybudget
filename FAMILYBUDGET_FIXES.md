# FamilyBudget — Фиксы и улучшения

> Прочитан весь код репозитория. Ниже точные проблемы и точные правки.

---

## Проблема 1: Язык переключается, но UI не перерисовывается

### Диагноз
`i18n` настроен правильно (`main.tsx` импортирует `./i18n`, `SettingsLanguageSection` вызывает `i18n.changeLanguage`). Проблема в том, что **ни один компонент не использует `useTranslation()`** — весь текст в `BottomNav`, `HeroCard`, `QuickAddSheet`, `DashboardPage` захардкожен строками на русском. Переключение языка ни на что не влияет, потому что нечего переключать.

### Фикс

#### Шаг 1: Расширить локали (все три файла)

**`src/i18n/locales/ru.json`** — заменить на полную версию:
```json
{
  "safe_to_spend": "Безопасно потратить",
  "daily_limit": "На сегодня",
  "add_expense": "Добавить расход",
  "add_income": "Добавить доход",
  "budget_period": "Период бюджета",
  "days_remaining": "{{count}} дн. до конца",
  "saved": "Сохранено ✓",
  "error": "Ошибка",
  "pace_on_track": "✓ В норме",
  "pace_warning": "⚡ Выше плана",
  "pace_danger": "⚠️ Слишком быстро",
  "expense": "Расход",
  "income": "Доход",
  "save": "Сохранить",
  "saving": "Сохранение...",
  "cancel": "Отмена",
  "back": "Назад",
  "next": "Далее",
  "dashboard": "Главная",
  "expenses": "Расходы",
  "budget": "Планы",
  "income_tab": "Доходы",
  "analytics": "Анализ",
  "goals": "Цели",
  "assistant": "Ассистент",
  "settings": "Настройки",
  "welcome": "Добро пожаловать!",
  "welcome_desc": "Добавьте первый доход, чтобы начать планирование бюджета",
  "budget_exceeded": "⚠️ Бюджет превышен",
  "days_left": "{{count}} дн. до конца периода",
  "today": "На сегодня",
  "forecast": "Прогноз трат",
  "setup_period": "Создай период → узнай точную сумму",
  "bank_breakdown": "Расходы по банкам",
  "recent_expenses": "Последние операции",
  "add_transaction": "Добавить операцию",
  "bank_kaspi": "Kaspi",
  "bank_halyk": "Halyk Bank",
  "bank_freedom": "Freedom Bank",
  "bank_forte": "ForteBank",
  "bank_other": "Другой"
}
```

**`src/i18n/locales/kz.json`** — заменить на полную версию:
```json
{
  "safe_to_spend": "Қауіпсіз жұмсауға болады",
  "daily_limit": "Бүгінге",
  "add_expense": "Шығыс қосу",
  "add_income": "Кіріс қосу",
  "budget_period": "Бюджет кезеңі",
  "days_remaining": "{{count}} күн қалды",
  "saved": "Сақталды ✓",
  "error": "Қате",
  "pace_on_track": "✓ Қалыпты",
  "pace_warning": "⚡ Жоспардан жоғары",
  "pace_danger": "⚠️ Тым жылдам",
  "expense": "Шығыс",
  "income": "Кіріс",
  "save": "Сақтау",
  "saving": "Сақталуда...",
  "cancel": "Болдырмау",
  "back": "Артқа",
  "next": "Келесі",
  "dashboard": "Басты бет",
  "expenses": "Шығыстар",
  "budget": "Жоспарлар",
  "income_tab": "Кірістер",
  "analytics": "Талдау",
  "goals": "Мақсаттар",
  "assistant": "Көмекші",
  "settings": "Параметрлер",
  "welcome": "Қош келдіңіз!",
  "welcome_desc": "Бюджетті жоспарлауды бастау үшін алғашқы кірісті қосыңыз",
  "budget_exceeded": "⚠️ Бюджет асып кетті",
  "days_left": "Кезеңнің соңына {{count}} күн",
  "today": "Бүгінге",
  "forecast": "Шығыс болжамы",
  "setup_period": "Кезең жасаңыз → нақты соманы біліңіз",
  "bank_breakdown": "Банктер бойынша шығыстар",
  "recent_expenses": "Соңғы операциялар",
  "add_transaction": "Операция қосу",
  "bank_kaspi": "Kaspi",
  "bank_halyk": "Halyk Bank",
  "bank_freedom": "Freedom Bank",
  "bank_forte": "ForteBank",
  "bank_other": "Басқа"
}
```

**`src/i18n/locales/en.json`** — заменить на полную версию:
```json
{
  "safe_to_spend": "Safe to spend",
  "daily_limit": "Today's limit",
  "add_expense": "Add expense",
  "add_income": "Add income",
  "budget_period": "Budget period",
  "days_remaining": "{{count}} days left",
  "saved": "Saved ✓",
  "error": "Error",
  "pace_on_track": "✓ On track",
  "pace_warning": "⚡ Above plan",
  "pace_danger": "⚠️ Too fast",
  "expense": "Expense",
  "income": "Income",
  "save": "Save",
  "saving": "Saving...",
  "cancel": "Cancel",
  "back": "Back",
  "next": "Next",
  "dashboard": "Home",
  "expenses": "Expenses",
  "budget": "Plans",
  "income_tab": "Income",
  "analytics": "Analytics",
  "goals": "Goals",
  "assistant": "Assistant",
  "settings": "Settings",
  "welcome": "Welcome!",
  "welcome_desc": "Add your first income to start budget planning",
  "budget_exceeded": "⚠️ Budget exceeded",
  "days_left": "{{count}} days until end",
  "today": "Today",
  "forecast": "Spending forecast",
  "setup_period": "Create a period → see exact amount",
  "bank_breakdown": "Spending by bank",
  "recent_expenses": "Recent transactions",
  "add_transaction": "Add transaction",
  "bank_kaspi": "Kaspi",
  "bank_halyk": "Halyk Bank",
  "bank_freedom": "Freedom Bank",
  "bank_forte": "ForteBank",
  "bank_other": "Other"
}
```

#### Шаг 2: Подключить переводы в `BottomNav.tsx`

Заменить хардкоженые строки в массиве `TABS` на ключи i18n. Полная замена файла `src/components/layout/BottomNav.tsx`:

```tsx
import { House, TrendUp, ShoppingCart, Target, Sparkle, ChartBar, ShieldCheck, CalendarBlank } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { useExpenseStore } from '../../store/useExpenseStore';
import { useAuthStore } from '../../store/useAuthStore';
import { navigateTo } from '../../lib/navigation';
import type { PageTab } from '../../types';

interface BottomNavProps {
  activeTab: PageTab;
  onChange: (tab: PageTab) => void;
}

export function BottomNav({ activeTab, onChange }: BottomNavProps) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const expenses = useExpenseStore((s) => s.expenses);

  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const uncategorized = expenses.filter(
    (e) =>
      (e.categoryId === 'other' || e.categoryId === 'other_flex') &&
      new Date(e.createdAt) > cutoff
  ).length;

  const TABS: { id: PageTab; labelKey: string; Icon: typeof House }[] = [
    { id: 'dashboard', labelKey: 'dashboard', Icon: House },
    { id: 'expenses', labelKey: 'expenses', Icon: ShoppingCart },
    { id: 'budget', labelKey: 'budget', Icon: CalendarBlank },
    { id: 'income', labelKey: 'income_tab', Icon: TrendUp },
    { id: 'analytics', labelKey: 'analytics', Icon: ChartBar },
    { id: 'goals', labelKey: 'goals', Icon: Target },
    { id: 'assistant', labelKey: 'assistant', Icon: Sparkle },
  ];

  const tabs = user?.role === 'admin'
    ? [...TABS, { id: 'admin' as PageTab, labelKey: 'Админ', Icon: ShieldCheck }]
    : TABS;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border pb-safe">
      <div className="flex">
        {tabs.map(({ id, labelKey, Icon }) => {
          const active = activeTab === id;
          const showBadge = id === 'expenses' && uncategorized > 0;

          return (
            <button
              key={id}
              onClick={() => { onChange(id); navigateTo(id); }}
              className={`relative flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
                active ? 'text-accent' : 'text-muted hover:text-ink'
              }`}
            >
              <div className="relative">
                <Icon size={22} strokeWidth={active ? 2.5 : 1.5} />
                {showBadge && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-warning text-white text-[9px] font-bold flex items-center justify-center">
                    {uncategorized > 9 ? '9+' : uncategorized}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-semibold leading-none">
                {id === 'admin' ? 'Админ' : t(labelKey)}
              </span>
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 bg-accent rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
```

#### Шаг 3: Подключить переводы в `HeroCard.tsx`

В `src/components/dashboard/HeroCard.tsx` добавить `useTranslation` и заменить строки:

```tsx
// В начале компонента:
import { useTranslation } from 'react-i18next';

export function HeroCard() {
  const { t } = useTranslation();
  const engine = useEngine();
  // ...

  return (
    <div className={`...`}>
      <p className="text-[10px] text-white/60 uppercase tracking-widest mb-1">
        {t('safe_to_spend')}
      </p>
      <p className="text-4xl font-bold text-white leading-none mb-1">
        {formatTenge(safeToSpend)}
      </p>
      <p className="text-white/70 text-xs mb-4">
        {isOverBudget ? t('budget_exceeded') : t('days_left', { count: daysRemaining })}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white/10 border border-white/20 rounded-2xl px-3 py-2">
          <p className="text-[9px] text-white/60 uppercase tracking-wider mb-1">{t('daily_limit')}</p>
          <p className={`text-base font-bold ${dailyLimit < 0 ? 'text-red-200' : 'text-white'}`}>
            {dailyLimit < 0 ? t('budget_exceeded') : formatTenge(dailyLimit)}
          </p>
        </div>
        <button onClick={() => navigateTo('budget')} className="...">
          <p className="text-[9px] text-white/60 uppercase tracking-wider mb-1">{t('forecast')}</p>
          <p className={`text-base font-bold ${...}`}>
            {t(paceStatus === 'on_track' ? 'pace_on_track' : paceStatus === 'warning' ? 'pace_warning' : 'pace_danger')}
          </p>
        </button>
      </div>
      {!hasPeriod && (
        <button onClick={() => navigateTo('budget')} className="...">
          {t('setup_period')}
        </button>
      )}
    </div>
  );
}
```

#### Шаг 4: `QuickAddSheet.tsx` — перевести кнопки

```tsx
import { useTranslation } from 'react-i18next';

export function QuickAddSheet(...) {
  const { t } = useTranslation();
  // ...
  
  // Переключатель режима:
  {(['expense', 'income'] as Mode[]).map(m => (
    <button key={m} onClick={() => setMode(m)} className="...">
      {m === 'expense' ? t('expense') : t('income')}
    </button>
  ))}
  
  // Кнопка сохранения:
  <button onClick={handleSave} disabled={!isValid || saving}>
    {saving ? t('saving') : t('save')}
  </button>
}
```

#### Шаг 5: `BankBreakdown.tsx` — заголовок

```tsx
import { useTranslation } from 'react-i18next';

export function BankBreakdown() {
  const { t } = useTranslation();
  // ...
  return (
    <div>
      <h3>{t('bank_breakdown')}</h3>
      {/* ... */}
    </div>
  );
}
```

---

## Проблема 2: Страница «Планы» зачем-то существует отдельно

### Диагноз
Ты прав — `BudgetPage` дублирует логику с `DashboardPage`. Но полностью удалять `BudgetPage` нельзя — там есть **уникальный функционал**:
- Создание/закрытие `pay_periods` (периодов ЗП)
- Добавление `planned_transactions` (планируемых платежей)
- `sinking_funds` (накопительные фонды)
- Экспорт PDF
- История закрытых периодов

Это не дублирование расчётов — это инструменты планирования. `HeroCard` на Dashboard читает `safeToSpend` из `useFinanceEngine` (который учитывает `planned_transactions`). Связь правильная.

**Настоящая проблема:** на `BudgetPage` был `SafeToSpendWidget` из старого стора — это и есть дублирование. Нужно убрать `SafeToSpendWidget` со страницы Планов и заменить на компактную версию из `useEngine()`.

### Фикс: переработать `BudgetPage.tsx`

Убрать `SafeToSpendWidget` (он дублирует HeroCard). Добавить компактную плашку из единого движка. Изменить заголовок страницы на «Планирование».

Заменить начало `BudgetPage.tsx` (блок с `SafeToSpendWidget`):

```tsx
// Убрать импорт:
// import { SafeToSpendWidget } from '../components/budget/SafeToSpendWidget';

// Добавить импорт:
import { useEngine } from '../store/useFinanceEngine';
import { formatTenge } from '../lib/calculations';
import { useTranslation } from 'react-i18next';

export function BudgetPage() {
  const { t } = useTranslation();
  const engine = useEngine();
  // ... остальной код без изменений ...
```

В JSX заменить `<SafeToSpendWidget summary={summary} />` на компактную плашку:

```tsx
{/* Компактная строка баланса из единого движка — та же цифра что на главной */}
{engine && (
  <div className={`rounded-2xl p-4 border flex items-center justify-between ${
    engine.isOverBudget ? 'bg-red-50 border-red-200' :
    engine.paceStatus === 'danger' ? 'bg-orange-50 border-orange-200' :
    'bg-green-50 border-green-200'
  }`}>
    <div>
      <p className="text-xs text-muted font-medium">{t('safe_to_spend')}</p>
      <p className={`text-2xl font-bold ${
        engine.isOverBudget ? 'text-red-600' : 'text-green-700'
      }`}>
        {formatTenge(engine.safeToSpend)}
      </p>
      <p className="text-xs text-muted mt-0.5">
        {t('daily_limit')}: {formatTenge(engine.dailyLimit)} · {engine.daysRemaining} дн.
      </p>
    </div>
    <div className={`text-2xl font-bold px-3 py-2 rounded-xl ${
      engine.paceStatus === 'on_track' ? 'bg-green-100 text-green-700' :
      engine.paceStatus === 'warning' ? 'bg-amber-100 text-amber-700' :
      'bg-red-100 text-red-700'
    }`}>
      {t(`pace_${engine.paceStatus}`)}
    </div>
  </div>
)}
```

Изменить заголовок страницы:
```tsx
<h1 className="text-base font-bold text-ink">Планирование</h1>
```

---

## Проблема 3: `SettingsLanguageSection` не реагирует на текущий язык при рендере

### Диагноз
`i18n.language` может возвращать `'ru-RU'` (с регионом) вместо `'ru'` при некоторых браузерных настройках. Сравнение `current === lang.code` не сработает.

### Фикс в `SettingsLanguageSection.tsx`

```tsx
// Заменить:
const current = i18n.language;

// На:
const current = i18n.language.split('-')[0]; // 'ru-RU' → 'ru'
```

---

## Проблема 4: Улучшения UX — что стоит добавить прямо сейчас

### 4.1 Показывать текущий язык в Header

В `src/components/layout/Header.tsx` добавить маленький индикатор языка рядом с настройками:

```tsx
import { useTranslation } from 'react-i18next';

export function Header() {
  const { i18n } = useTranslation();
  const langLabel = { ru: 'RU', kz: 'KZ', en: 'EN' }[i18n.language.split('-')[0]] ?? 'RU';
  
  // В JSX рядом с иконкой настроек:
  <button onClick={() => navigateTo('settings')} className="...">
    <span className="text-[10px] font-bold text-muted mr-1">{langLabel}</span>
    <GearSix size={20} />
  </button>
}
```

### 4.2 `DashboardPage` — убрать пустой `UpcomingPaymentsWidget` когда нет данных

В `DashboardPage.tsx` уже есть проверка `upcomingDays7.length > 0` — это правильно. Но `SetupChecklist` показывается даже после онбординга. Добавить условие:

```tsx
// Скрывать SetupChecklist если пользователь онбординг прошёл И есть данные
{!user?.onboarded && <SetupChecklist />}
```

### 4.3 Принудительный ре-рендер при смене языка в компонентах без `useTranslation`

В компонентах где текст берётся не через `t()` (например, данные из сторов на русском), язык не влияет на отображение — это правильно. Но нужно убедиться что `SettingsLanguageSection` после вызова `i18n.changeLanguage()` вызывает форс-апдейт всего дерева. `react-i18next` делает это автоматически через контекст, но только для компонентов с `useTranslation()`.

**Проверить:** после подключения `useTranslation()` в `BottomNav`, `HeroCard`, `QuickAddSheet` — смена языка должна сразу обновить эти компоненты без перезагрузки.

---

## Итог: порядок правок

```
1. src/i18n/locales/ru.json  — расширить (полный список ключей)
2. src/i18n/locales/kz.json  — расширить
3. src/i18n/locales/en.json  — расширить
4. src/components/layout/BottomNav.tsx  — useTranslation + t(labelKey)
5. src/components/dashboard/HeroCard.tsx — useTranslation + t()
6. src/components/QuickAddSheet.tsx — useTranslation для кнопок
7. src/components/dashboard/BankBreakdown.tsx — t('bank_breakdown')
8. src/components/settings/SettingsLanguageSection.tsx — i18n.language.split('-')[0]
9. src/pages/BudgetPage.tsx — убрать SafeToSpendWidget, добавить engine-плашку
10. npm run build — проверить
```

После этих правок: смена языка в настройках → `BottomNav`, `HeroCard`, кнопки `QuickAddSheet` сразу переключаются. Страница «Планы» показывает **ту же цифру** что и Dashboard (из `useEngine()`), без дублирования виджетов.

# FLUX — Полный Execution Prompt для Claude Code
# Финальная доработка, полировка, product logic

## Проект
- Repo: https://github.com/adekerz/familybudget
- URL: https://flux-ae.vercel.app
- Стек: React 19, TypeScript, Vite, Tailwind CSS 3, Zustand 5, Supabase, recharts, Phosphor Icons, i18next, PWA
- Деплой: Vercel
- Валюта: Тенге (₸), Казахстан

---

# РОЛЬ И ПОДХОД

Ты — elite-level AI agent с экспертизой в: frontend-design, ui-ux-pro-max, seo-technical, seo-audit, fintech product design, backend financial systems.

**ГЛАВНАЯ ЦЕЛЬ:** Превратить Flux из базового трекера расходов в систему принятия финансовых решений с сильным UX, чистой финансовой логикой и production-level frontend качеством.

**КРИТИЧЕСКИЙ ПОДХОД:**
- НЕ рассматривай это как только UI redesign
- Сначала найди: сломанную продуктовую логику, слабые UX flows, missing financial system
- Потом чини: и product logic, и user interface
- Думай как product owner + fintech architect, а не как "верстальщик"

---

# ФАЗА 0: АУДИТ И ДИАГНОСТИКА (сделай мысленно перед кодом)

## 0.1 Product + UX Audit

Проанализируй:
- Навигационная архитектура: 13 страниц (Dashboard, Expenses, Budget, Income, Analytics, Goals, Debts, Deposits, Assistant, Admin, Settings, Onboarding, Auth). Для одного приложения — много. Есть ли дублирование?
- Dashboard usefulness: помогает ли принимать решения? Сейчас: HeroCard (safe to spend), CategoryCards (бюджет по типам), DonutChart, AI insight, bank breakdown, recent expenses — это набор виджетов, а не decision system
- Expense flow: сколько тапов для добавления расхода? Оптимально 2-3, сейчас ~4-5
- Salary cycle logic: реализована через PayPeriod engine — ок, но два параллельных движка (computeEngineResult + useBudgetSummary) по-прежнему создают confusion
- Cognitive load: settings page — 12 секций без группировки, information overload
- Empty states: "Нет активных долгов", "Нет активных депозитов" — текстовые, без call to action
- Mobile UX: CategoryCards обрезаются, HeroCard метрики не помещаются

## 0.2 User Persona Simulation

Проверяй каждое изменение через три типа пользователей:
1. **Импульсивный тратитель** — заходит чтобы БЫСТРО записать расход. Ему нужен 2-tap flow. Не будет заполнять 5 полей
2. **Дисциплинированный планировщик** — устанавливает бюджеты, отслеживает лимиты, планирует. Ему нужны dashboartd alerts и forecasting
3. **На мели перед зарплатой** — заходит чтобы понять "сколько дней продержусь". Ему нужен spendable + daily limit + countdown

Где UX ломается для каждого — фикси.

## 0.3 Benchmarking

Используй реальные паттерны (не fantasy UI):
- Mobbin-style: реальные финтех приложения (Revolut, Wise, Kaspi — для KZ контекста)
- Apple-level clarity: strong spacing, visual hierarchy, no noise
- Envelope budgeting pattern: income → allocate → track → alert

---

# ФАЗА 1: КРИТИЧЕСКИЕ ФИКСЫ

## 1.1 Логотип — убрать чёрные квадраты

**Файлы:** `AuthPage.tsx`, `Header.tsx`, `AppShell.tsx`

**Проблема:** `flux-icon.png` и `flux-logo.png` имеют чёрный фон. При рендере как `<img>` видны чёрные квадраты.

**Решение:** Для всех `<img src="/icons/flux-icon.png">` добавить `style={{ mixBlendMode: 'screen' }}` — на тёмном фоне чёрный станет прозрачным.

Для `flux-logo.png` в Header и Sidebar — заменить на текстовый компонент:
```tsx
function FluxLogo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const h = { sm: 'h-6 w-6', md: 'h-8 w-8', lg: 'h-12 w-12' }[size];
  const text = { sm: 'text-base', md: 'text-lg', lg: 'text-2xl' }[size];
  return (
    <div className="flex items-center gap-2">
      <img src="/icons/flux-icon.png" alt="" className={`${h} rounded-lg`} style={{ mixBlendMode: 'screen' }} />
      <span className={`${text} font-extrabold flux-gradient-text`}>Flux</span>
    </div>
  );
}
```

В `AuthPage.tsx` — большая иконка с glow + текст:
```tsx
<img src="/icons/flux-icon.png" alt="Flux" className="w-20 h-20 rounded-3xl mb-4"
  style={{ mixBlendMode: 'screen', boxShadow: '0 0 60px rgba(0,212,255,0.2)' }} />
<span className="text-3xl font-extrabold flux-gradient-text">Flux</span>
<p className="text-sm mt-2" style={{ color: 'var(--text3)' }}>
  {t('smart_family_budget')}
</p>
```

CSS (в index.css):
```css
.flux-gradient-text {
  background: linear-gradient(135deg, #7DD3FC, #00D4FF);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
[data-theme="light"] .flux-gradient-text {
  background: linear-gradient(135deg, #0284C7, #0EA5E9);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

## 1.2 Тёмная полоса навигации на светлой теме

**Файлы:** `Header.tsx`, `AppShell.tsx`, `BottomNav.tsx`

**Проблема:** 5 мест с hardcoded `rgba(11,15,26, 0.92-0.95)`. На светлой теме — тёмная навигация на белом контенте.

**Решение — все навигационные элементы theme-responsive:**

Header.tsx (строка ~37):
```tsx
background: 'color-mix(in srgb, var(--card) 92%, transparent)',
```

AppShell.tsx sidebar (строка ~58):
```tsx
background: 'color-mix(in srgb, var(--card) 98%, transparent)',
```

BottomNav.tsx main bar (строка ~130):
```tsx
background: 'color-mix(in srgb, var(--card) 92%, transparent)',
```

Заменить ВСЕ hardcoded цвета в этих файлах:
- `color: '#475569'` → `color: 'var(--text3)'`
- `color: '#0B0F1A'` → `color: 'var(--ink)'`
- `color: '#F1F5F9'` → `color: 'var(--text1)'`
- `color: '#94A3B8'` → `color: 'var(--text3)'`
- `background: 'rgba(255,255,255,0.06)'` → `background: 'var(--sand)'` (или `color-mix(in srgb, var(--ink) 6%, transparent)`)
- `borderColor: 'rgba(255,255,255,0.06)'` → `borderColor: 'var(--border)'`
- `borderColor: 'rgba(255,255,255,0.08)'` → `borderColor: 'var(--border)'`

Кнопка "Добавить расход" в sidebar:
```tsx
background: 'linear-gradient(135deg, var(--cer), var(--cer-dark))',
color: '#fff',
```

## 1.3 Дублирование header ↔ sidebar на desktop

На desktop (≥768px) видно одновременно sidebar и header с дублирующимися элементами.

**Header.tsx — добавить responsive скрытие:**
```tsx
{/* Лого — только mobile */}
<div className="md:hidden"><FluxLogo /></div>
{/* Username — только mobile */}
{user && <span className="md:hidden ...">{capitalize(user.username)}</span>}
{/* Theme toggle — только mobile */}
<div className="md:hidden"><ThemeSwitcherCompact /></div>
```

На desktop Header показывает только: заголовок текущей страницы (опционально) + refresh + language/settings.

## 1.4 recharts width(-1) warning

**Файл:** `src/components/analytics/DonutChart.tsx` строка ~59

```tsx
// Было:
<ResponsiveContainer width="100%" height="100%">

// Стало:
<ResponsiveContainer width="100%" height={chartHeight} minWidth={100}>
```

Также в `DepositCalculator.tsx` строка ~138 — аналогично поставить height={160} вместо "100%".

## 1.5 "Ещё" drawer — проверить что работает

Текущая реализация использует conditional rendering + `animate-slide-up`. Проверить:
- Кнопка "Ещё" → drawer появляется
- Клик по backdrop → закрывается
- Выбор пункта → навигация + закрытие
- Если не работает — убедиться что `@keyframes slideUp` и `.animate-slide-up` есть в `index.css`

---

# ФАЗА 2: I18N — 29 HARDCODED СТРОК

## 2.1 Добавить ключи в все три файла

**`src/i18n/locales/ru.json` — добавить:**
```json
{
  "mandatory": "Обязательные",
  "mandatory_short": "Обязат.",
  "flexible": "Гибкие",
  "savings_label": "Накопления",
  "fixed_exp": "Фиксированные",
  "overspend": "перерасход",
  "i_owe": "Я должен",
  "owe_me": "Мне должны",
  "owes_me": "Должен мне",
  "theme_changed": "Тема изменена",
  "today_label": "Сегодня",
  "week_label": "Неделя",
  "month_label": "Месяц",
  "prev_month": "Прошлый месяц",
  "quarter": "Квартал",
  "mon": "Пн", "tue": "Вт", "wed": "Ср", "thu": "Чт", "fri": "Пт", "sat": "Сб", "sun": "Вс",
  "attention": "Внимание",
  "enter_name": "Укажи название",
  "never": "Никогда",
  "all_types": "Все",
  "last_day": "Последний",
  "expenses_total": "расходы",
  "ask_about_budget": "Спроси о своём бюджете...",
  "no_active_debts": "Нет активных долгов",
  "no_closed_debts": "Нет закрытых долгов",
  "no_active_deposits": "Нет активных депозитов",
  "no_users": "Нет пользователей",
  "no_prev_chats": "Нет предыдущих чатов",
  "no_data_period": "Нет данных за этот период",
  "smart_family_budget": "Умный семейный бюджет",
  "deposit_calculator": "Калькулятор депозита",
  "create_deposit": "Создать депозит",
  "appearance": "Внешний вид",
  "finance_settings": "Финансы",
  "security": "Безопасность",
  "data_section": "Данные",
  "data_stored_in_supabase": "Данные хранятся в Supabase",
  "close": "Закрыть",
  "amount_label": "Сумма",
  "rate_label": "Ставка",
  "term_months": "Срок (месяцев)",
  "monthly_topup": "Пополнение/мес",
  "capitalization": "Капитализация процентов",
  "final_amount": "Итоговая сумма",
  "income_earned": "Доход",
  "deposit_name_placeholder": "Название депозита",
  "saving_text": "Сохранение…",
  "add_device": "Добавить устройство",
  "forgot_password": "Забыл пароль?",
  "login_to_account": "Войдите в аккаунт"
}
```

**`src/i18n/locales/en.json` — добавить эквиваленты на английском.**
**`src/i18n/locales/kz.json` — добавить эквиваленты на казахском.**

## 2.2 Заменить hardcoded строки (17 файлов, 29 мест)

Полный список файлов и строк:
1. `ThemeSwitcher.tsx:11,40` — `'Тема изменена'` → `t('theme_changed')`
2. `DistributionPreview.tsx:24,31` → `t('flexible')`, `t('savings_label')`
3. `IncomeForm.tsx:124,125,248` → `t()` для type labels
4. `ExpenseForm.tsx:221` → `t()` для type labels
5. `SettingsDistributionSection.tsx:13,14` → `t()`
6. `SettingsIncomeSourcesSection.tsx:70` — `'Последний'` → `t('last_day')`
7. `UpcomingPaymentsWidget.tsx:14,53,60` — `'Сегодня'` → `t('today_label')`
8. `HealthScoreCard.tsx:13` — `'Внимание'` → `t('attention')`
9. `PaceIndicator.tsx:8` → `t('attention')`
10. `AddPlannedTransactionModal.tsx:25` → `t('enter_name')`
11. `AddSinkingFundModal.tsx:27` → `t('enter_name')`
12. `DonutChart.tsx:25` — `'расходы'` → `t('expenses_total')`
13. `AnalyticsPage.tsx:53,101-102,128` — period labels, type names, day labels
14. `ExpensesPage.tsx:18,25-26,125` — today, type labels
15. `DebtsPage.tsx:124,228` — direction labels
16. `AdminPage.tsx:40` — `'Никогда'` → `t('never')`
17. `AssistantPage.tsx:185` — placeholder
18. `DepositCalculator.tsx` — все русские строки (labels, placeholder, buttons)
19. `AppShell.tsx:99` и `BottomNav.tsx:113` — `'Админ'`/`'Долги'`/`'Депозиты'` тернарники → `t(labelKey)`
20. `SettingsPage.tsx` — "Flux v2.0 · Данные хранятся в Supabase"

**Важно:** Добавить `import { useTranslation } from 'react-i18next'` и `const { t } = useTranslation()` в каждый файл где добавляешь `t()`.

---

# ФАЗА 3: PRODUCT LOGIC — ФИНАНСОВОЕ ЯДРО

## 3.1 Архитектура финансовой системы

Сейчас есть ДВА расчётных движка:
- `computeEngineResult()` в `lib/calculations.ts` → `useFinanceEngine` → HeroCard, Dashboard
- `useBudgetSummary()` в `store/useBudgetStore.ts` → CategoryCards, HealthScore, Analytics

**Объединить в ОДИН источник правды:**

`computeEngineResult` — единственный engine. `useBudgetSummary` должен ЧИТАТЬ из `useFinanceEngine`, а не дублировать вычисления:

```ts
// useBudgetStore.ts — переписать useBudgetSummary:
export function useBudgetSummary(): BudgetSummary {
  const engine = useFinanceEngine(s => s.result);
  const fixedItems = usePlannedFixedStore(s => s.items);
  const incomeSources = useSettingsStore(s => s.incomeSources);
  const incomes = useIncomeStore(s => s.incomes);

  if (!engine) return DEFAULT_SUMMARY; // пустой BudgetSummary

  const fixedTotal = fixedItems.filter(f => f.isActive).reduce((s, f) => s + f.amount, 0);
  const distributable = Math.max(0, engine.totalIncome - fixedTotal);

  // Использовать ratios из настроек
  const ratios = useSettingsStore.getState().defaultRatios;
  const mandatoryBudget = Math.round(distributable * ratios.mandatory);
  const flexibleBudget = Math.round(distributable * ratios.flexible);
  const savingsBudget = distributable - mandatoryBudget - flexibleBudget;

  return {
    totalBalance: engine.rawBalance,
    mandatoryBudget,
    mandatorySpent: engine.mandatorySpent,
    mandatoryRemaining: mandatoryBudget - engine.mandatorySpent,
    flexibleBudget,
    flexibleSpent: engine.flexibleSpent,
    flexibleRemaining: flexibleBudget - engine.flexibleSpent,
    savingsBudget,
    savingsActual: engine.savingsSpent,
    savingsRemaining: savingsBudget - engine.savingsSpent,
    // ... rest
    fixedTotal,
    dailyFlexibleLimit: engine.dailyLimit,
    periodStart: engine.periodStart,
  };
}
```

## 3.2 Dashboard как Decision System

Dashboard должен отвечать на 3 вопроса:
1. **"Могу ли я тратить сейчас?"** → HeroCard: spendable amount + visual state (green/yellow/red)
2. **"На сколько дней хватит?"** → daily allowance + days countdown
3. **"Где я перерасходую?"** → alerts + category breakdown sorted by risk

**Иерархия блоков (строгий порядок приоритетов):**

```
1. HERO BLOCK (safe to spend + daily limit + days left + visual state)
2. ALERTS (если перерасход / высокий темп / превышение категории) — НЕЛЬЗЯ проигнорировать
3. SPENDING PACE (факт vs план, прогресс бар)
4. CATEGORY BREAKDOWN (от проблемных к нормальным)
5. QUICK ACTIONS (добавить расход — в 2 тапа)
6. FORECAST (на сколько дней хватит при текущем темпе)
7. DONUT CHART (expense breakdown)
8. RECENT TRANSACTIONS
9. BANK BREAKDOWN
10. AI INSIGHT (если есть)
11. SAVINGS/GOALS (низкий приоритет)
```

**Удалить с Dashboard:**
- SetupChecklist — показывать только если onboarded=false, после завершения убрать навсегда
- Пустые блоки без данных

## 3.3 Страница "Планирование" (BudgetPage)

BudgetPage содержит: pay period management, planned transactions, sinking funds, pace indicator, history.

**НЕ удалять**, но чётко разделить:
- **Dashboard** = "Могу ли я тратить?" (read-only, решения)
- **Budget** = "Как я управляю деньгами?" (write actions: создание периода, планирование платежей, фонды)

Если BudgetPage дублирует safe-to-spend / pace из Dashboard — убрать дубли с BudgetPage, оставить только management actions.

## 3.4 Edge Cases в финансовом ядре

Проверить и обработать:
1. **Нет доходов** — `computeEngineResult` с нулевым `totalIncome` → safeToSpend = 0, dailyLimit = 0, показать "Добавьте доход"
2. **Отрицательный баланс** — `rawBalance < 0` → isOverBudget = true, HeroCard красный, alert
3. **Перерасход категории** — categorySpent > categoryLimit → alert toast + visual indicator
4. **Пользователь не распределил доходы** — fallback ratios 50/30/20
5. **Смена периода** — при создании нового PayPeriod старый закрывается, расчёты сбрасываются
6. **`getPayPeriodRange` fallback** — если нет доходов в окне (24-е прошлого → сегодня), fallback на начало текущего месяца (НЕ на все доходы за всё время — это текущий баг в `dates.ts` строки ~190-200)

Фикс `dates.ts`:
```ts
// Строка ~196, было:
const sourceIncomes = cycleIncomes.length > 0 ? cycleIncomes : incomes;

// Стало:
if (cycleIncomes.length === 0) {
  return { start: new Date(y, m, 1, 0, 0, 0), end: todayEnd };
}
const sourceIncomes = cycleIncomes;
```

---

# ФАЗА 4: UX ARCHITECTURE

## 4.1 Expense Flow — минимум тапов

Текущий flow: (+) → numpad → выбор категории → сохранить = 3-4 тапа. Это ок.

Но QuickAddSheet требует проверки:
- Дефолтная категория: самая частая за 7 дней (уже есть в QuickExpenseBar)
- Дефолтный paidBy: первый из списка (не требовать выбор)
- Дефолтный accountId: первый активный
- Кнопка "Подробнее" для полной формы
- Суммы-пресеты (500, 1000, 2000, 5000) видны сразу

## 4.2 Empty States — с call to action

Заменить текстовые "Нет данных" на actionable empty states:
```tsx
// Вместо: <p>Нет активных долгов</p>
// Сделать:
<div className="flex flex-col items-center py-12 text-center">
  <CreditCard size={40} style={{ color: 'var(--text3)' }} />
  <p className="text-sm font-semibold mt-3" style={{ color: 'var(--ink)' }}>
    {t('no_active_debts')}
  </p>
  <p className="text-xs mt-1" style={{ color: 'var(--text3)' }}>
    {t('add_first_debt_hint')}
  </p>
  <button onClick={() => setShowAddForm(true)} className="mt-4 px-4 py-2 rounded-xl text-sm font-bold"
    style={{ background: 'var(--cer)', color: '#fff' }}>
    {t('add')}
  </button>
</div>
```

Применить к: DebtsPage, DepositsPage, GoalsPage, ExpensesPage (empty filter), AssistantPage (empty chat).

## 4.3 Settings Page — группировка

**Файл:** `src/pages/SettingsPage.tsx`

Сгруппировать с заголовками секций:
```
— Внешний вид: Language, Theme
— Финансы: Income Sources, Payers, Distribution, Accounts, Fixed Expenses, Category Limits, Recurring
— Безопасность: Face ID / Passkeys, Push Notifications
— Данные: iPhone Shortcuts, Export PDF, Clear Data, Logout
```

Каждая группа с `<h2>` заголовком.

---

# ФАЗА 5: UI / FRONTEND DESIGN

## 5.1 Принципы

- **Premium minimal** — Apple-level clarity
- **Strong spacing system** — 4px grid (p-1 = 4px, p-2 = 8px, p-3 = 12px, p-4 = 16px)
- **Visual hierarchy** — самое важное = самое большое и яркое
- **No visual noise** — убрать лишние borders, shadows, decorations
- **Mobile-first** — всё должно работать на 320px

## 5.2 Mobile Layout Fixes

**CategoryCards overflow:**
```tsx
<div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x no-scrollbar
                md:grid md:grid-cols-3 lg:grid-cols-4 md:overflow-visible md:mx-0 md:px-0">
  <div className="min-w-[160px] shrink-0 snap-start md:min-w-0 md:shrink ...">
```

**HeroCard metrics overflow:**
```tsx
{/* На mobile: stack вместо grid-cols-2 */}
<div className="flex flex-col gap-2 sm:grid sm:grid-cols-2">
```

**Desktop max-width:**
```tsx
// В DashboardPage, ExpensesPage, etc:
<main className="... max-w-4xl mx-auto">
```

## 5.3 Inconsistent UI States

Проверить что все interactive elements имеют:
- hover state (desktop)
- active:scale-95 (touch feedback)
- disabled state (opacity-40 + pointer-events-none)
- focus-visible (keyboard navigation)

---

# ФАЗА 6: WEBAUTHN AUDIT

## 6.1 Текущее состояние

WebAuthn реализован:
- Registration: `webauthn.ts` → `registerPasskey()` → вызывает Supabase Edge Function
- Login: `authenticatePasskey()` → discoverable credential
- Settings: `SettingsSecuritySection.tsx` — list/add/delete passkeys
- Auth page: auto-attempt passkey login при загрузке

## 6.2 Edge Cases для проверки

1. **Unsupported browser** — `browserSupportsWebAuthn()` проверяется. Кнопка скрыта если false. ОК.
2. **User cancellation** — Auth page обрабатывает `NotAllowed`, `cancel`, `abort` — просто return без ошибки. ОК.
3. **Timeout** — НЕ обрабатывается явно. Если passkey prompt висит >60sec и timeout, что покажется?
   - **Фикс:** Добавить catch для timeout в `loginWithPasskey`:
   ```ts
   } catch (e: unknown) {
     const msg = (e as Error).message ?? 'unknown';
     if (msg.includes('timeout')) return { ok: false, error: 'timeout' };
     return { ok: false, error: msg };
   }
   ```
   И в AuthPage показать user-friendly сообщение для timeout.

4. **Registration failure** — `registerPasskey` в auth store не имеет try/catch. Если edge function упадёт → unhandled promise rejection.
   - **Фикс:** Обернуть в try/catch, показать toast с ошибкой.

5. **Multiple passkeys** — UI для списка passkeys уже есть в Settings. ОК.

---

# ФАЗА 7: SEO + PERFORMANCE

## 7.1 Technical SEO

**index.html:**
```html
<!-- Добавить: -->
<link rel="canonical" href="https://flux-ae.vercel.app/">
<meta name="theme-color" content="#0B0F1A" media="(prefers-color-scheme: dark)">
<meta name="theme-color" content="#F8FAFC" media="(prefers-color-scheme: light)">
<meta name="robots" content="noindex, nofollow"> <!-- PWA, не нужен индекс -->
<html lang="ru"> <!-- уже есть, но нужно менять динамически при смене языка -->
```

**Semantic HTML — заменить divs:**
- `<header>` для Header (уже)
- `<aside>` для AppShell sidebar
- `<nav>` для BottomNav (уже)
- `<main>` для content area
- `<section>` для каждой секции в Settings

**Accessibility:**
- Все `<button>` без текста должны иметь `aria-label`
- Все `<img>` должны иметь `alt`
- Color contrast: проверить что text3 (#94A3B8 на #0B0F1A) имеет ratio ≥ 4.5:1
- Keyboard navigation: focus-visible стили

## 7.2 Performance

- Проверить что lazy loading работает для всех страниц кроме Dashboard и Auth
- Добавить `loading="lazy"` к images вне viewport
- Убедиться что icon.png/logo.png оптимизированы (размер файла)
- `user-scalable=no` в meta viewport — УДАЛИТЬ, это bad accessibility practice

## 7.3 HTML lang attribute

При смене языка обновлять `<html lang="...">`:
```ts
// В i18n/index.ts или при смене языка:
document.documentElement.lang = i18n.language.split('-')[0];
```

---

# ФАЗА 8: ПРОВЕРОЧНЫЙ ЧЕКЛИСТ

После всех изменений пройди по каждому пункту:

### Темы
- [ ] Светлая тема: header/sidebar/bottomnav — СВЕТЛЫЕ, нет тёмных полос
- [ ] Тёмная тема: всё читается, нет белых пятен
- [ ] Переключение плавное (250ms transition)

### Логотип
- [ ] Auth page: лого без чёрного квадрата
- [ ] Header mobile: лого красивое
- [ ] Sidebar desktop: лого красивое

### Навигация
- [ ] Desktop: нет дублирования header ↔ sidebar
- [ ] Mobile: "Ещё" drawer открывается и закрывается
- [ ] Mobile: все 5 табов кликабельны

### i18n
- [ ] EN → ВСЕ строки на английском
- [ ] KZ → ВСЕ строки на казахском
- [ ] RU → всё на русском

### Mobile
- [ ] CategoryCards не обрезаются (horizontal scroll)
- [ ] HeroCard метрики не обрезаются
- [ ] AssistantPage input не заходит за sidebar

### Console
- [ ] Нет 404 ошибок
- [ ] Нет 406 ошибок
- [ ] Нет width(-1) warnings

### WebAuthn
- [ ] Регистрация passkey работает
- [ ] Логин через passkey работает
- [ ] Отмена пользователем — без ошибки
- [ ] Unsupported browser — кнопка скрыта

### Product Logic
- [ ] Один расчётный движок (не два параллельных)
- [ ] Dashboard отвечает на "Могу ли я тратить?"
- [ ] Empty states с call to action
- [ ] Settings сгруппированы

---

# ФОРМАТ ОТЧЁТА

```
## Выполнено:
1. [Файл] — [Что изменилось]

## Не выполнено (с причиной):
1. [Пункт] — [Почему]

## i18n:
- Добавлено ключей: RU: X, EN: X, KZ: X
- Файлов обновлено: X

## Console после фикса:
- [список ошибок или "чисто"]

## Рекомендации:
1. ...
```

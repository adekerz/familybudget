# FLUX — Code Review & Fix Prompt (Post-Rebrand)

## Репозиторий
https://github.com/adekerz/familybudget

## Стек
React 19 + TypeScript + Vite + Tailwind CSS 3 + Zustand 5 + Supabase + recharts + Phosphor Icons + i18next + PWA

---

## ЧАСТЬ A: КРИТИЧЕСКИЕ БАГИ (Console Errors)

### A.1 — 404: Отсутствуют Supabase RPC функции

**Ошибка консоли:**
```
rpc/calculate_safe_to_spend → 404
rpc/calculate_pace → 404
```

**Файл:** `src/store/usePayPeriodStore.ts` строки 127-128

**Проблема:** `refreshSummary()` вызывает `supabase.rpc('calculate_safe_to_spend')` и `supabase.rpc('calculate_pace')`, но эти функции НЕ созданы в Supabase. Миграции 014-017 не содержат эти RPC.

**Решение — Вариант A (рекомендуемый):** Убрать RPC-вызовы и считать client-side. Заменить `refreshSummary()`:

```ts
refreshSummary: async () => {
  const { activePeriod } = get();
  const spaceId = useAuthStore.getState().user?.spaceId;
  if (!activePeriod || !spaceId) return;

  // Загрузить planned_transactions и sinking_funds
  const [txRes, fundsRes] = await Promise.all([
    supabase.from('planned_transactions')
      .select('*').eq('pay_period_id', activePeriod.id).order('scheduled_date'),
    supabase.from('sinking_funds')
      .select('*').eq('space_id', spaceId).eq('is_active', true).order('target_date'),
  ]);

  const plannedTransactions = (txRes.data ?? []).map(mapPlannedTx);
  const sinkingFunds = (fundsRes.data ?? []).map(mapSinkingFund);

  // Использовать computeEngineResult из lib/calculations.ts для safeToSpend и pace
  // Или вычислить inline:
  const incomes = useIncomeStore.getState().incomes;
  const expenses = useExpenseStore.getState().expenses;

  const result = computeEngineResult({
    period: { startDate: activePeriod.startDate, endDate: activePeriod.endDate, salaryAmount: activePeriod.salaryAmount },
    incomes, expenses, plannedTransactions,
  });

  set({
    summary: {
      safeToSpend: result.safeToSpend,
      dailyLimit: result.dailyLimit,
      paceStatus: result.paceStatus,
      paceRatio: result.paceRatio,
      expectedSpent: result.expectedSpent,
      projectedEndBalance: result.forecastEndBalance,
      daysRemaining: result.daysRemaining,
      variableBudget: result.totalIncome - result.mandatorySpent,
      progressPercent: result.daysTotal > 0 ? (result.daysPassed / result.daysTotal) * 100 : 0,
      plannedTransactions,
      sinkingFunds,
      upcomingDays7: plannedTransactions.filter(tx => {
        const d = new Date(tx.scheduledDate);
        const now = new Date();
        const diff = (d.getTime() - now.getTime()) / 86400000;
        return diff >= 0 && diff <= 7 && tx.status === 'pending';
      }),
    },
  });
};
```

**Вариант B:** Создать RPC functions в Supabase. Но это требует admin-доступа и добавляет сложность. Вариант A проще и консистентнее с существующим `computeEngineResult`.

### A.2 — 406: ai_insights запрос с неправильным Accept header

**Ошибка консоли:**
```
ai_insights?select=text,created_at&...&limit=1 → 406
```

**Файл:** `src/pages/DashboardPage.tsx` строки 44-55

**Проблема:** `.single()` на запросе, который может вернуть 0 строк. Supabase возвращает 406 когда `.single()` не находит ровно 1 строку.

**Решение:**
```ts
// Было:
.single()
.then(({ data }) => {
  if (data) setDbInsight(data.text);
});

// Стало:
.maybeSingle()
.then(({ data }) => {
  if (data) setDbInsight(data.text);
});
```

### A.3 — recharts width(-1) height(-1) warning

**Ошибка консоли:**
```
The width(-1) and height(-1) of chart should be greater than 0
```

**Файл:** `src/components/analytics/DonutChart.tsx` и `src/pages/DashboardPage.tsx`

**Проблема:** `ResponsiveContainer` с `height="100%"` внутри контейнера без явной высоты. На mobile DonutChart рендерится в div с `style={{ height: chartHeight }}`, но на desktop в conditionally rendered блоке, который может иметь 0 высоту при первом рендере.

**Решение:** Добавить `minHeight` на контейнер:
```tsx
// DonutChart.tsx — заменить:
<div style={{ height: chartHeight }}>
  <ResponsiveContainer width="100%" height="100%">

// На:
<div style={{ height: chartHeight, minWidth: 0 }}>
  <ResponsiveContainer width="100%" height={chartHeight} minWidth={200}>
```

Также на DashboardPage — обернуть DonutChart в conditional с проверкой что данные загружены:
```tsx
{!isLoading && donutData.length > 0 && (
  <div className="rounded-2xl border p-4" ...>
    <DonutChart data={donutData} compact />
  </div>
)}
```

---

## ЧАСТЬ B: UI/UX БАГИ

### B.1 — Дублирование кнопок в Header и Sidebar

**Проблема (скриншот 1):** На desktop видны И sidebar (Flux лого, навигация, theme toggle, user badge) И header (Flux лого, username badge, refresh, theme toggle, settings/lang). Дублируются: лого, theme toggle, username.

**Решение:** Header на desktop должен быть ДРУГИМ — без лого и без элементов, которые уже есть в sidebar:

```tsx
// Header.tsx — обновить:
export function Header() {
  const { i18n } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [refreshing, setRefreshing] = useState(false);
  const langLabel = ...;
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;
  // Или лучше: используй CSS + responsive:

  return (
    <header className="flex items-center justify-between px-4 py-3 sticky top-0 z-40 border-b"
      style={{
        background: 'rgba(11,15,26,0.92)',
        backdropFilter: 'blur(20px)',
        borderColor: 'rgba(255,255,255,0.06)',
      }}
    >
      {/* Logo — только на mobile, на desktop уже есть в sidebar */}
      <div className="md:hidden">
        <img src="/icons/flux-logo.png" alt="Flux" className="h-7 w-auto" />
      </div>

      {/* Заголовок страницы — на desktop */}
      <div className="hidden md:block">
        <h1 className="text-lg font-bold" style={{ color: 'var(--ink)' }}>
          {/* Текущая страница — можно передать через props или context */}
        </h1>
      </div>

      <div className="flex items-center gap-2">
        {/* Username — только на mobile, на desktop есть в sidebar */}
        {user && (
          <span className="md:hidden text-xs font-medium px-2 py-1 rounded-lg border" ...>
            {capitalize(user.username)}
          </span>
        )}
        <button onClick={handleRefresh} ... />
        {/* Theme toggle — только на mobile, на desktop есть в sidebar */}
        <div className="md:hidden"><ThemeSwitcherCompact /></div>
        <button onClick={() => navigateTo('settings')} ... />
      </div>
    </header>
  );
}
```

### B.2 — Лого Flux некрасиво выделяется

**Проблема (скриншот 2, 3, 4):** Логотип flux-logo.png отрисован с тёмным фоном и neon glow — при вставке как `<img>` видно квадратный чёрный фон на header'е, который уже тёмный. На светлой теме будет ещё хуже.

**Решение — несколько вариантов:**

**Вариант A (быстрый):** Сделать фон логотипа прозрачным. Обработать logo.png через canvas или imagemagick, убрав чёрный фон. Или пересоздать лого как SVG.

**Вариант B (CSS):** Использовать `mix-blend-mode: screen` на тёмном фоне (работает с текущим лого):
```css
.flux-logo-img {
  mix-blend-mode: screen; /* чёрный фон становится прозрачным */
}
```
```tsx
<img src="/icons/flux-logo.png" alt="Flux" className="h-7 w-auto flux-logo-img" />
```
На ТЁМНОЙ теме это работает идеально. На СВЕТЛОЙ — нет (screen blend mode на белом фоне сделает лого невидимым).

**Вариант C (рекомендуемый):** Создать SVG версию лого или текстовый компонент:
```tsx
function FluxLogo({ className = 'h-7' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img src="/icons/flux-icon.png" alt="" className="h-8 w-8 rounded-lg" />
      <span className="text-lg font-extrabold flux-gradient-text">Flux</span>
    </div>
  );
}
```
Где `flux-gradient-text` уже есть в CSS:
```css
.flux-gradient-text {
  background: linear-gradient(135deg, #7DD3FC, #00D4FF);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
```
На светлой теме использовать solid color вместо gradient:
```css
[data-theme="light"] .flux-gradient-text {
  background: #0284C7;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

### B.3 — "Ещё" drawer не открывается на mobile

**Проблема (скриншот 3):** На mobile видна кнопка "Ещё" в bottom nav, но при нажатии drawer не появляется. Внизу мобильного скрина видно `ЕЩЁ ×` — drawer есть, но позиционирование неправильное.

**Файл:** `src/components/layout/BottomNav.tsx`

**Проблема в CSS:** drawer позиционируется с `bottom: calc(64px + env(safe-area-inset-bottom, 0px))`, но transform `translate-y-full` прячет его ЗА экран. Однако transition может не срабатывать из-за `translate-y-full` — когда moreOpen=true drawer должен показать `translate-y-0`, но если у контейнера нет фиксированной высоты, `translate-y-full` не знает от чего считать.

**Решение:** Заменить translate-based animation на opacity + visibility или absolute positioning:

```tsx
{/* Backdrop */}
{moreOpen && (
  <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
    onClick={() => setMoreOpen(false)} />
)}

{/* Drawer */}
<div className={`fixed left-0 right-0 z-50 md:hidden transition-all duration-300 ease-out ${
  moreOpen
    ? 'opacity-100 pointer-events-auto'
    : 'opacity-0 pointer-events-none translate-y-4'
}`}
  style={{ bottom: 'calc(64px + env(safe-area-inset-bottom, 0px))' }}
>
  {/* ... drawer content ... */}
</div>
```

Или проще — использовать conditional rendering вместо translate:
```tsx
{moreOpen && (
  <>
    <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
      onClick={() => setMoreOpen(false)} />
    <div className="fixed left-0 right-0 z-50 md:hidden animate-slide-up"
      style={{ bottom: 'calc(64px + env(safe-area-inset-bottom, 0px))' }}>
      {/* drawer content */}
    </div>
  </>
)}
```

Добавить анимацию в CSS:
```css
@keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
.animate-slide-up { animation: slide-up 0.25s ease-out both; }
```

### B.4 — AssistantPage input field заходит за sidebar

**Файл:** `src/pages/AssistantPage.tsx` строка 178

**Проблема:** Input field имеет `fixed bottom-[64px] left-0 right-0` — на desktop `left-0` заходит под sidebar (который 256px wide). 

**Решение:**
```tsx
<div className="fixed bottom-[64px] md:bottom-0 left-0 md:left-64 right-0 px-4 pb-3 ..."
```

Также обновить `<main>` area padding-bottom для desktop:
```tsx
<main className="flex-1 overflow-y-auto px-4 pt-4 pb-28 md:pb-20 space-y-4 max-w-3xl mx-auto">
```

### B.5 — Bottom nav pb-safe на mobile + desktop скрытие

**Проблема:** BottomNav имеет `md:hidden` в App.tsx, но внутри BottomNav drawer overlay (`fixed inset-0`) может перекрывать desktop layout.

**Решение:** Добавить `md:hidden` к backdrop и drawer внутри BottomNav (уже указано в B.3).

---

## ЧАСТЬ C: I18N — НЕПЕРЕВЕДЁННЫЕ СТРОКИ

Найдено ~35+ hardcoded русских строк в JSX вне i18n. Все нужно перенести в `src/i18n/locales/ru.json`, `en.json`, `kz.json`:

**Добавить ключи в i18n:**
```json
{
  "debts": "Долги",
  "deposits": "Депозиты",
  "mandatory_short": "Обязат.",
  "flexible": "Гибкие",
  "savings_label": "Накопления",
  "fixed_expenses": "Фиксированные",
  "overspend": "перерасход",
  "remaining": "осталось",
  "deducted_from_income": "вычтено из дохода",
  "i_owe": "Я должен",
  "owe_me": "Мне должны",
  "loading": "Загрузка…",
  "no_active_deposits": "Нет активных депозитов",
  "calculator_new_deposit": "Калькулятор + новый депозит",
  "theme_changed": "Тема изменена",
  "current_theme": "Текущая тема",
  "new_chat": "Новый чат",
  "no_previous_chats": "Нет предыдущих чатов",
  "ask_about_budget": "Спроси о своём бюджете...",
  "expense_structure": "Структура расходов",
  "today": "Сегодня",
  "week": "Неделя",
  "month": "Месяц",
  "prev_month": "Прошлый месяц",
  "quarter": "Квартал",
  "never": "Никогда",
  "all": "Все",
  "mon": "Пн", "tue": "Вт", "wed": "Ср", "thu": "Чт", "fri": "Пт", "sat": "Сб", "sun": "Вс",
  "attention": "Внимание",
  "enter_name": "Укажи название",
  "auto_prefix": "Авто",
  "last_day": "Последний",
  "add_expense_btn": "Добавить расход",
  "expenses_label": "расходы"
}
```

**Файлы для обновления:**
- `src/components/layout/AppShell.tsx` строка 99 — заменить тернарники на `t(labelKey)` (предварительно добавив ключи `debts`, `deposits` в i18n)
- `src/components/layout/BottomNav.tsx` строка 113 — аналогично
- `src/pages/AnalyticsPage.tsx` строки 53, 101-102, 128 — `PERIOD_LABELS`, type names, day labels
- `src/pages/ExpensesPage.tsx` строки 18, 25-26, 125 — today/type labels
- `src/pages/DashboardPage.tsx` строки 69-71 — type names в donut data
- `src/pages/DebtsPage.tsx` строки 124, 228 — direction labels
- `src/pages/AdminPage.tsx` строка 40 — "Никогда"
- `src/components/expenses/ExpenseForm.tsx` строка 221 — type names
- `src/components/ui/ThemeSwitcher.tsx` строки 11, 40 — toast messages
- `src/components/dashboard/UpcomingPaymentsWidget.tsx` строки 14, 53, 60 — "Сегодня"
- `src/components/dashboard/HealthScoreCard.tsx` строка 13 — "Внимание"
- `src/components/income/DistributionPreview.tsx` строка 24, 31 — labels
- `src/components/income/IncomeForm.tsx` строки 124-125, 248 — labels
- `src/components/settings/SettingsDistributionSection.tsx` строки 13-14
- `src/components/settings/SettingsIncomeSourcesSection.tsx` строка 70 — "Последний"
- `src/components/budget/AddSinkingFundModal.tsx` строка 27 — validation error
- `src/components/budget/PaceIndicator.tsx` строка 8 — "Внимание"
- `src/components/budget/AddPlannedTransactionModal.tsx` строка 25
- `src/components/analytics/DonutChart.tsx` строка 25 — "расходы"
- `src/pages/AssistantPage.tsx` строка 185 — placeholder

---

## ЧАСТЬ D: НЕПОДКЛЮЧЁННЫЕ ФИЧИ (end-to-end gaps)

### D.1 — Debts и Deposits не загружаются при старте

**Проблема:** `App.tsx` не вызывает `useDebtStore.loadDebts()` и `useDepositStore.loadDeposits()` при аутентификации. Они загружаются только при открытии страницы (через `useEffect` в page component). Это значит:
- Dashboard не может показать виджет "ближайшие платежи по долгам"
- При переключении между табами данные перезагружаются каждый раз

**Решение:** Добавить в `App.tsx` блок `useEffect(() => { if (isAuthenticated) { ... } })`:
```ts
import { useDebtStore } from './store/useDebtStore';
import { useDepositStore } from './store/useDepositStore';
// ...
useDebtStore.getState().loadDebts();
useDepositStore.getState().loadDeposits();
```

### D.2 — Recurring expenses: нет UI для управления

**Проблема:** `useRecurringStore` существует и `generateDue()` вызывается в App.tsx, но **нет страницы/компонента** для добавления, просмотра и управления повторяющимися расходами. Пользователь не может создать recurring expense через UI.

**Решение:** Создать `src/components/settings/SettingsRecurringSection.tsx`:
- Список существующих шаблонов с toggle active/inactive
- Кнопка "Добавить шаблон" → форма: название, сумма, категория, частота (daily/weekly/monthly/yearly), день месяца/недели
- Кнопка удаления
- Добавить эту секцию в `SettingsPage.tsx`

ИЛИ добавить секцию в `BudgetPage.tsx` — логически recurring expenses ближе к бюджетированию.

### D.3 — Deposit Calculator: нет "Создать депозит" из результата

**Файл:** `src/components/deposits/DepositCalculator.tsx`

**Проверить:** Есть ли кнопка "Сохранить как депозит" после расчёта? Если нет — результат калькулятора не сохраняется, это dead-end UI.

### D.4 — Category limits: `monthlyLimit` не используется в UI

**Проблема:** Тип `Category` имеет `monthlyLimit?: number`, хук `useCategoryLimitAlerts` существует, но:
- Проверить: вызывается ли `useCategoryLimitAlerts` где-нибудь?
- Есть ли UI для установки лимитов в настройках категорий?

```bash
grep -rn "useCategoryLimitAlerts" src/
```
Если не вызывается — подключить в `App.tsx` или `DashboardPage.tsx`.

### D.5 — Account balances не обновляются при расходах/доходах

**Проблема:** `Account.balance` — есть ли логика обновления баланса при создании расхода/дохода? Или баланс чисто декоративный?

Проверить `useExpenseStore.addExpense()` и `useIncomeStore.addIncome()` — обновляют ли они `accounts.balance`.

---

## ЧАСТЬ E: ДИЗАЙН-ПОЛИРОВКА

### E.1 — Sidebar hardcoded dark colors

**Проблема:** Sidebar в `AppShell.tsx` использует hardcoded `rgba(11,15,26,0.95)` и `color: '#475569'` — не реагирует на тему. На светлой теме sidebar остаётся тёмным.

**Решение — два варианта:**
1. **Sidebar всегда тёмный** (как Spotify, Linear) — тогда ok, но добавить CSS var для sidebar-специфичных цветов
2. **Sidebar реагирует на тему** — заменить hardcoded values на CSS variables:
```tsx
style={{
  background: 'var(--card)',
  borderRight: '1px solid var(--border)',
}}
```

Рекомендую вариант 1 (sidebar always dark) — это modern web app practice и визуально отделяет навигацию от контента.

### E.2 — Header всегда тёмный на светлой теме

**Проблема:** Header hardcoded `background: 'rgba(11,15,26,0.92)'` — на светлой теме header остаётся dark navy.

**Решение:** Если sidebar always dark — header тоже always dark (консистентность). Но если хочется theme-responsive header:
```tsx
style={{
  background: 'color-mix(in srgb, var(--card) 92%, transparent)',
  backdropFilter: 'blur(20px)',
  borderColor: 'var(--border)',
}}
```

### E.3 — Mobile: CategoryCards усечены на маленьких экранах

**Проблема (скриншот 3):** На мобильном скрине категории "ОБЯЗАТ.", "ГИБКИЕ" и суммы обрезаны — не помещаются в grid.

**Решение:** На mobile использовать horizontal scroll вместо grid:
```tsx
// CategoryCards — заменить grid на:
<div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory
                md:grid md:grid-cols-3 md:gap-3 md:overflow-visible md:mx-0 md:px-0">
  {/* Каждая карточка */}
  <div className="min-w-[140px] shrink-0 snap-start md:min-w-0 md:shrink">
    {/* ... */}
  </div>
</div>
```

### E.4 — Desktop: max-width на content area

**Проблема:** На широких мониторах контент растягивается на всю ширину content area. Нет max-width.

**Решение:** В `AppShell.tsx` main area:
```tsx
<main className="flex-1 md:ml-64 min-h-screen">
  <div className="max-w-5xl mx-auto">
    {children}
  </div>
</main>
```

---

## ЧАСТЬ F: iOS SHORTCUT ИНТЕГРАЦИЯ

Добавить секцию в настройках для iOS пользователей:

```tsx
// src/components/settings/SettingsShortcutsSection.tsx
export function SettingsShortcutsSection() {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (!isIOS) return null;

  const DOMAIN = window.location.origin;

  return (
    <section className="rounded-2xl overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <Command size={16} style={{ color: 'var(--cer)' }} />
        <p className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>Быстрые команды iPhone</p>
      </div>
      <div className="px-4 py-4 space-y-3">
        <p className="text-xs" style={{ color: 'var(--text3)' }}>
          Добавьте ярлык на экран «Домой» — один тап и сразу форма расхода
        </p>
        {/* Ссылка на iCloud Shortcut — заменить на реальный ID после создания */}
        <a
          href="https://www.icloud.com/shortcuts/YOUR_SHORTCUT_ID"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-3 rounded-xl"
          style={{ background: 'var(--cer-light)', border: '1px solid var(--cer)' }}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--cer)' }}>
            <Plus size={20} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Flux: Добавить расход</p>
            <p className="text-xs" style={{ color: 'var(--text3)' }}>Установить команду →</p>
          </div>
        </a>
        <p className="text-[10px]" style={{ color: 'var(--text3)' }}>
          После установки: долгое нажатие → «На экран Домой»
        </p>
      </div>
    </section>
  );
}
```

На iPhone создать Shortcut:
1. Действие "URL" → `{DOMAIN}/dashboard?type=expense`
2. Действие "Открыть URL"
3. Поделиться → "Скопировать ссылку iCloud"
4. Вставить ID в код выше

---

## ЧАСТЬ G: ПРИОРИТЕТЫ

### P0 — Критические (ломают функциональность):
1. **A.1** — 404 RPC → client-side calculation
2. **A.2** — 406 ai_insights → `.maybeSingle()`
3. **B.3** — "Ещё" drawer не открывается на mobile
4. **B.4** — AssistantPage input за sidebar

### P1 — Высокие (плохой UX):
5. **B.1** — Дублирование header/sidebar
6. **B.2** — Лого некрасиво выделяется
7. **A.3** — recharts width(-1) warning
8. **D.1** — Debts/Deposits не загружаются при старте

### P2 — Средние (i18n, polish):
9. **C** — Все hardcoded русские строки → i18n (35+ мест)
10. **E.1-E.4** — Дизайн-полировка
11. **D.2** — Recurring expenses UI
12. **D.4** — Category limits подключить

### P3 — Низкие (improvements):
13. **D.3** — Deposit calculator → save
14. **D.5** — Account balance tracking
15. **F** — iOS Shortcuts интеграция

# FLUX — Полный промт рефакторинга FamilyBudget → Flux

## Контекст проекта

Репозиторий: https://github.com/adekerz/familybudget
Стек: React 19 + TypeScript + Vite + Tailwind CSS 3.x + Zustand 5 + Supabase + recharts + Phosphor Icons + i18next + PWA (vite-plugin-pwa)
Деплой: Vercel
Целевая аудитория: Семейные пары и индивидуальные пользователи в Казахстане, валюта — тенге (₸)
Бренд: **Flux** (ребрендинг с FamilyBudget). Логотип — неоновая буква "F" на тёмном фоне с cyan свечением. Цвета бренда: deep navy (#0B0F1A), cyan glow (#00D4FF → #7DD3FC gradient)

---

## ЧАСТЬ 1: РЕБРЕНДИНГ — FamilyBudget → Flux

### 1.1 Полное удаление концепции husband/wife

Удалить ВСЕ references на husband/wife во всём проекте. Это 27+ вхождений в коде.

**Конкретные файлы и изменения:**

**`src/lib/themes.ts`:**
- Удалить темы `wife` и `husband` полностью
- Оставить ТОЛЬКО `light` и `dark` (с новым дизайном, см. часть 2)
- `ThemeId = 'light' | 'dark'`

**`src/store/useThemeStore.ts`:**
- Убрать любую логику привязки к `wife`/`husband`
- Дефолт: `'dark'` (Flux — dark-first бренд)

**`src/components/ui/ThemeSwitcher.tsx`:**
- Убрать `useIsFamily()` и всю ветвление family/non-family
- Простой переключатель light/dark
- Compact: toggle иконка Sun/Moon
- Full: две карточки с превью цветов темы

**`src/store/useSettingsStore.ts`:**
- Заменить `FAMILY_INCOME_SOURCES`: убрать `husband_salary`, `wife_advance`, `wife_salary` — оставить два дефолта:
  ```ts
  { id: 'salary_1', name: 'Зарплата', day: 29 },
  { id: 'general', name: 'Другой доход', day: 10 },
  ```
- Заменить `FAMILY_PAYERS`: убрать `husband`/`wife` — оставить:
  ```ts
  { id: 'me', name: 'Я' },
  { id: 'partner', name: 'Партнёр' },
  { id: 'shared', name: 'Общие' },
  ```

**`src/constants/categories.ts`:**
- Удалить `INCOME_SOURCE_LABELS` с husband/wife
- Удалить `INCOME_SOURCE_DAYS` с husband/wife

**`src/types/index.ts`:**
- Убрать `husband_salary`, `wife_advance`, `wife_salary` из `IncomeSource`
- Обновить комментарий у `paidBy` — убрать 'husband' | 'wife'

**`src/store/useAuthStore.ts`:**
- Строка ~198: заменить `theme_id: 'wife'` → `theme_id: 'dark'`

**`src/index.css`:**
- Удалить весь блок `[data-theme="husband"]` (CSS vars, body bg, card-glow, hero-card, bar-accent)
- Удалить `[data-theme="wife"] body` и media query
- Удалить ссылки на `/icons/bg-mobile.png`, `/icons/bg-desktop.png`, `/icons/bg-husband.jpg`

**`src/pages/AuthPage.tsx`:**
- Заменить `'FamilyBudget — Recovery Codes'` → `'Flux — Recovery Codes'`
- Заменить `familybudget-recovery-` → `flux-recovery-`

**`src/lib/dates.ts`:**
- Строка ~173: убрать комментарий про "зарплата мужа" / "аванс жены"

### 1.2 Брендинг Flux

- Заменить название "FamilyBudget" / "Family Budget" на "Flux" во всех строках, title, meta tags
- `index.html`: обновить `<title>`, мета-теги, manifest ссылки
- Логотип Flux (загружен как `logo.png` и `icon.png`) использовать:
  - В `Header` компоненте вместо текстового заголовка
  - В `AuthPage` как hero-элемент
  - PWA manifest icons
- Фавикон обновить на icon.png

---

## ЧАСТЬ 2: UI/UX РЕФАКТОРИНГ — Fintech Premium Design

### 2.1 Дизайн-система — Две профессиональные темы

**DARK THEME (Primary — бренд Flux):**
```
Background:      #0B0F1A (deep navy)
Surface/Card:    #111827 (elevated panels)
Surface-alt:     #1A2332 (secondary surfaces)
Border:          rgba(255,255,255,0.06)
Primary accent:  linear-gradient(135deg, #00D4FF, #7DD3FC) — cyan gradient
Text primary:    #F1F5F9
Text secondary:  #94A3B8
Text muted:      #475569
Income green:    #34D399 (soft green)
Expense red:     #F87171 (muted red)
Warning:         #FBBF24
Success bg:      rgba(52,211,153,0.1)
Danger bg:       rgba(248,113,113,0.1)
Glass effect:    background: rgba(17,24,39,0.6); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.06)
Shadows:         0 8px 32px rgba(0,0,0,0.4)
Glow on accent:  0 0 20px rgba(0,212,255,0.15)
```

**LIGHT THEME:**
```
Background:      #F8FAFC
Surface/Card:    #FFFFFF
Surface-alt:     #F1F5F9
Border:          #E2E8F0
Primary accent:  #0EA5E9 (solid sky blue — no gradient on light)
Text primary:    #0F172A
Text secondary:  #475569
Text muted:      #94A3B8
Income green:    #059669
Expense red:     #DC2626
Shadows:         0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)
```

**CSS Variables mapping (обновить в `tailwind.config.ts` и `:root`):**
```css
:root {
  --page: #F8FAFC;
  --card: #FFFFFF;
  --card2: #F1F5F9;
  --border: #E2E8F0;
  --accent: #0EA5E9;
  --accent-light: #E0F2FE;
  --accent-dark: #0284C7;
  --ink: #0F172A;
  --ink-soft: #334155;
  --text1: #0F172A;
  --text2: #475569;
  --text3: #94A3B8;
  --income: #059669;
  --income-bg: #ECFDF5;
  --expense: #DC2626;
  --expense-bg: #FEF2F2;
}

[data-theme="dark"] {
  --page: #0B0F1A;
  --card: #111827;
  --card2: #1A2332;
  --border: rgba(255,255,255,0.06);
  --accent: #00D4FF;
  --accent-light: rgba(0,212,255,0.1);
  --accent-dark: #00A8CC;
  --ink: #F1F5F9;
  --ink-soft: #CBD5E1;
  --text1: #F1F5F9;
  --text2: #94A3B8;
  --text3: #475569;
  --income: #34D399;
  --income-bg: rgba(52,211,153,0.1);
  --expense: #F87171;
  --expense-bg: rgba(248,113,113,0.1);
}
```

Добавить переменные `--income`, `--income-bg`, `--expense`, `--expense-bg` в tailwind.config.ts colors.

### 2.2 Типографика

Заменить `Plus Jakarta Sans` на **`Manrope`** (Google Fonts) — более современный, чистый fintech look.
- Headings: `Manrope` weight 700-800
- Body: `Manrope` weight 400-500
- Numbers/money: `Manrope` weight 700, tabular-nums

Обновить `index.html` — ссылку на Google Fonts.
Обновить `tailwind.config.ts` — fontFamily.

### 2.3 Desktop Layout (breakpoint md:768px → sidebar layout)

**Mobile (< 768px):** Текущий layout с BottomNav — оставить, но улучшить.

**Desktop (≥ 768px):**
- Создать `src/components/layout/AppShell.tsx` — обёртка:
  - Левый sidebar (w-64, fixed) с навигацией: Logo + nav items + theme toggle + user badge внизу
  - Правый content area (ml-64, max-w-5xl, mx-auto, px-8, py-6)
  - BottomNav скрыт на desktop (`md:hidden`)
  - FAB скрыт на desktop (быстрое добавление через sidebar кнопку)
- Sidebar навигация:
  - Logo Flux (маленькая версия icon.png, 32x32)
  - Пункты: Главная, Расходы, Бюджет, Доходы, Аналитика, Цели, Ассистент, (Админ — если role=admin)
  - Каждый пункт: icon + label, active state с accent bg
  - Внизу sidebar: кнопка "+ Добавить расход" (accent gradient), и кнопка настроек
- Dashboard на desktop: grid layout 2-3 колонки вместо одной стопки

### 2.4 Компоненты Dashboard — Редизайн

**HeroCard (Safe to Spend):**
- Dark theme: glass card с gradient border (cyan), большой баланс, subtle glow
- Light theme: white card с shadow, accent color на цифрах
- Убрать цветовой `bg-accent` / `bg-red-600` / `bg-orange-500` — заменить на card + accent text
- Баланс — крупный шрифт (text-5xl на desktop, text-4xl mobile), Manrope 800
- Добавить тонкую линию прогресса периода внизу карточки

**CategoryCards:**
- Заменить grid-cols-3 (слишком тесно на mobile) → горизонтальный scroll на mobile, grid-cols-3 на desktop
- Каждая карточка: иконка, label, сумма, mini progress bar, sparkline
- Убрать hardcoded русские строки "перерасход" / "осталось" — использовать i18n keys

**RecentExpenses:**
- Добавить группировку по дате (сегодня / вчера / дата)
- Swipe-to-delete на mobile (или long press → delete)
- Каждая транзакция: category icon + name, description, amount (красный), bank badge

**BankBreakdown:**
- Horizontal bar chart вместо текстового списка
- Bank logos/icons (Kaspi — жёлтый, Halyk — зелёный, Freedom — синий, Forte — оранжевый)

### 2.5 Bottom Navigation — Улучшение

Текущая навигация содержит 7+ tabs — это слишком. Рефакторинг:
- **5 главных табов**: Главная, Расходы, (+), Аналитика, Ещё
- Центральная кнопка (+) — стилизованная, поднятая, accent gradient — открывает QuickAdd
- Таб "Ещё" — открывает sheet/drawer с: Бюджет, Доходы, Цели, Ассистент, Настройки, Админ
- FAB убрать — его функцию выполняет центральная кнопка навигации
- Высота nav: 64px + safe area
- Active tab: accent color + indicator dot сверху
- Glass effect на dark theme

### 2.6 QuickAdd — Минимум нажатий

Переработать `QuickAddSheet` и `QuickExpenseBar` для минимума действий:
1. Нажал (+) → сразу numpad с категорией-угадайкой (самая частая за последние 7 дней)
2. Ввёл сумму → одним свайпом/тапом выбрал категорию из top-6
3. Кнопка "Готово" — расход добавлен. Всего 3 тапа максимум
4. Убрать обязательный выбор paidBy/bank при быстром добавлении — заполнять дефолтами
5. Если нужно — кнопка "Подробнее" раскрывает полную форму

### 2.7 Анимации и Micro-interactions

- Page transitions: fade + subtle slide (CSS)
- Card appear: staggered fade-up (уже есть `animate-card-enter`, расширить)
- Number counting animation для баланса (animate from 0 to value)
- Pull-to-refresh indicator — accent color spinner
- Skeleton loading — использовать shimmer с accent color
- Theme switch — smooth 250ms (уже есть, проверить)
- Tab switch — no flash, instant

---

## ЧАСТЬ 3: НОВАЯ ФУНКЦИОНАЛЬНОСТЬ

### 3.1 Круговые диаграммы расходов

**`src/components/analytics/DonutChart.tsx`:**
- recharts PieChart с innerRadius для donut style
- Центр: общая сумма
- Легенда: category name + amount + percentage
- Анимированное появление секторов
- Цвета: из category.color или автоматически из палитры
- Два режима: по типам (mandatory/flexible/savings) и по категориям
- Добавить на DashboardPage (компактная версия) и AnalyticsPage (полная)

### 3.2 Бюджеты по категориям с лимитами

В `Category` type уже есть `monthlyLimit?: number` — но оно не используется в UI.

**Реализовать:**
- В настройках категорий (`SettingsCategoryLimitsSection.tsx`): установка лимита на каждую категорию
- В dashboard `CategoryCards`: показывать progress bar против лимита категории
- Уведомление (toast) когда расход по категории достигает 80% и 100% лимита
- В аналитике: таблица категорий с лимит/факт/остаток

### 3.3 Повторяющиеся платежи / Шаблоны

**Новый тип `RecurringExpense`:**
```ts
interface RecurringExpense {
  id: string;
  name: string;
  amount: number;
  categoryId: string;
  type: ExpenseType;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  dayOfMonth?: number; // для monthly
  dayOfWeek?: number;  // для weekly (0-6)
  accountId?: string;
  isActive: boolean;
  lastGenerated?: string; // ISO date
  createdAt: string;
}
```

**Supabase migration:**
```sql
CREATE TABLE recurring_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES spaces(id),
  name TEXT NOT NULL,
  amount INTEGER NOT NULL,
  category_id TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'flexible',
  frequency TEXT NOT NULL DEFAULT 'monthly',
  day_of_month INTEGER,
  day_of_week INTEGER,
  account_id UUID REFERENCES accounts(id),
  is_active BOOLEAN DEFAULT true,
  last_generated DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE recurring_expenses ENABLE ROW LEVEL SECURITY;
-- RLS policy: space members can CRUD
```

**Zustand store:** `useRecurringStore.ts`
**UI:** Секция в настройках + на BudgetPage список upcoming recurring
**Логика:** Edge function или client-side check при загрузке — если today ≥ dayOfMonth и lastGenerated < текущий месяц → автоматически создать expense

### 3.4 Персонализация категорий

Текущие категории захардкожены в `DEFAULT_CATEGORIES`. Нужно:
- Сохранять кастомные категории в Supabase (`space_categories` table)
- UI: в настройках — список категорий с drag-to-reorder, edit icon/color/name, add new, delete
- Icon picker: grid из Phosphor icons (популярные 30-40 штук)
- Color picker: preset palette (8-12 цветов)
- Quick access toggle для каждой категории

### 3.5 Долги и Кредиты

**Новый модуль `src/components/debts/`:**

```ts
interface Debt {
  id: string;
  name: string;              // "Автокредит Kaspi"
  type: 'credit' | 'installment' | 'debt_to_person' | 'debt_from_person';
  totalAmount: number;        // Общая сумма кредита
  remainingAmount: number;    // Остаток долга
  monthlyPayment: number;     // Ежемесячный платёж
  interestRate?: number;      // Годовая ставка %
  startDate: string;
  endDate?: string;
  accountId?: string;         // С какого счёта платить
  isActive: boolean;
  createdAt: string;
}

interface DebtPayment {
  id: string;
  debtId: string;
  amount: number;
  date: string;
  accountId?: string;
  note?: string;
}
```

**Supabase migrations** для `debts` и `debt_payments` tables.
**UI:**
- Отдельная страница/секция "Долги" (доступна через "Ещё" в навигации)
- Карточка долга: название, остаток, progress bar, следующий платёж, ежемесячная сумма
- Кнопка "Оплатить" → выбор счёта → запись платежа + автоматическое уменьшение остатка
- Dashboard widget: "Ближайшие платежи по кредитам"

### 3.6 Управление счетами/банками

Текущая система банков (`bank?: string` в Expense/Income) — примитивная. Рефакторинг:

**Расширить `Account` type:**
```ts
interface Account {
  id: string;
  spaceId: string;
  name: string;              // "Kaspi Gold"
  bankId: string;            // kaspi | halyk | freedom | forte | jusan | bcc | other
  type: 'card' | 'deposit' | 'cash' | 'wallet';
  currency: string;          // KZT, USD, EUR
  balance: number;           // Текущий баланс (вычисляемый или ручной)
  icon?: string;
  color?: string;
  isActive: boolean;
  createdAt: string;
}
```

**UI:**
- В настройках: управление счетами — добавить/удалить/переименовать
- В формах расходов/доходов: выбор счёта (dropdown с иконками банков)
- На dashboard: виджет "Мои счета" с балансами

**Банки Казахстана (preset с иконками/цветами):**
```ts
const KZ_BANKS = {
  kaspi:   { name: 'Kaspi Bank',     color: '#F14635', icon: 'kaspi' },
  halyk:   { name: 'Halyk Bank',     color: '#00A651', icon: 'halyk' },
  freedom: { name: 'Freedom Finance',color: '#1E88E5', icon: 'freedom' },
  forte:   { name: 'Forte Bank',     color: '#FF6B00', icon: 'forte' },
  jusan:   { name: 'Jusan Bank',     color: '#6B2FA0', icon: 'jusan' },
  bcc:     { name: 'Bank CenterCredit', color: '#003DA5', icon: 'bcc' },
  other:   { name: 'Другой',        color: '#6B7280', icon: 'Bank' },
};
```

### 3.7 Депозиты с калькулятором

**Новый тип `Deposit`:**
```ts
interface Deposit {
  id: string;
  name: string;              // "Kaspi Депозит"
  accountId?: string;        // Связь со счётом
  initialAmount: number;
  currentAmount: number;
  interestRate: number;       // Годовая ставка %
  startDate: string;
  endDate?: string;
  isReplenishable: boolean;  // Пополняемый?
  capitalization: boolean;    // С капитализацией?
  frequency: 'monthly' | 'quarterly' | 'yearly' | 'end';
  createdAt: string;
}
```

**Калькулятор депозита (`src/components/deposits/DepositCalculator.tsx`):**
- Inputs: сумма, ставка %, срок (месяцы), ежемесячное пополнение (опционально), капитализация (toggle)
- Output: итоговая сумма, доход, график роста (line chart)
- Формула: compound interest с учётом пополнений
- Кнопка "Создать депозит" — сохраняет в Supabase

### 3.8 Переводы между счетами

Текущий `type: 'transfer'` в Expense уже есть, но UI ограничен.

**Улучшить:**
- В QuickAdd добавить вкладку "Перевод"
- UI: From account → To account → Amount
- При переводе: баланс FROM уменьшается, баланс TO увеличивается
- В истории: перевод показывается с двумя иконками счётов и стрелкой →
- Перевод на депозит — отдельная подкатегория

### 3.9 Оплата кредита/рассрочки с выбранного счёта

- При нажатии "Оплатить" на карточке долга:
  1. Показать сумму ежемесячного платежа (с возможностью изменить)
  2. Выбрать счёт списания (dropdown)
  3. Подтвердить → создаётся `DebtPayment` + `Expense` (type: mandatory, category: credit_payment) + обновляется `Debt.remainingAmount`

---

## ЧАСТЬ 4: ИСПРАВЛЕНИЯ ОШИБОК И ЛОГИКИ

### 4.1 Баг: Два параллельных расчётных движка

**Проблема:** Существуют ДВА независимых расчётных пути:
1. `computeEngineResult()` в `src/lib/calculations.ts` → `useFinanceEngine` store → `useEngine()` hook → используется в `HeroCard`, `DashboardPage`
2. `useBudgetSummary()` в `src/store/useBudgetStore.ts` → читает напрямую из stores → используется в `CategoryCards`, `HealthScoreCard`, `AnalyticsPage`

Они используют РАЗНЫЕ периоды:
- `computeEngineResult` использует `PayPeriod` из `usePayPeriodStore` (или auto-period = текущий месяц)
- `useBudgetSummary` использует `getPayPeriodRange()` — логику "от последней зарплаты до сегодня"

**Результат:** HeroCard может показывать один баланс, а CategoryCards — другой. Пользователь видит противоречивые данные.

**Исправление:** Объединить в ОДИН источник правды:
- Оставить `computeEngineResult` как единственный engine
- `useBudgetSummary` должен читать данные ИЗ `useFinanceEngine`, а не дублировать расчёты
- Или наоборот — выбрать один подход к определению периода и использовать его везде

### 4.2 Баг: `getPayPeriodRange` fallback при отсутствии доходов в окне

**Проблема** (строки 190-200 в dates.ts):
```ts
const sourceIncomes = cycleIncomes.length > 0 ? cycleIncomes : incomes;
```
Если нет доходов в окне (24-е прошлого месяца → сегодня), fallback использует ВСЕ доходы за всё время. `earliestDate` станет самым первым доходом пользователя (может быть год назад). Период будет гигантским, расчёты бессмысленными.

**Исправление:** Fallback должен быть начало текущего месяца, а не "все доходы":
```ts
if (cycleIncomes.length === 0) {
  return { start: new Date(y, m, 1, 0, 0, 0), end: todayEnd };
}
```

### 4.3 Баг: `daysTotal` может быть 0 при одинаковых start/end

В `computeEngineResult` строка 72:
```ts
const daysTotal = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));
```
`Math.max(1, ...)` спасает от деления на 0, но `86400000` не учитывает DST переходы. При смене часов `ceil` может выдать неверное число. Лучше использовать `parseLocalDate`-подход.

### 4.4 Баг: `CategoryCards` hardcoded sparkline colors

```ts
sparkColor="#2274A5" // mandatory
sparkColor="#7A5210" // flexible  
sparkColor="#15664E" // savings
```
Эти цвета не привязаны к теме. В тёмной теме `#7A5210` будет плохо видно. Нужно использовать CSS variables или theme-aware цвета.

### 4.5 Баг: Hardcoded русские строки в компонентах

Множество строк не используют i18n:
- `CategoryCards`: "Обязат.", "Гибкие", "Накопления", "Фиксированные", "перерасход", "осталось", "вычтено из дохода"
- `QuickExpenseBar`: "Ещё", "Сохранить"
- `BottomNav`: `'Админ'` hardcoded
- `ThemeSwitcher`: "Тема изменена", "Текущая тема", "Оформление"
- `ExpenseForm`: "Расход обновлён", "Ошибка: ", "Расход добавлен"

**Исправление:** Все строки перенести в `src/i18n` translation files.

### 4.6 Баг: `success`, `danger`, `warning` colors hardcoded

В `tailwind.config.ts`:
```ts
success: '#15664E',
'success-bg': '#E2F2EC',
danger: '#9B2525',
'danger-bg': '#FBE8E8',
```
Эти цвета не меняются при переключении темы. В тёмной теме `#FBE8E8` (розовый фон) будет ярким пятном.

**Исправление:** Добавить CSS variables `--success`, `--success-bg`, `--danger`, `--danger-bg`, `--warning`, `--warning-bg` и менять их в темах.

### 4.7 Потенциальный баг: `computeBudgetRatios` fallback

Если у дохода нет `distribution.customRatios`, используется fallback `0.5`:
```ts
i.distribution.customRatios?.mandatory ?? 0.5
```
Но `distribution.customRatios` может быть `undefined` для старых доходов. И `0.5 + 0.5 = 1.0` — savings получит 0. Нужно fallback на `{ mandatory: 0.5, flexible: 0.3, savings: 0.2 }` целиком.

### 4.8 UX-проблема: BottomNav с 7+ табами

7+ табов не помещаются нормально на маленьких экранах (320px). Каждый таб ~46px, 7 * 46 = 322px. Labels обрезаются, иконки мелкие.

**Исправление:** Сократить до 5 табов (см. 2.5).

### 4.9 Performance: Нет мемоизации в `useBudgetSummary`

`useBudgetSummary` — это обычная функция (не Zustand store), которая вызывается при КАЖДОМ рендере. Она выполняет O(n) фильтрацию и суммирование. При 1000+ расходах это будет заметно.

**Исправление:** Либо конвертировать в Zustand store с selective subscriptions, либо обернуть в `useMemo` с правильными зависимостями.

### 4.10 Security: `bank` field default 'kaspi'

В `useExpenseStore` строка 42:
```ts
bank: (r.bank as string | undefined) ?? 'kaspi',
```
Если `bank` не задан в БД, по умолчанию ставится 'kaspi'. Это может быть неверно для пользователей других банков. Лучше дефолт `'other'` или первый банк из настроек пользователя.

---

## ЧАСТЬ 5: SEO И PWA

### 5.1 Meta tags (index.html)

```html
<title>Flux — Умный семейный бюджет</title>
<meta name="description" content="Flux — приложение для контроля семейного бюджета. Расходы, доходы, кредиты, депозиты и AI-ассистент. Казахстан.">
<meta name="keywords" content="бюджет, расходы, семейный бюджет, финансы, Казахстан, тенге, Flux">
<meta property="og:title" content="Flux — Умный семейный бюджет">
<meta property="og:description" content="Контролируйте финансы семьи с AI-ассистентом">
<meta property="og:image" content="/icons/og-image.png">
<meta name="theme-color" content="#0B0F1A">
```

### 5.2 PWA Manifest

Обновить manifest.json:
- `name`: "Flux"
- `short_name`: "Flux"
- `theme_color`: "#0B0F1A"
- `background_color`: "#0B0F1A"
- Icons: использовать загруженные logo.png / icon.png в разных размерах (192, 512)

---

## ЧАСТЬ 6: ПРИОРИТЕТЫ РЕАЛИЗАЦИИ

### Sprint 1 — Foundation (критично)
1. Ребрендинг husband/wife → neutral (27 файлов)
2. Новые темы light/dark с дизайн-системой
3. Fix двух расчётных движков (4.1)
4. Fix `getPayPeriodRange` fallback (4.2)
5. i18n для hardcoded строк

### Sprint 2 — UI/UX (высокий приоритет)
6. Desktop layout с sidebar
7. BottomNav → 5 табов + center button
8. QuickAdd → 3 тапа
9. HeroCard redesign
10. Типографика Manrope

### Sprint 3 — Features (средний приоритет)
11. Управление счетами/банками
12. Круговые диаграммы
13. Бюджеты по категориям с лимитами
14. Персонализация категорий
15. Переводы между счетами (улучшение)

### Sprint 4 — Advanced (нижний приоритет)
16. Долги и кредиты
17. Депозиты с калькулятором
18. Повторяющиеся платежи
19. Оплата кредита с выбранного счёта

---

## ТЕХНИЧЕСКИЕ ЗАМЕТКИ

- **НЕ менять** Supabase auth flow, RLS policies, Edge Functions (AI proxy) без отдельного аудита
- **НЕ менять** стек: React, Zustand, Tailwind, Supabase, Vercel — они подходят
- **Учитывать** что `package.json` имеет и `lucide-react` и `@phosphor-icons/react` — выбрать ОДИН (Phosphor, т.к. больше используется) и убрать лишний
- **Учитывать** React 19 — не использовать deprecated APIs
- **Тестировать** на экранах 320px, 375px, 414px (mobile) и 1280px, 1440px (desktop)
- Все Supabase migrations — добавлять в `supabase/migrations/` с timestamp

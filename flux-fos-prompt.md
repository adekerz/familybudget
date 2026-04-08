# FLUX — Financial Operating System: Полный промт реализации

## КОНТЕКСТ ПРОЕКТА

**Репозиторий:** https://github.com/adekerz/familybudget
**Стек:** React 19 + TypeScript + Vite + Tailwind CSS + Zustand + Supabase (PostgreSQL) + Recharts + Lucide/Phosphor Icons
**Деплой:** Vercel (familybudget-aa.vercel.app → будущий flux.kz или flux-app.vercel.app)
**Целевая аудитория:** Семья из 2 человек в Казахстане, валюта KZT (₸), русский язык интерфейса
**Текущее состояние:** Работающее PWA с формулой 50/30/20, AI-ассистентом (OpenRouter), системой авторизации (login/password + recovery codes), spaces, incomes/expenses/goals в Supabase. На дашборде уже есть: "Безопасно потратить", "На сегодня", "Прогноз трат", категории (Фиксированные / Гибкие / Обязательные / Накопления), расходы по банкам. Счета существуют (Карта мужа, Карта жены, Общий счёт) но с нулевыми балансами — **не подключены к транзакциям**.

---

## ЧАСТЬ 1: АРХИТЕКТУРА ДАННЫХ (SUPABASE MIGRATIONS)

### 1.1 Новая модель счетов (accounts)

Заменить текущую декоративную систему "Счета и плательщики" на полноценные финансовые счета.

```sql
-- Банки (справочник)
CREATE TABLE banks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                    -- "Kaspi Bank", "Halyk Bank", "Наличные"
  bank_type TEXT NOT NULL DEFAULT 'bank', -- 'bank' | 'cash' | 'ewallet'
  color TEXT NOT NULL DEFAULT '#00B894',  -- HEX для UI
  icon TEXT NOT NULL DEFAULT 'building-2', -- Lucide icon name
  bik TEXT,                               -- БИК банка (необязательно)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  sort_order INT DEFAULT 0
);

-- Счета (привязаны к банкам)
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
  bank_id UUID REFERENCES banks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                       -- "Основная карта", "Депозит Halyk"
  account_type TEXT NOT NULL DEFAULT 'debit', 
  -- 'debit' | 'credit' | 'savings' | 'deposit' | 'cash' | 'ewallet'
  currency TEXT NOT NULL DEFAULT 'KZT',
  initial_balance NUMERIC NOT NULL DEFAULT 0,  -- начальный баланс при добавлении
  credit_limit NUMERIC DEFAULT 0,              -- для кредитных карт
  interest_rate NUMERIC DEFAULT 0,             -- для депозитов (% годовых)
  is_active BOOLEAN DEFAULT true,
  is_excluded_from_total BOOLEAN DEFAULT false, -- исключить из Net Worth
  last4 TEXT,                                   -- последние 4 цифры карты
  color TEXT,                                   -- переопределение цвета банка
  created_at TIMESTAMPTZ DEFAULT now(),
  sort_order INT DEFAULT 0
);

-- Balance snapshots (гибрид: хранение + расчёт)
-- Снапшот создаётся раз в день или при ручной корректировке
CREATE TABLE balance_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  balance NUMERIC NOT NULL,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  source TEXT NOT NULL DEFAULT 'calculated', -- 'calculated' | 'manual_correction'
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(account_id, snapshot_date)
);
```

**Логика расчёта баланса:**
```
current_balance(account) = 
  latest_snapshot.balance 
  + SUM(transactions WHERE date > snapshot_date AND to_account = account)
  - SUM(transactions WHERE date > snapshot_date AND from_account = account)
```

Это гибридный подход: не пересчитываем всю историю, но и не доверяем хранимому числу слепо.

### 1.2 Унифицированные транзакции

Заменить раздельные таблицы `incomes` и `expenses` на единую таблицу с моделью "откуда → куда".

```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
  
  -- Движение денег
  amount NUMERIC NOT NULL CHECK (amount > 0),
  from_account_id UUID REFERENCES accounts(id),  -- NULL = внешний источник (зарплата)
  to_account_id UUID REFERENCES accounts(id),    -- NULL = внешний получатель (расход)
  
  -- Классификация
  type TEXT NOT NULL, -- 'income' | 'expense' | 'transfer'
  category_id TEXT NOT NULL,         -- ссылка на категорию
  subcategory TEXT,                  -- опционально
  
  -- Мета
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  time TIME,
  
  -- Атрибуция
  paid_by TEXT DEFAULT 'shared',     -- 'husband' | 'wife' | 'shared'
  
  -- Рекуррентность
  recurring_id UUID REFERENCES recurring_transactions(id),
  
  -- Статус
  status TEXT NOT NULL DEFAULT 'confirmed', -- 'confirmed' | 'pending' | 'cancelled'
  
  -- FX (для будущей мультивалютности)
  original_amount NUMERIC,
  original_currency TEXT,
  exchange_rate NUMERIC,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Валидация: должен быть хотя бы один счёт
  CONSTRAINT valid_movement CHECK (
    from_account_id IS NOT NULL OR to_account_id IS NOT NULL
  ),
  -- Трансфер требует оба счёта
  CONSTRAINT valid_transfer CHECK (
    type != 'transfer' OR (from_account_id IS NOT NULL AND to_account_id IS NOT NULL)
  )
);

CREATE INDEX idx_transactions_date ON transactions(date DESC);
CREATE INDEX idx_transactions_account_from ON transactions(from_account_id);
CREATE INDEX idx_transactions_account_to ON transactions(to_account_id);
CREATE INDEX idx_transactions_category ON transactions(category_id);
CREATE INDEX idx_transactions_space ON transactions(space_id);
```

### 1.3 Миграция данных

```sql
-- Перенос incomes → transactions
INSERT INTO transactions (space_id, amount, to_account_id, type, category_id, description, date, status)
SELECT 
  i.space_id,
  i.amount,
  (SELECT id FROM accounts WHERE space_id = i.space_id AND sort_order = 0 LIMIT 1),
  'income',
  'salary',
  i.note,
  i.date::DATE,
  'confirmed'
FROM incomes i;

-- Перенос expenses → transactions
INSERT INTO transactions (space_id, amount, from_account_id, type, category_id, description, date, paid_by, status)
SELECT
  e.space_id,
  e.amount,
  (SELECT id FROM accounts WHERE space_id = e.space_id AND sort_order = 0 LIMIT 1),
  'expense',
  e.category_id,
  e.description,
  e.date::DATE,
  e.paid_by,
  'confirmed'
FROM expenses e;
```

### 1.4 Recurring Transactions (Рекуррентный движок)

```sql
CREATE TABLE recurring_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
  
  -- Шаблон
  amount NUMERIC NOT NULL,
  from_account_id UUID REFERENCES accounts(id),
  to_account_id UUID REFERENCES accounts(id),
  type TEXT NOT NULL,  -- 'income' | 'expense' | 'transfer'
  category_id TEXT NOT NULL,
  description TEXT,
  paid_by TEXT DEFAULT 'shared',
  
  -- Расписание
  frequency TEXT NOT NULL, -- 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly'
  day_of_month INT,        -- для monthly (1-31, NULL = last day)
  day_of_week INT,         -- для weekly (0=Mon, 6=Sun)
  
  -- Границы
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,           -- NULL = бессрочно
  next_occurrence DATE NOT NULL,
  
  -- Управление
  is_active BOOLEAN DEFAULT true,
  is_auto_confirm BOOLEAN DEFAULT false, -- true = сразу confirmed, false = pending
  auto_adjust_amount BOOLEAN DEFAULT false, -- для переменных расходов
  
  -- Обязательность (влияет на safe-to-spend)
  is_mandatory BOOLEAN DEFAULT true,
  priority INT DEFAULT 1, -- 1=критичный, 2=важный, 3=желательный
  
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 1.5 Category Targets (Бюджетные цели)

```sql
CREATE TABLE category_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL,
  
  target_amount NUMERIC NOT NULL,
  period TEXT NOT NULL DEFAULT 'monthly', -- 'monthly' | 'weekly' | 'yearly'
  
  -- Для non-monthly: конкретная дата цели
  target_date DATE,
  
  -- Тип цели
  target_type TEXT NOT NULL DEFAULT 'limit', -- 'limit' (расходы) | 'goal' (накопления) | 'allocation' (YNAB-стиль)
  
  -- Rollover: переносить остаток на следующий период?
  allow_rollover BOOLEAN DEFAULT false,
  rollover_amount NUMERIC DEFAULT 0,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(space_id, category_id, period)
);
```

### 1.6 Period Engine

```sql
CREATE TABLE budget_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
  
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- Настройки
  period_type TEXT NOT NULL DEFAULT 'monthly', -- 'monthly' | 'biweekly' | 'custom'
  
  -- Снапшот на начало периода (для аналитики)
  opening_balance NUMERIC,
  
  -- Статус
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'closed' | 'future'
  
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(space_id, start_date)
);
```

### 1.7 RLS-политики

```sql
-- Для каждой новой таблицы:
ALTER TABLE banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE balance_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_periods ENABLE ROW LEVEL SECURITY;

-- Политики через space_id (семейное приложение, всё общее внутри space)
CREATE POLICY "space_access" ON banks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "space_access" ON accounts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "space_access" ON transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "space_access" ON recurring_transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "space_access" ON category_targets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "space_access" ON balance_snapshots FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "space_access" ON budget_periods FOR ALL USING (true) WITH CHECK (true);
```

---

## ЧАСТЬ 2: DOMAIN-ЛОГИКА (ZUSTAND STORES + SERVICES)

### 2.1 Архитектура сервисов

```
src/
  services/
    BalanceService.ts      — расчёт балансов (snapshot + delta)
    CashflowService.ts     — прогноз cashflow на N дней
    SafeToSpendService.ts  — главный KPI
    RecurringEngine.ts     — генерация pending транзакций
    BudgetService.ts       — category targets + allocation
    RiskEngine.ts          — предупреждения и anti-overdraft
  stores/
    useAccountStore.ts     — CRUD банков и счетов
    useTransactionStore.ts — CRUD транзакций (заменяет incomeStore + expenseStore)
    useRecurringStore.ts   — CRUD recurring
    useBudgetStore.ts      — targets + periods
    useDashboardStore.ts   — агрегация для UI (кэш вычислений)
  types/
    finance.ts             — Bank, Account, Transaction, Recurring, CategoryTarget, etc.
```

### 2.2 BalanceService

```typescript
interface BalanceService {
  // Текущий баланс счёта (snapshot + дельта)
  getAccountBalance(accountId: string): Promise<number>;
  
  // Баланс на конкретную дату (для исторических запросов)
  getAccountBalanceAt(accountId: string, date: Date): Promise<number>;
  
  // Суммарный баланс всех активных счетов
  getTotalBalance(spaceId: string): Promise<number>;
  
  // Liquid cash (только debit + cash + ewallet, без deposits)
  getLiquidCash(spaceId: string): Promise<number>;
  
  // Net Worth (все счета минус кредиты)
  getNetWorth(spaceId: string): Promise<number>;
  
  // Создать дневной снапшот
  createDailySnapshot(accountId: string): Promise<void>;
}
```

### 2.3 SafeToSpendService

```typescript
interface SafeToSpendResult {
  amount: number;             // Главное число
  liquidCash: number;         // Доступные деньги
  upcomingMandatory: number;  // Обязательные будущие расходы
  underfundedTargets: number; // Недофинансированные категории
  daysInPeriod: number;       // Дней до конца периода
  dailyBudget: number;        // safe_to_spend / daysInPeriod
  riskLevel: 'safe' | 'caution' | 'danger' | 'critical';
}

// Формула:
// safe_to_spend = liquid_cash 
//   - SUM(recurring WHERE is_mandatory AND next_occurrence <= period_end)
//   - SUM(category_targets WHERE target_type = 'allocation' AND (target - spent) > 0)
//   - reserved_buffer (5% safety margin, настраиваемый)
```

### 2.4 CashflowService

```typescript
interface CashflowProjection {
  date: Date;
  projectedBalance: number;
  events: CashflowEvent[];  // что произойдёт в этот день
  isNegative: boolean;      // ПРЕДУПРЕЖДЕНИЕ
}

interface CashflowService {
  // Прогноз на N дней вперёд
  projectCashflow(spaceId: string, days: number): Promise<CashflowProjection[]>;
  
  // Найти ближайший "кассовый разрыв"
  findNextCashGap(spaceId: string): Promise<CashflowProjection | null>;
  
  // "Через 7 дней у тебя будет -20 000 ₸"
  getWarnings(spaceId: string): Promise<CashflowWarning[]>;
}
```

### 2.5 RecurringEngine

```typescript
interface RecurringEngine {
  // Вызывается при открытии приложения
  // Генерирует pending транзакции для всех recurring с past due next_occurrence
  processRecurrings(spaceId: string): Promise<Transaction[]>;
  
  // Получить будущие обязательства на период
  getUpcomingObligations(spaceId: string, fromDate: Date, toDate: Date): Promise<Obligation[]>;
  
  // Пересчитать next_occurrence после подтверждения/пропуска
  advanceNextOccurrence(recurringId: string): Promise<Date>;
}
```

### 2.6 RiskEngine

```typescript
interface RiskWarning {
  type: 'overdraft' | 'overspending' | 'cash_gap' | 'target_miss' | 'low_balance';
  severity: 'info' | 'warning' | 'critical';
  message: string;           // "Если потратишь 10 000 ₸, не хватит на аренду через 6 дней"
  relatedAmount: number;
  relatedDate?: Date;
  relatedCategory?: string;
}

interface RiskEngine {
  // Проверка перед транзакцией (anti-overdraft)
  validateTransaction(tx: Partial<Transaction>): Promise<{
    allowed: boolean;
    warnings: RiskWarning[];
  }>;
  
  // Текущие предупреждения для дашборда
  getActiveWarnings(spaceId: string): Promise<RiskWarning[]>;
}
```

---

## ЧАСТЬ 3: UI/UX ДИЗАЙН

### 3.1 Дизайн-система Flux (Dark-first Fintech)

**Философия:** Тёмный интерфейс как у Bloomberg Terminal / Revolut, но теплее. Финтех для семьи, не для трейдеров.

**Цветовая палитра:**
```css
:root {
  /* Backgrounds */
  --bg-primary: #0A0E17;        /* Глубокий тёмно-синий, не чёрный */
  --bg-secondary: #111827;      /* Карточки */
  --bg-tertiary: #1A2332;       /* Приподнятые элементы */
  --bg-hover: #1F2937;
  
  /* Text */
  --text-primary: #F0F4F8;      /* Почти белый, но мягкий */
  --text-secondary: #8B9DC3;    /* Приглушённый голубоватый */
  --text-muted: #4A5568;
  
  /* Accent — бирюзовый как главный цвет Flux */
  --accent-primary: #00D4AA;    /* Яркий бирюзовый */
  --accent-secondary: #00B894;  /* Для hover */
  --accent-dim: rgba(0, 212, 170, 0.15); /* Фон с подсветкой */
  
  /* Semantic */
  --color-income: #00D4AA;      /* Зелёный = деньги пришли */
  --color-expense: #FF6B6B;     /* Красный = деньги ушли */
  --color-transfer: #74B9FF;    /* Голубой = перемещение */
  --color-warning: #FDCB6E;     /* Жёлтый = внимание */
  --color-danger: #FF4757;      /* Критичный красный */
  
  /* Safe-to-spend gradient */
  --safe-gradient: linear-gradient(135deg, #00D4AA 0%, #00B894 100%);
  --caution-gradient: linear-gradient(135deg, #FDCB6E 0%, #E17055 100%);
  --danger-gradient: linear-gradient(135deg, #FF4757 0%, #C0392B 100%);
  
  /* Borders & Dividers */
  --border-subtle: rgba(255, 255, 255, 0.06);
  --border-accent: rgba(0, 212, 170, 0.3);
  
  /* Shadows */
  --shadow-card: 0 4px 24px rgba(0, 0, 0, 0.3);
  --shadow-glow: 0 0 20px rgba(0, 212, 170, 0.15);
  
  /* Radius */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;
  
  /* Typography */
  --font-display: 'Outfit', sans-serif;      /* Для цифр и заголовков */
  --font-body: 'Nunito Sans', sans-serif;    /* Для текста */
  --font-mono: 'JetBrains Mono', monospace;  /* Для сумм в таблицах */
}
```

**Типографика:**
- Safe-to-spend число: `font-family: var(--font-display); font-size: 48px; font-weight: 700; letter-spacing: -0.02em`
- Суммы в списках: `font-family: var(--font-mono); font-size: 16px; font-variant-numeric: tabular-nums`
- Подписи: `font-family: var(--font-body); font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-secondary)`

### 3.2 Навигация (Mobile-first PWA)

**Bottom Tab Bar** (5 вкладок, фиксированная):

| Иконка | Название | Экран |
|--------|----------|-------|
| LayoutDashboard | Главная | Dashboard |
| ArrowLeftRight | Операции | Transactions list + add |
| PieChart | Бюджет | Categories + targets |
| Wallet | Счета | Banks + accounts |
| User | Профиль | Settings + AI chat |

**Быстрое добавление:** FAB (floating action button) "+" по центру bottom bar → открывает sheet с выбором: Расход / Доход / Перевод.

### 3.3 Экран: Dashboard (Главная)

**Layout сверху вниз:**

1. **Hero Card — Safe to Spend**
   - Главное число (48px, gradient text по risk level)
   - Подпись: "XX дн. до конца периода"
   - Micro-chart: burndown линия (как тратил vs как должен)
   - Два мини-блока: "На сегодня: XX ₸" | "Темп: ↑ выше плана"

2. **Quick Actions Row**
   - 3 кнопки-пиллы: "+ Расход" | "+ Доход" | "↔ Перевод"
   - Горизонтальный скролл на маленьких экранах

3. **Upcoming Obligations** (горизонтальный scroll)
   - Карточки: "Аренда — 150 000 ₸ — через 6 дн."
   - Красная обводка если дата < 3 дней
   - Tap → детали recurring + confirm/skip

4. **Warnings** (если есть)
   - Карточки с иконкой ⚠️ и описанием
   - "Если потратишь 10 000 ₸, не хватит на аренду через 6 дней"
   - Dismiss / "Понял"

5. **Category Budget Overview**
   - 4 группы (Фиксированные / Гибкие / Обязательные / Накопления)
   - Каждая: progress bar + "осталось XX ₸ из YY ₸"
   - Tap на группу → развернуть категории

6. **Accounts Summary**
   - Горизонтальный scroll карточек банков
   - Каждая: лого банка + имя + баланс
   - Последняя карточка: "Net Worth: XXX ₸"

7. **Recent Transactions** (последние 5)
   - Свайп-лист: категория иконка | описание + дата | сумма (красная/зелёная)
   - "Показать все" → вкладка Операции

### 3.4 Экран: Счета (Banks & Accounts)

**Layout:**

1. **Net Worth Header**
   - Большое число: общий баланс всех счетов
   - Подпись: "по X счетам в Y банках"
   - Donut chart: распределение по банкам

2. **Список банков** (группировка по bank)
   - Каждый банк — collapsible секция
   - Внутри — карточки счетов:
     ```
     [💳] Основная карта          256 116 ₸
          Kaspi · *4521 · Дебетовая
     ```
   - Tap на счёт → детальная страница с историей

3. **Кнопка "Добавить банк/счёт"**

**Экран деталей счёта:**
- Баланс крупно + график изменения за период
- Список транзакций по этому счёту
- Кнопки: "Корректировать баланс" | "Редактировать" | "Архивировать"

### 3.5 Экран: Добавление операции (Bottom Sheet)

**3 таба:** Расход | Доход | Перевод

**Расход:**
- Amount input (крупный, по центру, numpad)
- Выбор счёта (from_account) — горизонтальный scroll пиллов
- Выбор категории — grid иконок 4 столбца
- Описание (опционально)
- Дата (default: сегодня)
- Чекбокс "Повторяющаяся" → раскрывает настройки recurring
- Кто платил: Муж / Жена / Общие (toggle)
- Кнопка "Сохранить"
- **RiskEngine check:** если после операции safe_to_spend < 0, показать предупреждение ПЕРЕД сохранением

**Перевод:**
- Amount input
- From account → To account (два селектора)
- Описание
- Дата

### 3.6 Экран: Бюджет

**Layout:**

1. **Period Selector** (текущий месяц, стрелки ← →)

2. **Budget Allocation Bar**
   - Горизонтальный stacked bar: сколько денег распределено vs свободно
   - "Распределено: 350 000 ₸ из 450 000 ₸"
   - "Свободно: 100 000 ₸"

3. **Категории** (вертикальный список)
   - Группировка: Фиксированные → Гибкие → Обязательные → Накопления
   - Каждая категория:
     ```
     [🍔] Еда                    52 000 / 100 000 ₸
     ████████░░░░░░░░░░░░░░░░░░░░ 52%
     Осталось: 48 000 ₸ · ~2 182 ₸/день
     ```
   - Цвет progress bar: зелёный → жёлтый (>70%) → красный (>90%)
   - Tap → транзакции по категории + редактирование target

4. **Recurring Payments Section**
   - Список предстоящих: "Аренда — 15 апреля — 150 000 ₸"
   - Статус: ✅ оплачено | ⏳ ожидает | ❌ просрочено

### 3.7 Экран: Настройки

- Период бюджета: дата начала месяца (по умолчанию 1-е число, настраиваемо)
- Safety buffer: 5% / 10% / фиксированная сумма
- Валюта по умолчанию
- Тема (пока только dark)
- AI-ассистент (включить/выключить, выбор модели)
- Управление пользователями (admin only)
- Экспорт данных (PDF)

---

## ЧАСТЬ 4: ПОРЯДОК РЕАЛИЗАЦИИ (ПРИОРИТЕЗАЦИЯ)

### Фаза 1: Фундамент (1-2 недели)
1. SQL миграции: banks, accounts, transactions, balance_snapshots
2. Миграция данных из incomes/expenses → transactions
3. useAccountStore + useTransactionStore (Zustand)
4. BalanceService (гибридный расчёт)
5. UI: экран Счета (CRUD банков и счетов)
6. UI: новая форма добавления операции (3 таба)
7. Обновить дашборд: реальные балансы вместо нулей

### Фаза 2: Умная логика (1-2 недели)
1. SQL: recurring_transactions + category_targets
2. RecurringEngine (генерация pending)
3. BudgetService (targets + allocation)
4. SafeToSpendService (новая формула с recurring + targets)
5. CashflowService (прогноз на 30 дней)
6. UI: экран Бюджет (targets + progress)
7. UI: Upcoming Obligations на дашборде

### Фаза 3: Защита и UX (1 неделя)
1. RiskEngine (pre-transaction validation + warnings)
2. UI: предупреждения на дашборде
3. UI: anti-overdraft модалка при добавлении расхода
4. Period Engine (настраиваемый период)
5. Burndown micro-chart на дашборде
6. Pull-to-refresh + offline cache

### Фаза 4: Полировка (ongoing)
1. Donut charts (распределение по категориям/банкам)
2. Анимации (page transitions, number counters)
3. Haptic feedback на мобиле
4. PDF экспорт с новой моделью данных
5. AI: интеграция с новыми данными (recurring, targets)

---

## ЧАСТЬ 5: КРИТИЧЕСКИЕ ПРАВИЛА

### 5.1 Что НЕ делать
- **НЕ** делать полную двойную бухгалтерию (debit/credit ledger entries) — overkill для семейного PWA
- **НЕ** пересчитывать баланс через SUM всех транзакций — использовать snapshot + delta
- **НЕ** хранить баланс как единственный источник правды — snapshot + расчёт
- **НЕ** реализовывать FX Engine в первых фазах — всё в KZT
- **НЕ** делать audit trail / immutable log — не регулятор, семейный продукт
- **НЕ** удалять старые таблицы incomes/expenses до полной миграции и проверки

### 5.2 Инварианты системы
- `SUM(from_transactions) - SUM(to_transactions) + initial_balance = current_balance` — ВСЕГДА
- Recurring с `is_mandatory = true` ВСЕГДА учитывается в safe-to-spend
- Категория без target работает как чистый трекер (без ограничений)
- Transfer не влияет на net worth (сумма всех счетов не меняется)
- Pending транзакции от recurring видны в UI но НЕ влияют на текущий баланс (только на прогноз)

### 5.3 Тесты системы (обязательная проверка)
Система должна корректно отвечать на:
1. "Сколько я могу потратить сегодня?" → SafeToSpend
2. "Какой будет баланс через 7 дней?" → CashflowService
3. "Хватит ли на аренду?" → RiskEngine
4. "Сколько потратили на еду в этом месяце?" → агрегация по category
5. "Какой баланс на Kaspi?" → BalanceService
6. "Сколько осталось в категории Еда?" → target - spent

---

## ЧАСТЬ 6: ДОПОЛНИТЕЛЬНЫЕ УКАЗАНИЯ АГЕНТУ

### Стек
- React 19 (используй хуки, не классы)
- TypeScript strict mode
- Tailwind CSS (utility-first, CSS variables для темы)
- Zustand (отдельный store на domain, не один God Store)
- Supabase JS client (существующий, не менять конфиг)
- Recharts для графиков
- Lucide React для иконок (основной набор), Phosphor Icons как fallback
- НЕ устанавливать новые зависимости без явного обоснования

### Шрифты
Подключить через Google Fonts в index.html:
```html
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Nunito+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

### Форматирование сумм
```typescript
// Всегда использовать пробел как разделитель тысяч, без копеек
// 256 116 ₸ (не 256,116 или 256.116,00)
const formatKZT = (amount: number): string => {
  return Math.round(amount).toLocaleString('ru-KZ') + ' ₸';
};
```

### Анимации
- Числа: count-up анимация при изменении (300ms ease-out)
- Карточки: fade-in с stagger delay (50ms между элементами)
- Bottom sheet: slide-up с spring easing
- Progress bars: animate width на mount (500ms ease-out)
- Skeleton loaders пока данные грузятся

### Mobile-first
- Touch targets: минимум 44x44px
- Swipe actions на транзакциях (edit/delete)
- Pull-to-refresh на списках
- Viewport: `<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">`
- Safe area insets: `env(safe-area-inset-bottom)` для bottom bar

### Обработка ошибок
- Optimistic UI: обновлять UI сразу, откатывать при ошибке
- Toast notifications для подтверждения действий
- Retry logic для Supabase запросов (exponential backoff)
- Offline detection: показывать banner "Нет соединения"

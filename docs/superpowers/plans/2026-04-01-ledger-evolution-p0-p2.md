# Ledger Evolution P0–P2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade FamilyBudget data layer to fintech-grade: audit trail, soft delete, accounts, goal contribution history, period engine, and clean domain layer — without breaking existing UI or optimistic updates.

**Architecture:** All DB changes are additive migrations (no column drops). Client-side changes are backward-compatible (nullable fields). Realtime subscriptions are adjusted to handle soft-delete UPDATE events.

**Tech Stack:** PostgreSQL (Supabase), TypeScript strict, Zustand, React 18 + Vite

**Priority order:** P0 (Tasks 1–3) → P1 (Tasks 4–10) → P2 (Tasks 11–12)

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `supabase/migrations/009_audit_log.sql` | Create | audit_log table + triggers on expenses/incomes/goals |
| `supabase/migrations/010_soft_delete.sql` | Create | deleted_at columns on expenses + incomes |
| `supabase/migrations/011_accounts.sql` | Create | accounts table + account_id FK on expenses/incomes |
| `supabase/migrations/012_goal_contributions.sql` | Create | goal_contributions table + trigger to sync goals.current_amount |
| `supabase/migrations/013_transfer_type.sql` | Create | to_account_id column on expenses for transfer support |
| `src/types/index.ts` | Modify | Add Account, GoalContribution, BudgetPeriodType types; add accountId to Expense/Income |
| `src/lib/dates.ts` | Modify | Add getPeriodRange() function |
| `src/lib/domain.ts` | Create | Pure calculation functions extracted from useBudgetStore |
| `src/store/useExpenseStore.ts` | Modify | Soft delete in removeExpense; accountId in addExpense; mapRow update |
| `src/store/useIncomeStore.ts` | Modify | Soft delete in removeIncome; accountId in addIncome; mapRow update |
| `src/store/useGoalsStore.ts` | Modify | contributeToGoal inserts into goal_contributions instead of RPC |
| `src/store/useAccountStore.ts` | Create | CRUD store for accounts with realtime |
| `src/store/useBudgetStore.ts` | Modify | Use getPeriodRange + call domain.ts functions |

---

## P0 — Audit Trail + Soft Delete

---

### Task 1: Migration 009 — audit_log table and triggers

**Files:**
- Create: `supabase/migrations/009_audit_log.sql`

- [ ] **Step 1: Create migration file**

```sql
-- суть: любое изменение в expenses/incomes/goals фиксируется в audit_log
-- клиентский код менять не нужно — всё делается через триггеры PostgreSQL

create table if not exists audit_log (
  id          uuid        primary key default gen_random_uuid(),
  entity_type text        not null,    -- 'expenses' | 'incomes' | 'goals'
  entity_id   uuid        not null,
  action      text        not null,    -- 'create' | 'update' | 'delete'
  payload     jsonb       not null,    -- для update: {old: ..., new: ...}; для остальных: вся строка
  space_id    uuid        references spaces(id),
  created_at  timestamptz not null default now()
);

create index on audit_log(entity_id);
create index on audit_log(space_id, created_at desc);

alter table audit_log enable row level security;
create policy "no direct client access" on audit_log
  as restrictive for all to public using (false);

-- единственная функция триггера — используется для всех трёх таблиц
create or replace function audit_log_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    insert into audit_log(entity_type, entity_id, action, payload, space_id)
    values (tg_table_name, old.id, 'delete', to_jsonb(old), old.space_id);
    return old;
  elsif tg_op = 'UPDATE' then
    insert into audit_log(entity_type, entity_id, action, payload, space_id)
    values (
      tg_table_name, new.id, 'update',
      jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new)),
      new.space_id
    );
    return new;
  else -- INSERT
    insert into audit_log(entity_type, entity_id, action, payload, space_id)
    values (tg_table_name, new.id, 'create', to_jsonb(new), new.space_id);
    return new;
  end if;
end;
$$;

create trigger expenses_audit
  after insert or update or delete on expenses
  for each row execute function audit_log_trigger();

create trigger incomes_audit
  after insert or update or delete on incomes
  for each row execute function audit_log_trigger();

create trigger goals_audit
  after insert or update or delete on goals
  for each row execute function audit_log_trigger();
```

- [ ] **Step 2: Apply in Supabase Dashboard → SQL Editor**

Вставить содержимое файла и выполнить. Убедиться: нет ошибок, таблица `audit_log` появилась в Table Editor.

- [ ] **Step 3: Verify trigger fires**

Выполнить в SQL Editor:
```sql
-- добавить тестовый расход вручную (или через приложение) и проверить:
select entity_type, action, created_at from audit_log order by created_at desc limit 5;
-- ожидаем строку с action='create' для expenses
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/009_audit_log.sql
git commit -m "feat(db): add audit_log table with triggers on expenses/incomes/goals"
```

---

### Task 2: Migration 010 — Soft Delete columns

**Files:**
- Create: `supabase/migrations/010_soft_delete.sql`

- [ ] **Step 1: Create migration file**

```sql
-- добавляем deleted_at к expenses и incomes
-- NULL = запись активна, NOT NULL = "удалена" (soft delete)
-- жёсткое удаление (DELETE) больше не используется клиентом

alter table expenses add column if not exists deleted_at timestamptz;
alter table incomes  add column if not exists deleted_at timestamptz;

-- partial index — ускоряет выборку активных записей
create index on expenses(space_id, created_at desc) where deleted_at is null;
create index on incomes(space_id,  created_at desc) where deleted_at is null;
```

- [ ] **Step 2: Apply in Supabase Dashboard → SQL Editor**

- [ ] **Step 3: Verify columns exist**

```sql
select column_name, data_type
from information_schema.columns
where table_name in ('expenses', 'incomes')
  and column_name = 'deleted_at';
-- ожидаем 2 строки: expenses.deleted_at timestamptz, incomes.deleted_at timestamptz
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/010_soft_delete.sql
git commit -m "feat(db): add soft delete (deleted_at) to expenses and incomes"
```

---

### Task 3: Soft Delete in useExpenseStore and useIncomeStore

**Files:**
- Modify: `src/store/useExpenseStore.ts`
- Modify: `src/store/useIncomeStore.ts`

- [ ] **Step 1: Update useExpenseStore — loadExpenses**

Найти строку с `.eq('space_id', spaceId)` в `loadExpenses` и добавить фильтр deleted_at:

```typescript
// было:
const { data } = await supabase
  .from('expenses')
  .select('*')
  .eq('space_id', spaceId)
  .order('created_at', { ascending: false });

// стало:
const { data } = await supabase
  .from('expenses')
  .select('*')
  .eq('space_id', spaceId)
  .is('deleted_at', null)
  .order('created_at', { ascending: false });
```

- [ ] **Step 2: Update useExpenseStore — removeExpense**

Заменить `delete()` на `update({ deleted_at })`:

```typescript
removeExpense: async (id) => {
  // soft delete: ставим метку вместо физического удаления
  const { error } = await supabase
    .from('expenses')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) {
    useToastStore.getState().show('Не удалось удалить расход', 'error');
    return;
  }
  set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) }));
},
```

- [ ] **Step 3: Update useExpenseStore — UPDATE realtime handler**

Soft delete приходит как UPDATE событие (а не DELETE). Нужно добавить проверку `deleted_at` в UPDATE handler. Найти блок `event: 'UPDATE'` в `subscribeRealtime` и заменить:

```typescript
.on(
  'postgres_changes',
  { event: 'UPDATE', schema: 'public', table: 'expenses', filter: `space_id=eq.${spaceId}` },
  (payload) => {
    const raw = payload.new as Record<string, unknown>;
    // Если deleted_at установлен — это soft delete, убираем из списка
    if (raw.deleted_at) {
      const id = raw.id as string;
      set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) }));
      return;
    }
    const updated = mapRow(raw);
    set((s) => ({
      expenses: s.expenses.map((e) => e.id === updated.id ? updated : e),
    }));
  }
)
```

- [ ] **Step 4: Update useIncomeStore — те же три изменения**

В `loadIncomes` добавить `.is('deleted_at', null)`:
```typescript
const { data } = await supabase
  .from('incomes')
  .select('*')
  .eq('space_id', spaceId)
  .is('deleted_at', null)
  .order('created_at', { ascending: false });
```

В `removeIncome` заменить `delete()` на `update`:
```typescript
removeIncome: async (id) => {
  const { error } = await supabase
    .from('incomes')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) {
    useToastStore.getState().show('Не удалось удалить доход', 'error');
    return;
  }
  set((s) => ({ incomes: s.incomes.filter((i) => i.id !== id) }));
},
```

Добавить/обновить UPDATE realtime handler в `subscribeRealtime`:
```typescript
.on(
  'postgres_changes',
  { event: 'UPDATE', schema: 'public', table: 'incomes', filter: `space_id=eq.${spaceId}` },
  (payload) => {
    const raw = payload.new as Record<string, unknown>;
    if (raw.deleted_at) {
      const id = raw.id as string;
      set((s) => ({ incomes: s.incomes.filter((i) => i.id !== id) }));
      return;
    }
    const income = mapRow(raw);
    set((s) => ({
      incomes: s.incomes.map((i) => (i.id === income.id ? income : i)),
    }));
  }
)
```

- [ ] **Step 5: Verify in browser**

1. Открыть приложение, добавить расход
2. Удалить расход через UI
3. Проверить в Supabase SQL Editor:
```sql
select id, amount, deleted_at from expenses where deleted_at is not null order by deleted_at desc limit 3;
-- ожидаем строку с deleted_at заполненным
```
4. Проверить в audit_log:
```sql
select action, payload->'new'->>'deleted_at' from audit_log
where entity_type = 'expenses' and action = 'update'
order by created_at desc limit 3;
-- ожидаем action='update' где new.deleted_at != null
```

- [ ] **Step 6: Commit**

```bash
git add src/store/useExpenseStore.ts src/store/useIncomeStore.ts
git commit -m "feat(store): soft delete for expenses and incomes via deleted_at"
```

---

## P1 — Accounts, goal_contributions, Period Engine

---

### Task 4: Migration 011 — accounts table

**Files:**
- Create: `supabase/migrations/011_accounts.sql`

- [ ] **Step 1: Create migration file**

```sql
-- таблица счетов (кошельков): карта мужа, карта жены, кэш, etc.
-- заменяет строковое поле paid_by → ссылку на account_id

create table if not exists accounts (
  id         uuid        primary key default gen_random_uuid(),
  space_id   uuid        not null references spaces(id) on delete cascade,
  name       text        not null,
  currency   text        not null default 'KZT',
  is_active  boolean     not null default true,
  created_at timestamptz not null default now()
);

create index on accounts(space_id);
alter table accounts enable row level security;
create policy "allow all accounts" on accounts for all using (true) with check (true);

-- добавляем account_id к expenses и incomes (nullable — обратная совместимость)
alter table expenses add column if not exists account_id uuid references accounts(id);
alter table incomes  add column if not exists account_id uuid references accounts(id);

-- seed: три дефолтных счёта для каждого существующего space
-- используем INSERT без ON CONFLICT — таблица новая, дублей не будет
insert into accounts (space_id, name, currency)
select id, 'Карта мужа',  'KZT' from spaces;

insert into accounts (space_id, name, currency)
select id, 'Карта жены',  'KZT' from spaces;

insert into accounts (space_id, name, currency)
select id, 'Общий счёт', 'KZT' from spaces;
```

- [ ] **Step 2: Apply in Supabase Dashboard → SQL Editor**

- [ ] **Step 3: Verify**

```sql
select name, currency from accounts limit 10;
-- ожидаем: Карта мужа, Карта жены, Общий счёт для каждого space

select column_name from information_schema.columns
where table_name = 'expenses' and column_name = 'account_id';
-- ожидаем: 1 строка
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/011_accounts.sql
git commit -m "feat(db): add accounts table, seed default accounts, add account_id FK to expenses/incomes"
```

---

### Task 5: Add Account type and update Expense/Income types

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add Account interface**

Добавить после блока `// -- INCOME SOURCES --` (строка 1):

```typescript
// -- ACCOUNTS --
export interface Account {
  id: string;
  spaceId: string;
  name: string;
  currency: string;
  isActive: boolean;
  createdAt: string;
}
```

- [ ] **Step 2: Add accountId to Expense interface**

Найти `paidBy: string;` в `Expense` и добавить строку после:

```typescript
export interface Expense {
  id: string;
  amount: number;
  date: string;
  categoryId: string;
  description?: string;
  type: ExpenseType;
  paidBy: string;
  accountId?: string;   // ссылка на accounts.id (nullable для обратной совместимости)
  createdAt: string;
}
```

- [ ] **Step 3: Add accountId to Income interface**

```typescript
export interface Income {
  id: string;
  amount: number;
  date: string;
  source: IncomeSource;
  note?: string;
  distribution: Distribution;
  accountId?: string;   // ссылка на accounts.id (nullable)
  createdAt: string;
}
```

- [ ] **Step 4: Add GoalContribution interface**

Добавить после блока `// -- SAVINGS GOALS --`:

```typescript
// -- GOAL CONTRIBUTIONS --
export interface GoalContribution {
  id: string;
  goalId: string;
  amount: number;
  note?: string;
  createdAt: string;
}
```

- [ ] **Step 5: Add BudgetPeriodType**

Добавить после блока `// -- PERIOD --`:

```typescript
export type BudgetPeriodType = 'day' | 'week' | 'month' | 'custom';

export interface BudgetPeriodRange {
  start: Date;
  end: Date;
}
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
npx tsc --noEmit
# ожидаем: 0 ошибок
```

- [ ] **Step 7: Commit**

```bash
git add src/types/index.ts
git commit -m "feat(types): add Account, GoalContribution, BudgetPeriodType; add accountId to Expense/Income"
```

---

### Task 6: Create useAccountStore

**Files:**
- Create: `src/store/useAccountStore.ts`

- [ ] **Step 1: Create file**

```typescript
import { create } from 'zustand';
import type { Account } from '../types';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './useAuthStore';
import { useToastStore } from './useToastStore';

interface AccountStore {
  accounts: Account[];
  loading: boolean;
  loadAccounts: () => Promise<void>;
  subscribeRealtime: () => () => void;
  addAccount: (data: { name: string; currency?: string }) => Promise<void>;
  updateAccount: (id: string, data: Partial<Pick<Account, 'name' | 'currency' | 'isActive'>>) => Promise<void>;
  removeAccount: (id: string) => Promise<void>;
  clearAll: () => void;
}

function mapRow(r: Record<string, unknown>): Account {
  return {
    id: r.id as string,
    spaceId: r.space_id as string,
    name: r.name as string,
    currency: r.currency as string,
    isActive: r.is_active as boolean,
    createdAt: r.created_at as string,
  };
}

export const useAccountStore = create<AccountStore>()((set) => ({
  accounts: [],
  loading: false,

  subscribeRealtime: () => {
    const spaceId = useAuthStore.getState().user?.spaceId;
    if (!spaceId) return () => {};
    const channel = supabase
      .channel(`accounts-realtime-${spaceId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'accounts', filter: `space_id=eq.${spaceId}` },
        (payload) => {
          const account = mapRow(payload.new as Record<string, unknown>);
          set((s) => {
            if (s.accounts.find((a) => a.id === account.id)) return s;
            return { accounts: [...s.accounts, account] };
          });
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'accounts', filter: `space_id=eq.${spaceId}` },
        (payload) => {
          const account = mapRow(payload.new as Record<string, unknown>);
          set((s) => ({
            accounts: s.accounts.map((a) => a.id === account.id ? account : a),
          }));
        }
      )
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'accounts', filter: `space_id=eq.${spaceId}` },
        (payload) => {
          const id = (payload.old as Record<string, unknown>).id as string;
          set((s) => ({ accounts: s.accounts.filter((a) => a.id !== id) }));
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  },

  loadAccounts: async () => {
    const spaceId = useAuthStore.getState().user?.spaceId;
    if (!spaceId) { set({ loading: false }); return; }
    set({ loading: true });
    const { data } = await supabase
      .from('accounts')
      .select('*')
      .eq('space_id', spaceId)
      .eq('is_active', true)
      .order('created_at', { ascending: true });
    if (data) set({ accounts: data.map((r) => mapRow(r as Record<string, unknown>)) });
    set({ loading: false });
  },

  addAccount: async (data) => {
    const spaceId = useAuthStore.getState().user?.spaceId;
    if (!spaceId) return;
    const { error } = await supabase.from('accounts').insert({
      space_id: spaceId,
      name: data.name,
      currency: data.currency ?? 'KZT',
    });
    if (error) useToastStore.getState().show('Не удалось создать счёт', 'error');
  },

  updateAccount: async (id, data) => {
    const row: Record<string, unknown> = {};
    if (data.name !== undefined) row.name = data.name;
    if (data.currency !== undefined) row.currency = data.currency;
    if (data.isActive !== undefined) row.is_active = data.isActive;
    const { error } = await supabase.from('accounts').update(row).eq('id', id);
    if (error) { useToastStore.getState().show('Не удалось обновить счёт', 'error'); return; }
    set((s) => ({
      accounts: s.accounts.map((a) => a.id === id ? { ...a, ...data } : a),
    }));
  },

  removeAccount: async (id) => {
    // soft deactivate (не удаляем физически — могут быть transactions с этим account_id)
    const { error } = await supabase.from('accounts').update({ is_active: false }).eq('id', id);
    if (error) { useToastStore.getState().show('Не удалось удалить счёт', 'error'); return; }
    set((s) => ({ accounts: s.accounts.filter((a) => a.id !== id) }));
  },

  clearAll: () => set({ accounts: [] }),
}));
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
# ожидаем: 0 ошибок
```

- [ ] **Step 3: Commit**

```bash
git add src/store/useAccountStore.ts
git commit -m "feat(store): add useAccountStore with CRUD and realtime subscription"
```

---

### Task 7: Wire accountId into useExpenseStore and useIncomeStore

**Files:**
- Modify: `src/store/useExpenseStore.ts`
- Modify: `src/store/useIncomeStore.ts`

- [ ] **Step 1: Update mapRow in useExpenseStore**

Найти функцию `mapRow` в `useExpenseStore.ts` и добавить поле `accountId`:

```typescript
function mapRow(r: Record<string, unknown>): Expense {
  return {
    id: r.id as string,
    amount: r.amount as number,
    date: r.date as string,
    categoryId: r.category_id as string,
    type: r.type as ExpenseType,
    description: r.description as string | undefined,
    paidBy: (r.paid_by as string | undefined) ?? '',
    accountId: r.account_id as string | undefined,
    createdAt: r.created_at as string,
  };
}
```

- [ ] **Step 2: Update addExpense signature + row insert**

Найти интерфейс `ExpenseStore` и обновить сигнатуру `addExpense`:

```typescript
addExpense: (data: {
  amount: number;
  date: string;
  categoryId: string;
  type: ExpenseType;
  description?: string;
  paidBy?: string;
  accountId?: string;  // NEW
}) => Promise<{ ok: true } | { ok: false; error: string }>;
```

В реализации `addExpense` найти `const row = {` и добавить поле:

```typescript
const row = {
  amount: data.amount,
  date: data.date,
  category_id: data.categoryId,
  type: data.type,
  description: data.description,
  paid_by: data.paidBy ?? 'shared',
  account_id: data.accountId ?? null,  // NEW
  space_id: spaceId,
  created_at: new Date().toISOString(),
};
```

В оптимистичном item добавить поле:
```typescript
const optimisticItem: Expense = {
  ...все существующие поля...,
  accountId: data.accountId,  // NEW
};
```

- [ ] **Step 3: Update mapRow in useIncomeStore**

```typescript
function mapRow(r: Record<string, unknown>): Income {
  return {
    id: r.id as string,
    amount: r.amount as number,
    date: r.date as string,
    source: r.source as IncomeSource,
    note: r.note as string | undefined,
    distribution: r.distribution as Income['distribution'],
    accountId: r.account_id as string | undefined,  // NEW
    createdAt: r.created_at as string,
  };
}
```

- [ ] **Step 4: Update addIncome signature + row insert**

В интерфейсе `IncomeStore` добавить `accountId` к сигнатуре `addIncome`:

```typescript
addIncome: (data: {
  amount: number;
  date: string;
  source: IncomeSource;
  note?: string;
  ratios?: { mandatory: number; flexible: number; savings: number };
  fixedTotal?: number;
  accountId?: string;  // NEW
}) => Promise<{ ok: true } | { ok: false; error: string }>;
```

В `const row = {` добавить:
```typescript
account_id: data.accountId ?? null,  // NEW
```

В оптимистичном item:
```typescript
const optimisticItem: Income = {
  ...все существующие поля...,
  accountId: data.accountId,  // NEW
};
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
# ожидаем: 0 ошибок
```

- [ ] **Step 6: Commit**

```bash
git add src/store/useExpenseStore.ts src/store/useIncomeStore.ts
git commit -m "feat(store): wire accountId into addExpense and addIncome"
```

---

### Task 8: Migration 012 — goal_contributions table

**Files:**
- Create: `supabase/migrations/012_goal_contributions.sql`

- [ ] **Step 1: Create migration file**

```sql
-- история взносов в цели сбережений
-- trigger автоматически обновляет goals.current_amount при любом изменении взносов

create table if not exists goal_contributions (
  id       uuid        primary key default gen_random_uuid(),
  goal_id  uuid        not null references goals(id) on delete cascade,
  space_id uuid        not null references spaces(id) on delete cascade,
  amount   integer     not null check (amount != 0),  -- положительный = взнос, отрицательный = возврат
  note     text,
  created_at timestamptz not null default now()
);

create index on goal_contributions(goal_id, created_at desc);

alter table goal_contributions enable row level security;
create policy "allow all goal_contributions" on goal_contributions
  for all using (true) with check (true);

-- триггер синхронизирует goals.current_amount = SUM(goal_contributions.amount)
create or replace function sync_goal_current_amount()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_goal_id uuid;
begin
  target_goal_id := coalesce(new.goal_id, old.goal_id);
  update goals
  set current_amount = (
    select coalesce(sum(amount), 0)
    from goal_contributions
    where goal_id = target_goal_id
  )
  where id = target_goal_id;
  return coalesce(new, old);
end;
$$;

create trigger goal_contributions_sync
  after insert or update or delete on goal_contributions
  for each row execute function sync_goal_current_amount();

-- миграция существующих данных:
-- создаём один начальный взнос для каждой цели с ненулевым current_amount
insert into goal_contributions (goal_id, space_id, amount, note, created_at)
select
  g.id,
  g.space_id,
  g.current_amount::integer,
  'Начальный баланс (авто-миграция)',
  g.created_at
from goals g
where g.current_amount > 0;
```

- [ ] **Step 2: Apply in Supabase Dashboard → SQL Editor**

- [ ] **Step 3: Verify**

```sql
-- проверяем что current_amount в goals не изменился
select g.name, g.current_amount, coalesce(sum(gc.amount), 0) as sum_contributions
from goals g
left join goal_contributions gc on gc.goal_id = g.id
group by g.id, g.name, g.current_amount;
-- ожидаем: current_amount == sum_contributions для каждой цели
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/012_goal_contributions.sql
git commit -m "feat(db): add goal_contributions table with trigger to sync goals.current_amount"
```

---

### Task 9: Update useGoalsStore — contributeToGoal via goal_contributions

**Files:**
- Modify: `src/store/useGoalsStore.ts`

- [ ] **Step 1: Update contributeToGoal**

Найти метод `contributeToGoal` и заменить полностью:

```typescript
contributeToGoal: async (id, amount) => {
  const spaceId = useAuthStore.getState().user?.spaceId;
  if (!spaceId) return;

  // оптимистичное обновление — моментальный отклик UI
  set((s) => ({
    goals: s.goals.map((g) =>
      g.id === id ? { ...g, currentAmount: g.currentAmount + amount } : g
    ),
  }));

  const { error } = await supabase.from('goal_contributions').insert({
    goal_id: id,
    space_id: spaceId,
    amount,
  });

  if (error) {
    // откат оптимистичного изменения
    set((s) => ({
      goals: s.goals.map((g) =>
        g.id === id ? { ...g, currentAmount: g.currentAmount - amount } : g
      ),
    }));
    // импортируем toast лениво чтобы не создавать циклических зависимостей
    const { useToastStore } = await import('./useToastStore');
    useToastStore.getState().show('Не удалось сохранить взнос', 'error');
    return;
  }
  // goals.current_amount обновится через trigger → realtime UPDATE → UPDATE handler в subscribeRealtime
},
```

- [ ] **Step 2: Add import for useAuthStore if missing**

Убедиться что в начале файла есть:
```typescript
import { useAuthStore } from './useAuthStore';
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Test in browser**

1. Открыть Goals страницу
2. Сделать взнос в цель
3. Убедиться что `currentAmount` обновился в UI
4. В Supabase SQL Editor:
```sql
select * from goal_contributions order by created_at desc limit 3;
-- ожидаем запись с новым взносом
```

- [ ] **Step 5: Commit**

```bash
git add src/store/useGoalsStore.ts
git commit -m "feat(store): contributeToGoal now inserts into goal_contributions instead of RPC increment"
```

---

### Task 10: Period Engine in dates.ts + useBudgetStore

**Files:**
- Modify: `src/lib/dates.ts`
- Modify: `src/store/useBudgetStore.ts`

- [ ] **Step 1: Add getPeriodRange to dates.ts**

Добавить в конец файла `src/lib/dates.ts`:

```typescript
import type { BudgetPeriodType, BudgetPeriodRange } from '../types';

/**
 * Возвращает диапазон дат для выбранного типа периода.
 * Используется в useBudgetStore и аналитике вместо жёстко заданного getCurrentMonthRange().
 */
export function getPeriodRange(
  periodType: BudgetPeriodType,
  custom?: BudgetPeriodRange,
  from = new Date(),
): BudgetPeriodRange {
  const y = from.getFullYear();
  const m = from.getMonth();
  const d = from.getDate();

  switch (periodType) {
    case 'day':
      return {
        start: new Date(y, m, d, 0, 0, 0),
        end: new Date(y, m, d, 23, 59, 59),
      };
    case 'week': {
      const dow = from.getDay();
      // ISO week: понедельник = начало недели
      const diffToMonday = (dow + 6) % 7;
      const monday = new Date(y, m, d - diffToMonday);
      const sunday = new Date(y, m, d + (6 - diffToMonday));
      return {
        start: new Date(monday.getFullYear(), monday.getMonth(), monday.getDate(), 0, 0, 0),
        end: new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate(), 23, 59, 59),
      };
    }
    case 'month':
      return getCurrentMonthRange();
    case 'custom':
      if (!custom) throw new Error('BudgetPeriodRange required for periodType="custom"');
      return custom;
  }
}
```

- [ ] **Step 2: Update useBudgetStore to import getPeriodRange**

Найти строку в `src/store/useBudgetStore.ts`:
```typescript
import { getCurrentMonthRange, getNextIncomeDate, getDaysUntil, parseLocalDate } from '../lib/dates';
```

Добавить `getPeriodRange` в импорт:
```typescript
import { getCurrentMonthRange, getPeriodRange, getNextIncomeDate, getDaysUntil, parseLocalDate } from '../lib/dates';
import type { BudgetPeriodType, BudgetPeriodRange } from '../types';
```

- [ ] **Step 3: Update useBudgetSummary signature**

Найти:
```typescript
export function useBudgetSummary(): BudgetSummary {
```

Заменить на:
```typescript
export function useBudgetSummary(
  periodType: BudgetPeriodType = 'month',
  customRange?: BudgetPeriodRange,
): BudgetSummary {
```

- [ ] **Step 4: Replace getCurrentMonthRange() call**

Найти:
```typescript
const { start, end } = getCurrentMonthRange();
```

Заменить на:
```typescript
const { start, end } = getPeriodRange(periodType, customRange);
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
# ожидаем: 0 ошибок
```

- [ ] **Step 6: Verify existing dashboard still works**

Все вызовы `useBudgetSummary()` без аргументов продолжают работать (дефолт 'month'). Открыть браузер — дашборд должен отображаться как раньше.

- [ ] **Step 7: Commit**

```bash
git add src/lib/dates.ts src/store/useBudgetStore.ts
git commit -m "feat(dates): add getPeriodRange(); useBudgetSummary accepts periodType param"
```

---

## P2 — Domain Layer + Transfer Type

---

### Task 11: Extract domain/calculations.ts from useBudgetStore

**Files:**
- Create: `src/lib/domain.ts`
- Modify: `src/store/useBudgetStore.ts`

- [ ] **Step 1: Create src/lib/domain.ts**

```typescript
import type { Income, Expense } from '../types';
import { parseLocalDate } from './dates';

/**
 * Вычисляет взвешенное среднее ratios по приходам.
 * Fallback: 0.5 / 0.3 если приходов нет.
 */
export function computeBudgetRatios(effectiveIncomes: Income[]): {
  mandatoryRatio: number;
  flexibleRatio: number;
} {
  const totalIncome = effectiveIncomes.reduce((s, i) => s + i.amount, 0);
  if (totalIncome === 0) return { mandatoryRatio: 0.5, flexibleRatio: 0.3 };

  const mandatoryRatio =
    effectiveIncomes.reduce(
      (s, i) => s + i.amount * (i.distribution.customRatios?.mandatory ?? 0.5),
      0,
    ) / totalIncome;

  const flexibleRatio =
    effectiveIncomes.reduce(
      (s, i) => s + i.amount * (i.distribution.customRatios?.flexible ?? 0.3),
      0,
    ) / totalIncome;

  return { mandatoryRatio, flexibleRatio };
}

/**
 * Распределяет distributable по ratios.
 * Последний bucket (savings) = остаток, чтобы сумма точно равнялась distributable.
 */
export function computeBudgetBuckets(
  distributable: number,
  mandatoryRatio: number,
  flexibleRatio: number,
): { mandatoryBudget: number; flexibleBudget: number; savingsBudget: number } {
  const mandatoryBudget = Math.round(distributable * mandatoryRatio);
  const flexibleBudget = Math.round(distributable * flexibleRatio);
  const savingsBudget = distributable - mandatoryBudget - flexibleBudget;
  return { mandatoryBudget, flexibleBudget, savingsBudget };
}

/**
 * Суммирует расходы по типам для списка трат в периоде.
 */
export function computeSpending(expenses: Expense[]): {
  mandatorySpent: number;
  flexibleSpent: number;
  savingsActual: number;
} {
  return {
    mandatorySpent: expenses.filter((e) => e.type === 'mandatory').reduce((s, e) => s + e.amount, 0),
    flexibleSpent: expenses.filter((e) => e.type === 'flexible').reduce((s, e) => s + e.amount, 0),
    savingsActual: expenses.filter((e) => e.type === 'savings').reduce((s, e) => s + e.amount, 0),
  };
}

/**
 * Если в текущем периоде нет доходов — берём последний месяц с доходами (до 2 назад).
 * Возвращает effectiveIncomes и флаг isCarryForward.
 */
export function computeCarryForward(
  monthIncomes: Income[],
  allIncomes: Income[],
  today = new Date(),
): { effectiveIncomes: Income[]; isCarryForward: boolean } {
  if (monthIncomes.length > 0) {
    return { effectiveIncomes: monthIncomes, isCarryForward: false };
  }

  for (let offset = 1; offset <= 2; offset++) {
    const m = ((today.getMonth() - offset) + 12) % 12;
    const y = today.getMonth() - offset < 0 ? today.getFullYear() - 1 : today.getFullYear();
    const lookStart = new Date(y, m, 1);
    const lookEnd = new Date(y, m + 1, 0, 23, 59, 59);
    const found = allIncomes.filter((i) => {
      const d = parseLocalDate(i.date);
      return d >= lookStart && d <= lookEnd;
    });
    if (found.length > 0) return { effectiveIncomes: found, isCarryForward: true };
  }

  return { effectiveIncomes: [], isCarryForward: true };
}
```

- [ ] **Step 2: Refactor useBudgetStore to use domain.ts**

Добавить импорт в `src/store/useBudgetStore.ts`:
```typescript
import { computeBudgetRatios, computeBudgetBuckets, computeSpending, computeCarryForward } from '../lib/domain';
```

Найти блок от `// Carry-forward` до `const savingsBudget =` и заменить весь inline-код расчётов:

```typescript
  // --- было (inline в store): ---
  // const isCarryForward = monthIncomes.length === 0;
  // const effectiveIncomes = isCarryForward ? (...) : monthIncomes;
  // const totalIncome = effectiveIncomes.reduce(...);
  // const distributable = ...;
  // let mandatoryRatio = 0.5;
  // let flexibleRatio = 0.3;
  // if (totalIncome > 0) { mandatoryRatio = ...; flexibleRatio = ...; }
  // const mandatoryBudget = Math.round(...);
  // const flexibleBudget = Math.round(...);
  // const savingsBudget = distributable - mandatoryBudget - flexibleBudget;
  // const mandatorySpent = monthExpenses.filter(...).reduce(...);
  // const flexibleSpent = ...;
  // const savingsActual = ...;

  // --- стало (через domain.ts): ---
  const { effectiveIncomes, isCarryForward } = computeCarryForward(monthIncomes, incomes);
  const totalIncome = effectiveIncomes.reduce((s, i) => s + i.amount, 0);
  const distributable = Math.max(0, totalIncome - fixedTotal);
  const { mandatoryRatio, flexibleRatio } = computeBudgetRatios(effectiveIncomes);
  const { mandatoryBudget, flexibleBudget, savingsBudget } = computeBudgetBuckets(distributable, mandatoryRatio, flexibleRatio);
  const { mandatorySpent, flexibleSpent, savingsActual } = computeSpending(monthExpenses);
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
# ожидаем: 0 ошибок
```

- [ ] **Step 4: Verify dashboard unchanged**

Открыть браузер — все цифры дашборда должны совпадать с тем что было до рефакторинга.

- [ ] **Step 5: Commit**

```bash
git add src/lib/domain.ts src/store/useBudgetStore.ts
git commit -m "refactor(domain): extract budget calculations into src/lib/domain.ts"
```

---

### Task 12: Transfer type support

**Files:**
- Create: `supabase/migrations/013_transfer_type.sql`
- Modify: `src/types/index.ts`
- Modify: `src/store/useExpenseStore.ts`

- [ ] **Step 1: Create migration file**

```sql
-- перевод между счетами: не влияет на общий баланс,
-- только перемещает деньги из одного account в другой

alter table expenses
  add column if not exists to_account_id uuid references accounts(id);

-- разрешаем новое значение для поля type
-- (если на таблице есть CHECK constraint на type — нужно его обновить)
-- Проверить: \d expenses в psql или через Supabase Table Editor
-- Если есть constraint expenses_type_check — пересоздать:
alter table expenses drop constraint if exists expenses_type_check;
alter table expenses
  add constraint expenses_type_check
  check (type in ('mandatory', 'flexible', 'savings', 'transfer'));
```

- [ ] **Step 2: Apply in Supabase Dashboard → SQL Editor**

- [ ] **Step 3: Add 'transfer' to ExpenseType in types/index.ts**

Найти:
```typescript
export type ExpenseType = 'mandatory' | 'flexible' | 'savings';
```

Заменить на:
```typescript
export type ExpenseType = 'mandatory' | 'flexible' | 'savings' | 'transfer';
```

- [ ] **Step 4: Update mapRow in useExpenseStore — добавить toAccountId**

В функции `mapRow`:
```typescript
function mapRow(r: Record<string, unknown>): Expense {
  return {
    ...все существующие поля...,
    accountId: r.account_id as string | undefined,
    toAccountId: r.to_account_id as string | undefined,  // NEW
    createdAt: r.created_at as string,
  };
}
```

- [ ] **Step 5: Add toAccountId to Expense type**

В `src/types/index.ts` в интерфейсе `Expense`:
```typescript
export interface Expense {
  id: string;
  amount: number;
  date: string;
  categoryId: string;
  description?: string;
  type: ExpenseType;
  paidBy: string;
  accountId?: string;
  toAccountId?: string;  // NEW — для transfer: куда переводятся деньги
  createdAt: string;
}
```

- [ ] **Step 6: Update addExpense to accept toAccountId**

В сигнатуре `addExpense` добавить:
```typescript
addExpense: (data: {
  ...существующие поля...
  accountId?: string;
  toAccountId?: string;  // NEW
}) => ...
```

В `const row = {` добавить:
```typescript
to_account_id: data.toAccountId ?? null,  // NEW
```

В оптимистичном item:
```typescript
toAccountId: data.toAccountId,  // NEW
```

- [ ] **Step 7: Verify TypeScript compiles**

```bash
npx tsc --noEmit
# ожидаем: 0 ошибок
```

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations/013_transfer_type.sql src/types/index.ts src/store/useExpenseStore.ts
git commit -m "feat: add transfer type to expenses with to_account_id field"
```

---

## Финальная верификация

- [ ] `npx tsc --noEmit` — 0 ошибок
- [ ] Все 5 миграций (009–013) применены в Supabase
- [ ] Дашборд отображается корректно, цифры не изменились
- [ ] Добавить расход → появляется в UI + в audit_log
- [ ] Удалить расход → исчезает из UI, но `deleted_at` проставлен в БД (не hard delete)
- [ ] Сделать взнос в цель → `goal_contributions` содержит запись, `goals.current_amount` обновился

---

## Что не тронуто (намеренно)

- Optimistic updates — не изменены (только мягкое удаление)
- Realtime subscriptions — минимальные изменения (добавлен UPDATE handler для soft delete)
- `forecastMonthlySpend` — работает без изменений
- Edge Functions (ai-proxy, change-user-role) — не изменены
- UI компоненты форм ввода — `accountId` добавлен как optional, ничего не сломано

---

## Что пользователю нужно сделать вручную в Supabase

После применения миграций:
1. Применить 009_audit_log.sql
2. Применить 010_soft_delete.sql
3. Применить 011_accounts.sql
4. Применить 012_goal_contributions.sql
5. Применить 013_transfer_type.sql

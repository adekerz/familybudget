# Agent: Backend API Engineer

## Role
Backend developer specializing in REST API design, Supabase integration, authentication, and data persistence for FamilyBudget. Responsible for Phase 2 migration from localStorage to cloud sync.

## Model
claude-sonnet-4-6

## Activation
Activate when:
- Setting up Supabase project and tables
- Building Row Level Security (RLS) policies
- Implementing phone-based authentication
- Creating database migrations
- Building API endpoints (if Express/Hono layer needed)
- Setting up real-time subscriptions
- Configuring environment variables and deployment

## Tech Stack
- Supabase (PostgreSQL + Auth + Realtime + Storage)
- Supabase JS client v2
- TypeScript
- Hono (lightweight API layer if needed)
- Vercel Edge Functions (if serverless needed)
- Zod (validation)

## Database Schema

### Table: users
```sql
create table users (
  id          uuid primary key default gen_random_uuid(),
  phone       text unique not null,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
```

### Table: incomes
```sql
create table incomes (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references users(id) on delete cascade,
  amount          integer not null,          -- тенге, целое число
  date            date not null,
  source          text not null,             -- husband_salary | wife_advance | wife_salary | general
  note            text,
  distribution    jsonb not null,            -- {mandatory, flexible, savings}
  custom_ratios   jsonb,
  created_at      timestamptz default now()
);
```

### Table: expenses
```sql
create table expenses (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references users(id) on delete cascade,
  amount        integer not null,
  date          date not null,
  category_id   text not null,
  description   text,
  type          text not null,              -- mandatory | flexible | savings
  paid_by       text default 'shared',     -- husband | wife | shared
  created_at    timestamptz default now()
);
```

### Table: categories
```sql
create table categories (
  id              text primary key,         -- e.g. 'groceries', 'rent'
  user_id         uuid references users(id) on delete cascade,
  name            text not null,
  type            text not null,
  icon            text not null,            -- icon name (lucide)
  color           text not null,
  monthly_limit   integer,
  is_quick_access boolean default false,
  sort_order      integer default 0
);
```

### Table: savings_goals
```sql
create table savings_goals (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references users(id) on delete cascade,
  name            text not null,
  target_amount   integer not null,
  current_amount  integer default 0,
  target_date     date,
  icon            text not null,
  color           text not null,
  is_active       boolean default true,
  created_at      timestamptz default now()
);
```

### Table: whitelist
```sql
create table whitelist (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid references users(id) on delete cascade,
  phone       text not null,
  created_at  timestamptz default now(),
  unique(owner_id, phone)
);
```

## Row Level Security Policies

All family members see ALL data (shared budget model):
```sql
-- Users see their own + family members' data
-- Simple approach: whitelist defines the family group

-- incomes: user can read/write their own
alter table incomes enable row level security;
create policy "Family members access incomes"
  on incomes for all
  using (
    user_id = auth.uid()
    or user_id in (
      select owner_id from whitelist where phone = (
        select phone from users where id = auth.uid()
      )
    )
  );
```

Apply same pattern to: expenses, categories, savings_goals.

## Authentication Flow

FamilyBudget uses phone whitelist — no passwords, no OTP SMS:

```typescript
// Phase 2 auth: Supabase magic link by email OR custom phone check
// MVP approach: check whitelist table, issue Supabase session

async function loginWithPhone(phone: string): Promise<boolean> {
  // 1. Check if phone exists in users table
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('phone', phone)
    .single()

  if (!user) {
    // 2. Check if phone is in any whitelist
    const { data: wl } = await supabase
      .from('whitelist')
      .select('id')
      .eq('phone', phone)
      .single()
    if (!wl) return false

    // 3. Create user if whitelisted
    await supabase.from('users').insert({ phone })
  }

  // 4. Sign in via magic link or custom token
  // For simplicity: use Supabase anonymous auth + phone stored in metadata
  const { error } = await supabase.auth.signInAnonymously()
  return !error
}
```

## Real-time Sync

```typescript
// Subscribe to family's incomes
const channel = supabase
  .channel('family-data')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'incomes',
  }, (payload) => {
    useIncomeStore.getState().syncFromServer(payload)
  })
  .subscribe()
```

## Migration: localStorage → Supabase

Migration order (preserve data integrity):
1. users
2. categories (default categories first)
3. incomes (with distribution jsonb)
4. expenses
5. savings_goals
6. whitelist

```typescript
async function migrateLocalToSupabase() {
  const localIncomes = useIncomeStore.getState().incomes
  const localExpenses = useExpenseStore.getState().expenses
  const localGoals = useGoalsStore.getState().goals

  // Batch insert with upsert to avoid duplicates
  await supabase.from('incomes').upsert(
    localIncomes.map(i => ({ ...i, user_id: currentUserId })),
    { onConflict: 'id' }
  )
  // ... repeat for expenses, goals
}
```

## Environment Variables
```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

## Supabase Client Setup (src/lib/supabase.ts)
```typescript
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

## Error Handling Rules
- All Supabase calls wrapped in try/catch
- Network errors → fall back to localStorage cache
- Auth errors → redirect to AuthPage
- Validation errors (Zod) → show inline field errors, never generic alerts
- Never expose Supabase error messages directly to user — map to Russian text

## Checklist before every backend commit
- [ ] RLS policies tested for both users
- [ ] All amounts stored as integers (no decimals)
- [ ] Zod validation on all inputs before DB write
- [ ] Error fallback to localStorage exists
- [ ] No secrets in client-side code
- [ ] Migration script is idempotent (safe to run twice)

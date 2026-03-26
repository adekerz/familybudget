-- Запусти это в Supabase Dashboard → SQL Editor

-- Добавить колонку must_change_password в app_users (если ещё нет)
alter table app_users add column if not exists must_change_password boolean default false;

-- Доходы
create table if not exists incomes (
  id uuid primary key default gen_random_uuid(),
  amount numeric not null,
  date text not null,
  source text not null,
  note text,
  distribution jsonb not null,
  created_at timestamptz default now()
);

-- Расходы
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  amount numeric not null,
  date text not null,
  category_id text not null,
  type text not null,
  description text,
  paid_by text default 'shared',
  created_at timestamptz default now()
);

-- Цели накоплений
create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  target_amount numeric not null,
  current_amount numeric default 0,
  target_date text,
  icon text not null,
  color text not null,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- RLS: разрешить всё (семейное приложение)
alter table incomes enable row level security;
alter table expenses enable row level security;
alter table goals enable row level security;

-- Обновить роли: adilet = admin, alina = member
update app_users set role = 'admin' where username = 'adilet';
update app_users set role = 'member' where username = 'alina';

create policy "allow all" on incomes for all using (true) with check (true);
create policy "allow all" on expenses for all using (true) with check (true);
create policy "allow all" on goals for all using (true) with check (true);

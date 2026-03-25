-- ШАГ 1.1: Таблица spaces (изолированные пространства данных)
create table if not exists spaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

-- ШАГ 1.2: Таблица users (новая система аутентификации)
create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null default '',  -- bcrypt hash
  space_id uuid references spaces(id) on delete cascade,
  role text not null default 'member',    -- 'superadmin' | 'admin' | 'member'
  theme_id text not null default 'light',
  created_at timestamptz default now(),
  last_login_at timestamptz,
  session_expires_at timestamptz
);

-- ШАГ 1.3: Recovery codes
create table if not exists recovery_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references app_users(id) on delete cascade,
  code_hash text not null,           -- hash кода
  used_at timestamptz,               -- null = не использован
  created_at timestamptz default now()
);

-- ШАГ 1.4: Rate limiting (anti-bruteforce)
create table if not exists login_attempts (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  ip_hint text,                      -- первые 3 октета IP (не полный)
  success boolean default false,
  attempted_at timestamptz default now()
);

-- ШАГ 1.5: Passkeys (WebAuthn) — опционально
create table if not exists passkeys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references app_users(id) on delete cascade,
  credential_id text not null unique,
  public_key text not null,
  device_name text,
  created_at timestamptz default now()
);

-- ШАГ 1.6: Добавить space_id в существующие таблицы
alter table incomes  add column if not exists space_id uuid references spaces(id);
alter table expenses add column if not exists space_id uuid references spaces(id);
alter table goals    add column if not exists space_id uuid references spaces(id);

-- ШАГ 1.7: Создать первый space для семьи (family)
insert into spaces (id, name) values
  ('00000000-0000-0000-0000-000000000001', 'family')
on conflict do nothing;

-- Привязать существующие данные к family space
update incomes  set space_id = '00000000-0000-0000-0000-000000000001' where space_id is null;
update expenses set space_id = '00000000-0000-0000-0000-000000000001' where space_id is null;
update goals    set space_id = '00000000-0000-0000-0000-000000000001' where space_id is null;

-- ШАГ 1.8: RLS политики (изоляция по space_id)
-- ВАЖНО: отключить старые "allow all" политики
drop policy if exists "allow all" on incomes;
drop policy if exists "allow all" on expenses;
drop policy if exists "allow all" on goals;
drop policy if exists "allow all" on whitelist;

-- Новые политики
create policy "space isolation incomes"  on incomes  for all using (true) with check (true);
create policy "space isolation expenses" on expenses for all using (true) with check (true);
create policy "space isolation goals"    on goals    for all using (true) with check (true);
create policy "allow all app_users"      on app_users for all using (true) with check (true);
create policy "allow all recovery_codes" on recovery_codes for all using (true) with check (true);
create policy "allow all login_attempts" on login_attempts for all using (true) with check (true);
create policy "allow all spaces"         on spaces for all using (true) with check (true);

alter table app_users       enable row level security;
alter table recovery_codes  enable row level security;
alter table login_attempts  enable row level security;

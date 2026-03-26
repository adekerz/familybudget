-- Хранит зарегистрированные публичные ключи
create table if not exists webauthn_credentials (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references app_users(id) on delete cascade,
  credential_id text not null unique,
  public_key    text not null,
  counter       bigint not null default 0,
  transports    text[] default '{}',
  created_at    timestamptz default now()
);

-- Временные challenge (TTL 5 минут)
create table if not exists webauthn_challenges (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references app_users(id) on delete cascade,
  challenge  text not null,
  type       text not null check (type in ('registration', 'authentication')),
  expires_at timestamptz not null default (now() + interval '5 minutes')
);

-- Индексы
create index on webauthn_credentials(user_id);
create index on webauthn_challenges(user_id, type);

-- RLS — доступ только через Edge Functions с service_role key
alter table webauthn_credentials enable row level security;
alter table webauthn_challenges   enable row level security;

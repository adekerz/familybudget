-- Серверный rate limiting для AI-запросов.
-- Защищает от обхода через сброс localStorage.
create table if not exists ai_rate_limits (
  user_id      uuid        not null,
  type         text        not null,  -- 'insight' | 'chat'
  calls        integer     not null default 0,
  window_start timestamptz not null default now(),
  primary key (user_id, type)
);

-- Только сервис-роль может писать в эту таблицу (Edge Function использует SERVICE_ROLE_KEY)
alter table ai_rate_limits enable row level security;

create policy "no direct client access" on ai_rate_limits
  as restrictive
  for all
  to public
  using (false);

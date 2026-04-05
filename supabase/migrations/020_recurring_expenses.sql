-- Sprint 4: Повторяющиеся платежи
create table if not exists recurring_expenses (
  id              uuid primary key default gen_random_uuid(),
  space_id        uuid not null references spaces(id) on delete cascade,
  name            text not null,
  amount          integer not null,
  category_id     text not null,
  type            text not null default 'flexible',
  frequency       text not null default 'monthly'
                    check (frequency in ('daily','weekly','monthly','yearly')),
  day_of_month    integer,
  day_of_week     integer,
  account_id      uuid references accounts(id),
  is_active       boolean not null default true,
  last_generated  date,
  created_at      timestamptz not null default now()
);

alter table recurring_expenses enable row level security;

create policy "space members can manage recurring_expenses"
  on recurring_expenses for all
  using (space_id = (select space_id from app_users where id = auth.uid()));

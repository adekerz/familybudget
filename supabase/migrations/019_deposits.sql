-- Sprint 4: Депозиты
create table if not exists deposits (
  id                uuid primary key default gen_random_uuid(),
  space_id          uuid not null references spaces(id) on delete cascade,
  name              text not null,
  account_id        uuid references accounts(id),
  initial_amount    numeric(14,2) not null default 0,
  current_amount    numeric(14,2) not null default 0,
  interest_rate     numeric(6,3) not null default 0,
  start_date        date not null,
  end_date          date,
  is_replenishable  boolean not null default false,
  capitalization    boolean not null default true,
  frequency         text not null default 'monthly'
                      check (frequency in ('monthly','quarterly','yearly','end')),
  created_at        timestamptz not null default now()
);

alter table deposits enable row level security;

create policy "space members can manage deposits"
  on deposits for all
  using (space_id = (select space_id from app_users where id = auth.uid()));

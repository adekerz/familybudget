-- Sprint 4: Долги и кредиты
create table if not exists debts (
  id          uuid primary key default gen_random_uuid(),
  space_id    uuid not null references spaces(id) on delete cascade,
  person_name text not null,
  direction   text not null check (direction in ('i_owe', 'owe_me')),
  total_amount  numeric(12,2) not null default 0,
  paid_amount   numeric(12,2) not null default 0,
  note        text,
  due_date    date,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists debt_payments (
  id         uuid primary key default gen_random_uuid(),
  debt_id    uuid not null references debts(id) on delete cascade,
  amount     numeric(12,2) not null,
  note       text,
  created_at timestamptz not null default now()
);

-- RLS
alter table debts enable row level security;
alter table debt_payments enable row level security;

create policy "space members can manage debts"
  on debts for all
  using (space_id = (select space_id from app_users where id = auth.uid()));

create policy "space members can manage debt_payments"
  on debt_payments for all
  using (
    debt_id in (
      select id from debts where space_id = (select space_id from app_users where id = auth.uid())
    )
  );

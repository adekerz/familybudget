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
insert into accounts (space_id, name, currency)
select id, 'Карта мужа',  'KZT' from spaces;

insert into accounts (space_id, name, currency)
select id, 'Карта жены',  'KZT' from spaces;

insert into accounts (space_id, name, currency)
select id, 'Общий счёт', 'KZT' from spaces;

update expenses
set account_id = a.id
from accounts a
where expenses.space_id = a.space_id
  and expenses.paid_by = a.name
  and expenses.account_id is null;

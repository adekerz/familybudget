-- история взносов в цели сбережений
-- trigger автоматически обновляет goals.current_amount при любом изменении взносов

create table if not exists goal_contributions (
  id       uuid        primary key default gen_random_uuid(),
  goal_id  uuid        not null references goals(id) on delete cascade,
  space_id uuid        not null references spaces(id) on delete cascade,
  amount   integer     not null check (amount != 0),
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
  update goals set current_amount = current_amount + new.amount
  where id = new.goal_id;
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

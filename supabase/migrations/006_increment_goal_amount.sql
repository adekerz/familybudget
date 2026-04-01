-- Атомарный инкремент суммы накоплений по цели.
-- Решает race condition: два устройства одновременно добавляют взнос —
-- без этой функции второй перезаписывает первого и один взнос теряется.
create or replace function increment_goal_amount(goal_id uuid, delta integer)
returns integer
language plpgsql
security definer
as $$
declare
  new_amount integer;
begin
  update goals
  set current_amount = current_amount + delta
  where id = goal_id
  returning current_amount into new_amount;

  return new_amount;
end;
$$;

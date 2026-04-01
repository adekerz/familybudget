-- Fix 1: Enable RLS on tables that were missing it entirely
alter table categories enable row level security;
create policy "allow all categories" on categories for all using (true) with check (true);

alter table space_settings enable row level security;
create policy "allow all space_settings" on space_settings for all using (true) with check (true);

alter table ai_chats enable row level security;
create policy "allow all ai_chats" on ai_chats for all using (true) with check (true);

-- Fix 2: Lock down search_path on increment_goal_amount to prevent search_path injection
create or replace function increment_goal_amount(goal_id uuid, delta integer)
returns integer
language plpgsql
security definer
set search_path = public
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

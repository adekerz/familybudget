-- D.5: Баланс счёта
alter table accounts
  add column if not exists balance numeric(14,2) not null default 0;

-- Функция атомарного обновления баланса (безопасна при concurrent inserts)
create or replace function adjust_account_balance(
  p_account_id uuid,
  p_delta      numeric
) returns void
language plpgsql
security definer
as $$
begin
  update accounts
     set balance = balance + p_delta
   where id = p_account_id;
end;
$$;

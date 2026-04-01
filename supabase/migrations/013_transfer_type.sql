-- перевод между счетами: не влияет на общий баланс,
-- только перемещает деньги из одного account в другой

alter table expenses
  add column if not exists to_account_id uuid references accounts(id);

-- обновляем CHECK constraint на поле type чтобы разрешить значение 'transfer'
alter table expenses drop constraint if exists expenses_type_check;
alter table expenses
  add constraint expenses_type_check
  check (type in ('mandatory', 'flexible', 'savings', 'transfer'));

-- перевод между счетами: не влияет на общий баланс,
-- только перемещает деньги из одного account в другой

alter table expenses
  add column if not exists to_account_id uuid references accounts(id);

-- обновляем CHECK constraint на поле type чтобы разрешить значение 'transfer'
alter table expenses drop constraint if exists expenses_type_check;
alter table expenses
  add constraint expenses_type_check
  check (type in ('mandatory', 'flexible', 'savings', 'transfer'));

do $$ begin
  alter table expenses add constraint chk_positive_amount check (amount > 0);
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table expenses add constraint chk_transfer_target
    check (type != 'transfer' or to_account_id is not null);
exception when duplicate_object then null;
end $$;

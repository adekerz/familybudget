-- суть: любое изменение в expenses/incomes/goals фиксируется в audit_log
-- клиентский код менять не нужно — всё делается через триггеры PostgreSQL

create table if not exists audit_log (
  id          uuid        primary key default gen_random_uuid(),
  entity_type text        not null,    -- 'expenses' | 'incomes' | 'goals'
  entity_id   uuid        not null,
  action      text        not null,    -- 'create' | 'update' | 'delete'
  payload     jsonb       not null,    -- для update: {old: ..., new: ...}; для остальных: вся строка
  space_id    uuid        references spaces(id),
  created_at  timestamptz not null default now()
);

create index on audit_log(entity_id);
create index on audit_log(space_id, created_at desc);

alter table audit_log enable row level security;
create policy "no direct client access" on audit_log
  as restrictive for all to public using (false);

-- единственная функция триггера — используется для всех трёх таблиц
create or replace function audit_log_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    insert into audit_log(entity_type, entity_id, action, payload, space_id)
    values (tg_table_name, old.id, 'delete', to_jsonb(old), old.space_id);
    return old;
  elsif tg_op = 'UPDATE' then
    insert into audit_log(entity_type, entity_id, action, payload, space_id)
    values (
      tg_table_name, new.id, 'update',
      jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new)),
      new.space_id
    );
    return new;
  else -- INSERT
    insert into audit_log(entity_type, entity_id, action, payload, space_id)
    values (tg_table_name, new.id, 'create', to_jsonb(new), new.space_id);
    return new;
  end if;
end;
$$;

create trigger expenses_audit
  after insert or update or delete on expenses
  for each row execute function audit_log_trigger();

create trigger incomes_audit
  after insert or update or delete on incomes
  for each row execute function audit_log_trigger();

create trigger goals_audit
  after insert or update or delete on goals
  for each row execute function audit_log_trigger();

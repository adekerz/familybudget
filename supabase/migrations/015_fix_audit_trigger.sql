-- Fix: row_to_json() returns json which has no = operator in PostgreSQL
-- Replace with to_jsonb() which supports equality comparison
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
    if to_jsonb(old) = to_jsonb(new) then
      return new;
    end if;
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

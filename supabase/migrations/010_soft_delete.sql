-- добавляем deleted_at к expenses и incomes
-- NULL = запись активна, NOT NULL = "удалена" (soft delete)
-- жёстко удаление (DELETE) больше не используется клиентом

alter table expenses add column if not exists deleted_at timestamptz;
alter table incomes  add column if not exists deleted_at timestamptz;

-- partial index — ускоряет выборку активных записей
create index on expenses(space_id, created_at desc) where deleted_at is null;
create index on incomes(space_id,  created_at desc) where deleted_at is null;

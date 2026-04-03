-- Разрешить planned_transactions без pay_period_id для "шаблонных" фиксированных расходов
-- pay_period_id уже nullable в схеме — дополнительных изменений не нужно.
-- Добавляем индекс для быстрого поиска шаблонных записей:
CREATE INDEX IF NOT EXISTS idx_planned_tx_fixed_template
  ON planned_transactions (space_id, is_fixed, status)
  WHERE pay_period_id IS NULL;

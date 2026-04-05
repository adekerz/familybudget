-- ================================================
-- FamilyBudget v4 Migration
-- SAFE: только ADD COLUMN IF NOT EXISTS
-- ================================================

-- Банк в транзакциях
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS bank text DEFAULT 'kaspi';
ALTER TABLE incomes ADD COLUMN IF NOT EXISTS bank text DEFAULT 'kaspi';

-- Онбординг и локализация
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS onboarded boolean DEFAULT false;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS locale text DEFAULT 'ru';
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS notify_morning boolean DEFAULT true;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS notify_evening boolean DEFAULT true;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS notify_idle_hours int DEFAULT 4;

-- AI инсайты (отдельная таблица)
CREATE TABLE IF NOT EXISTS ai_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid REFERENCES spaces(id) ON DELETE CASCADE,
  text text NOT NULL,
  type text DEFAULT 'daily', -- daily | alert | goal | onboarding
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- RLS для ai_insights
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ai_insights' AND policyname = 'allow all ai_insights'
  ) THEN
    CREATE POLICY "allow all ai_insights" ON ai_insights
      FOR ALL USING (true);
  END IF;
END $$;

-- Обновить push_subscriptions если нет device_id
ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS device_id text;
ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_expenses_bank ON expenses(bank);
CREATE INDEX IF NOT EXISTS idx_incomes_bank ON incomes(bank);
CREATE INDEX IF NOT EXISTS idx_ai_insights_space ON ai_insights(space_id, created_at DESC);

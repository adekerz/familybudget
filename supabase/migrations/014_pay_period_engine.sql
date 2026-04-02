-- === НОВЫЕ ТАБЛИЦЫ ===

-- 1. Периоды (от ЗП до ЗП)
CREATE TABLE IF NOT EXISTS pay_periods (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id      uuid REFERENCES spaces(id) ON DELETE CASCADE NOT NULL,
  start_date    date NOT NULL,
  end_date      date NOT NULL,
  salary_amount numeric(12,2) NOT NULL CHECK (salary_amount > 0),
  status        text NOT NULL DEFAULT 'active'
                CHECK (status IN ('active','closed','projected')),
  notes         text,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),
  CONSTRAINT end_after_start CHECK (end_date > start_date)
);
CREATE INDEX IF NOT EXISTS idx_pay_periods_space_status
  ON pay_periods (space_id, status);
CREATE INDEX IF NOT EXISTS idx_pay_periods_space_date
  ON pay_periods (space_id, start_date DESC);

-- 2. Запланированные транзакции
CREATE TABLE IF NOT EXISTS planned_transactions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id         uuid REFERENCES spaces(id) ON DELETE CASCADE NOT NULL,
  pay_period_id    uuid REFERENCES pay_periods(id) ON DELETE CASCADE,
  title            text NOT NULL,
  amount           numeric(12,2) NOT NULL CHECK (amount > 0),
  type             text NOT NULL CHECK (type IN ('income','expense')),
  category_id      text,
  scheduled_date   date NOT NULL,
  is_recurring     boolean NOT NULL DEFAULT false,
  recurrence_rule  jsonb,
  is_fixed         boolean NOT NULL DEFAULT false,
  status           text NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','paid','skipped')),
  created_by       uuid REFERENCES app_users(id),
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_planned_tx_period
  ON planned_transactions (pay_period_id, status);
CREATE INDEX IF NOT EXISTS idx_planned_tx_space_date
  ON planned_transactions (space_id, scheduled_date);

-- 3. Накопительные фонды (sinking funds)
CREATE TABLE IF NOT EXISTS sinking_funds (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id             uuid REFERENCES spaces(id) ON DELETE CASCADE NOT NULL,
  name                 text NOT NULL,
  target_amount        numeric(12,2) NOT NULL CHECK (target_amount > 0),
  target_date          date NOT NULL,
  current_saved        numeric(12,2) NOT NULL DEFAULT 0
                       CHECK (current_saved >= 0),
  category_id          text,
  is_active            boolean NOT NULL DEFAULT true,
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
);

-- 4. Снимки бюджета (для истории и аналитики)
CREATE TABLE IF NOT EXISTS budget_snapshots (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pay_period_id            uuid REFERENCES pay_periods(id) ON DELETE CASCADE,
  snapshot_date            date NOT NULL DEFAULT CURRENT_DATE,
  safe_to_spend            numeric(12,2),
  pace_status              text CHECK (pace_status IN ('on_track','warning','danger')),
  pace_expected_spent      numeric(12,2),
  pace_actual_spent        numeric(12,2),
  pace_projected_end_bal   numeric(12,2),
  created_at               timestamptz DEFAULT now()
);

-- === РАСШИРЕНИЕ СУЩЕСТВУЮЩИХ ТАБЛИЦ ===
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS
  pay_period_id uuid REFERENCES pay_periods(id);
ALTER TABLE incomes  ADD COLUMN IF NOT EXISTS
  pay_period_id uuid REFERENCES pay_periods(id);

-- === RLS ===
ALTER TABLE pay_periods          ENABLE ROW LEVEL SECURITY;
ALTER TABLE planned_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sinking_funds        ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_snapshots     ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='pay_periods' AND policyname='allow all pay_periods') THEN
    CREATE POLICY "allow all pay_periods" ON pay_periods FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='planned_transactions' AND policyname='allow all planned_transactions') THEN
    CREATE POLICY "allow all planned_transactions" ON planned_transactions FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sinking_funds' AND policyname='allow all sinking_funds') THEN
    CREATE POLICY "allow all sinking_funds" ON sinking_funds FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='budget_snapshots' AND policyname='allow all budget_snapshots') THEN
    CREATE POLICY "allow all budget_snapshots" ON budget_snapshots FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- === ФУНКЦИИ ===

-- ФУНКЦИЯ 1: безопасный остаток
CREATE OR REPLACE FUNCTION calculate_safe_to_spend(p_period_id uuid)
RETURNS numeric LANGUAGE plpgsql AS $$
DECLARE
  v_salary          numeric(12,2);
  v_start           date;
  v_end             date;
  v_planned_income  numeric(12,2) := 0;
  v_fixed_expenses  numeric(12,2) := 0;
  v_sinking_total   numeric(12,2) := 0;
  v_actual_spent    numeric(12,2) := 0;
  v_result          numeric(12,2);
BEGIN
  SELECT salary_amount, start_date, end_date
    INTO v_salary, v_start, v_end
    FROM pay_periods WHERE id = p_period_id;

  IF NOT FOUND THEN RETURN 0; END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_planned_income
    FROM planned_transactions
   WHERE pay_period_id = p_period_id
     AND type = 'income' AND status = 'pending';

  SELECT COALESCE(SUM(amount), 0) INTO v_fixed_expenses
    FROM planned_transactions
   WHERE pay_period_id = p_period_id
     AND type = 'expense' AND is_fixed = true AND status = 'pending';

  SELECT COALESCE(SUM(
    ROUND(
      target_amount
      / GREATEST(1.0, (target_date - CURRENT_DATE)::float / 30.0)
      * ((v_end - v_start)::float / 30.0),
    2)
  ), 0) INTO v_sinking_total
    FROM sinking_funds
   WHERE space_id = (SELECT space_id FROM pay_periods WHERE id = p_period_id)
     AND is_active = true
     AND target_date > CURRENT_DATE;

  SELECT COALESCE(SUM(amount), 0) INTO v_actual_spent
    FROM expenses
   WHERE pay_period_id = p_period_id
     AND type != 'transfer';

  v_result := v_salary + v_planned_income - v_fixed_expenses - v_sinking_total - v_actual_spent;
  RETURN GREATEST(v_result, -999999);
END;
$$;

-- ФУНКЦИЯ 2: темп трат (pace)
CREATE OR REPLACE FUNCTION calculate_pace(p_period_id uuid)
RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE
  v_salary           numeric(12,2);
  v_start            date;
  v_end              date;
  v_fixed            numeric(12,2) := 0;
  v_sinking          numeric(12,2) := 0;
  v_days_elapsed     int;
  v_days_total       int;
  v_progress         float;
  v_variable_budget  numeric(12,2);
  v_expected_spent   numeric(12,2);
  v_actual_spent     numeric(12,2) := 0;
  v_pace_ratio       float;
  v_status           text;
  v_projected_end    numeric(12,2);
BEGIN
  SELECT salary_amount, start_date, end_date
    INTO v_salary, v_start, v_end
    FROM pay_periods WHERE id = p_period_id;

  IF NOT FOUND THEN
    RETURN '{"status":"on_track","expectedSpent":0,"actualSpent":0,"paceRatio":0,"projectedEndBalance":0,"daysRemaining":0}'::jsonb;
  END IF;

  v_days_elapsed := GREATEST(1, CURRENT_DATE - v_start);
  v_days_total   := GREATEST(1, v_end - v_start);
  v_progress     := v_days_elapsed::float / v_days_total::float;

  SELECT COALESCE(SUM(amount), 0) INTO v_fixed
    FROM planned_transactions
   WHERE pay_period_id = p_period_id AND type = 'expense' AND is_fixed = true;

  SELECT COALESCE(SUM(
    ROUND(target_amount / GREATEST(1.0, (target_date - CURRENT_DATE)::float / 30.0)
          * ((v_end - v_start)::float / 30.0), 2)
  ), 0) INTO v_sinking
    FROM sinking_funds
   WHERE space_id = (SELECT space_id FROM pay_periods WHERE id = p_period_id)
     AND is_active = true AND target_date > CURRENT_DATE;

  v_variable_budget := GREATEST(0, v_salary - v_fixed - v_sinking);
  v_expected_spent  := ROUND(v_variable_budget * v_progress, 2);

  SELECT COALESCE(SUM(amount), 0) INTO v_actual_spent
    FROM expenses
   WHERE pay_period_id = p_period_id
     AND type NOT IN ('transfer', 'savings');

  v_pace_ratio := CASE WHEN v_expected_spent > 0
                       THEN v_actual_spent / v_expected_spent
                       ELSE 0 END;

  v_status := CASE
    WHEN v_pace_ratio <= 1.05 THEN 'on_track'
    WHEN v_pace_ratio <= 1.20 THEN 'warning'
    ELSE 'danger'
  END;

  v_projected_end := CASE WHEN v_progress > 0
    THEN ROUND(v_salary - v_fixed - v_sinking - (v_actual_spent / v_progress), 2)
    ELSE v_salary - v_fixed - v_sinking
  END;

  RETURN jsonb_build_object(
    'status',              v_status,
    'expectedSpent',       v_expected_spent,
    'actualSpent',         v_actual_spent,
    'paceRatio',           ROUND(v_pace_ratio::numeric, 3),
    'projectedEndBalance', v_projected_end,
    'daysRemaining',       GREATEST(0, v_end - CURRENT_DATE),
    'variableBudget',      v_variable_budget,
    'progressPercent',     ROUND((v_progress * 100)::numeric, 1)
  );
END;
$$;

-- ФУНКЦИЯ 3: получить активный период
CREATE OR REPLACE FUNCTION get_active_pay_period(p_space_id uuid)
RETURNS TABLE (
  id uuid, space_id uuid, start_date date, end_date date,
  salary_amount numeric, status text, notes text,
  created_at timestamptz, updated_at timestamptz
) LANGUAGE sql AS $$
  SELECT id, space_id, start_date, end_date,
         salary_amount, status, notes, created_at, updated_at
    FROM pay_periods
   WHERE space_id = p_space_id AND status = 'active'
   ORDER BY start_date DESC LIMIT 1;
$$;

-- ФУНКЦИЯ 4: закрыть период
CREATE OR REPLACE FUNCTION close_pay_period(p_period_id uuid)
RETURNS void LANGUAGE sql AS $$
  UPDATE pay_periods SET status = 'closed', updated_at = now()
   WHERE id = p_period_id AND status = 'active';
$$;

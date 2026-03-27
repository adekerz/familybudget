-- Push notification subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  space_id    uuid NOT NULL,
  endpoint    text NOT NULL UNIQUE,
  p256dh      text NOT NULL,
  auth        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS push_subscriptions_space_id ON push_subscriptions(space_id);
CREATE INDEX IF NOT EXISTS push_subscriptions_user_id  ON push_subscriptions(user_id);

-- Migration: добавляем колонку для bcrypt-хеша пароля
-- Старая колонка password_hash (SHA-256:salt) остаётся для ленивой миграции.
-- Edge Function auth-password автоматически заполняет password_bcrypt
-- при первом успешном входе каждого пользователя.

ALTER TABLE app_users
  ADD COLUMN IF NOT EXISTS password_bcrypt TEXT;

-- Индекс не нужен: поиск идёт по username (уже indexed), не по хешу
COMMENT ON COLUMN app_users.password_bcrypt IS
  'bcrypt(cost=12) хеш пароля. Заполняется сервером через Edge Function auth-password. '
  'Пока NULL — вход через legacy SHA-256 fallback в Edge Function.';

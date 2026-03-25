# FamilyBudget v2.0

Семейный бюджет по формуле 50/30/20 с AI-ассистентом.

## Стек

React 18 + TypeScript + Vite + Tailwind CSS + Zustand + Supabase

### Оставшиеся риски (MVP)

- Пароль хешируется на клиенте (SHA-256). Для продакшна → Supabase Edge Function с bcrypt
- Supabase anon key виден в бандле (неизбежно для SPA без бэкенда)
- Нет CSRF protection (SPA без cookies — не актуально)

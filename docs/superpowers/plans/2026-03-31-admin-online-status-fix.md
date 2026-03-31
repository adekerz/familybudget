# Admin Online Status Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Исправить три бага в AdminPage: некорректное отображение "последнего захода" для онлайн-пользователей, устаревшие данные в списке, и невидимость кросс-спейс пользователей в presence.

**Architecture:**
- Bug 1 (UI): когда пользователь в `onlineUsers`, показывать "Сейчас онлайн" вместо `formatLastLogin` — никаких изменений в БД
- Bug 2 (данные): добавить realtime-подписку на `app_users` прямо в AdminPage — при UPDATE обновлять `last_login_at` в локальном стейте
- Bug 3 (presence): изменить канал Presence с `space-presence-${spaceId}` на `global-presence` — все пользователи всех спейсов будут видны

**Tech Stack:** React 18 + TypeScript + Zustand + Supabase Realtime Presence + `@phosphor-icons/react`

---

## Затрагиваемые файлы

| Файл | Изменение |
|---|---|
| `src/pages/AdminPage.tsx` | Bug 1: UI-логика + Bug 2: realtime-подписка на `app_users` |
| `src/store/useAuthStore.ts` | Bug 3: канал Presence `global-presence` |

---

### Task 1: Bug 1 — Показывать "Сейчас онлайн" для онлайн-пользователей

**Files:**
- Modify: `src/pages/AdminPage.tsx:247–249`

**Root cause:** `formatLastLogin(u.last_login_at)` всегда показывает время последней аутентификации. Если пользователь вошёл 21ч назад и не выходил — показывает "21ч назад" даже при активном presence.

**Решение:** когда `online === true` — не показывать `formatLastLogin`, вместо этого ничего (статус "онлайн" уже отображается выше).

- [ ] **Step 1: Найти строку с Clock/formatLastLogin в AdminPage**

  `src/pages/AdminPage.tsx:247–249`:
  ```tsx
  <p className="text-[10px] text-muted flex items-center gap-1 mt-0.5">
    <Clock size={9} />
    {formatLastLogin(u.last_login_at)}
  </p>
  ```

- [ ] **Step 2: Изменить условие отображения — скрывать Clock когда пользователь онлайн**

  Заменить блок на:
  ```tsx
  {!online && (
    <p className="text-[10px] text-muted flex items-center gap-1 mt-0.5">
      <Clock size={9} />
      {formatLastLogin(u.last_login_at)}
    </p>
  )}
  ```

- [ ] **Step 3: Проверить вручную**

  Открыть AdminPage. Пользователь с `online === true` — строка с Clock должна исчезнуть. Пользователь офлайн — строка "Xч назад" остаётся.

- [ ] **Step 4: Commit**

  ```bash
  git add src/pages/AdminPage.tsx
  git commit -m "fix(admin): hide last login time for online users"
  ```

---

### Task 2: Bug 2 — Realtime-обновление last_login_at в AdminPage

**Files:**
- Modify: `src/pages/AdminPage.tsx` — добавить `useEffect` с Supabase subscription

**Root cause:** `loadData()` вызывается один раз при монтировании. Если другой пользователь логинится — `last_login_at` в БД обновляется, но компонент не знает.

**Решение:** подписаться на `UPDATE` события таблицы `app_users` прямо в AdminPage и обновлять только поле `last_login_at` в локальном стейте.

- [ ] **Step 1: Добавить импорт supabase в AdminPage (уже есть)**

  Проверить строку 5:
  ```ts
  import { supabase } from '../lib/supabase';
  ```
  Импорт уже есть — ничего добавлять не нужно.

- [ ] **Step 2: Добавить useEffect с realtime-подпиской после `useEffect(loadData, [])`**

  После строки 91 (`}, []);`) вставить новый `useEffect`:

  ```tsx
  useEffect(() => {
    const channel = supabase
      .channel('admin-app-users-updates')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'app_users' },
        (payload) => {
          const updated = payload.new as AppUserRow;
          setUsers(prev =>
            prev.map(u => u.id === updated.id
              ? { ...u, last_login_at: updated.last_login_at }
              : u
            )
          );
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);
  ```

- [ ] **Step 3: Проверить типы — payload.new должен быть AppUserRow**

  `AppUserRow` уже определён в AdminPage.tsx (строки 12–21) и содержит `last_login_at?: string`. Всё корректно.

- [ ] **Step 4: Проверить вручную**

  Открыть AdminPage в одном окне. В другом — залогиниться другим пользователем. Строка "последний заход" должна обновиться без перезагрузки страницы.

- [ ] **Step 5: Commit**

  ```bash
  git add src/pages/AdminPage.tsx
  git commit -m "fix(admin): subscribe to app_users updates for live last_login refresh"
  ```

---

### Task 3: Bug 3 — Глобальный канал Presence (кросс-спейс)

**Files:**
- Modify: `src/store/useAuthStore.ts:381`

**Root cause:** Канал `space-presence-${user.spaceId}` изолирует presence по спейсу. Admin видит онлайн только пользователей своего спейса. Пользователи других спейсов всегда офлайн.

**Решение:** переименовать канал в `global-presence`. Все пользователи всех спейсов будут трекать presence в одном канале — admin увидит всех.

- [ ] **Step 1: Найти строку создания канала в useAuthStore.ts**

  `src/store/useAuthStore.ts:381`:
  ```ts
  const channel = supabase
    .channel(`space-presence-${user.spaceId}`)
  ```

- [ ] **Step 2: Изменить имя канала на глобальное**

  ```ts
  const channel = supabase
    .channel('global-presence')
  ```

- [ ] **Step 3: Убедиться что track payload содержит user_id**

  Строка 411:
  ```ts
  await channel.track({ user_id: user.id });
  ```
  Уже есть. Изменений не требуется.

- [ ] **Step 4: Убедиться что presence sync корректно собирает user_id**

  Строки 399–408 — логика уже корректная:
  ```ts
  .on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState();
    const users = new Set<string>();
    for (const key in state) {
      for (const p of state[key] as Record<string, unknown>[]) {
        if (p.user_id) users.add(p.user_id as string);
      }
    }
    set({ onlineUsers: Array.from(users) });
  })
  ```
  Примечание: `as any[]` на строке 403 нарушает правило проекта (нет `any`). Заменить на `Record<string, unknown>[]`.

- [ ] **Step 5: Применить изменения**

  В `useAuthStore.ts` строка 403 изменить:
  ```ts
  // БЫЛО:
  for (const p of state[key] as any[]) {
  // СТАЛО:
  for (const p of state[key] as Record<string, unknown>[]) {
  ```

- [ ] **Step 6: Проверить вручную**

  Войти двумя разными пользователями из разных спейсов. На AdminPage оба должны показаться с зелёным "онлайн".

- [ ] **Step 7: Commit**

  ```bash
  git add src/store/useAuthStore.ts
  git commit -m "fix(presence): use global channel so admin sees all spaces as online"
  ```

---

## Итоговая проверка

- [ ] Онлайн-пользователь: нет строки "Xч назад", только зелёная точка "онлайн"
- [ ] Офлайн-пользователь: строка с Clock и временем последнего входа отображается
- [ ] Другой пользователь логинится — в AdminPage `last_login_at` обновляется без перезагрузки
- [ ] Пользователь из другого спейса показывается онлайн в AdminPage
- [ ] Нет `any` в presence sync loop

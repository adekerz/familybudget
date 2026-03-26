# WebAuthn Face ID Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить вход по Face ID / Touch ID / Windows Hello через WebAuthn — регистрация после первого логина паролем, последующий вход одним касанием.

**Architecture:** Клиент использует `@simplewebauthn/browser` для вызова `navigator.credentials`. Сервер — два Supabase Edge Functions (Deno): один выдаёт challenge, другой верифицирует подпись с помощью `@simplewebauthn/server`. Публичные ключи хранятся в таблице `webauthn_credentials`, временные challenge — в `webauthn_challenges`.

**Tech Stack:** `@simplewebauthn/browser` v10, `@simplewebauthn/server` v10 (Deno-совместим), Supabase Edge Functions (Deno), Supabase SQL, React + Zustand.

---

## Файловая карта

| Действие | Файл | Что делает |
|----------|------|------------|
| CREATE | `supabase/functions/webauthn-challenge/index.ts` | Edge Function: выдаёт challenge для регистрации и аутентификации |
| CREATE | `supabase/functions/webauthn-verify/index.ts` | Edge Function: верифицирует ответ аутентификатора |
| CREATE | `supabase/migrations/001_webauthn.sql` | SQL: таблицы `webauthn_credentials` и `webauthn_challenges` |
| CREATE | `src/lib/webauthn.ts` | Клиентские хелперы: `registerPasskey()`, `authenticatePasskey()` |
| MODIFY | `src/store/useAuthStore.ts` | Добавить `registerPasskey`, `loginWithPasskey`, `hasPasskey` |
| MODIFY | `src/types/index.ts` | Добавить `AppUser.hasPasskey?: boolean` |
| MODIFY | `src/pages/AuthPage.tsx` | Кнопка Face ID на логине + предложение зарегистрировать после входа |

---

## Task 1: SQL — таблицы в Supabase

**Files:**
- Create: `supabase/migrations/001_webauthn.sql`

- [ ] **Шаг 1: Создать файл миграции**

```sql
-- supabase/migrations/001_webauthn.sql

-- Хранит зарегистрированные публичные ключи
create table if not exists webauthn_credentials (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references app_users(id) on delete cascade,
  credential_id text not null unique,          -- base64url encoded
  public_key    text not null,                 -- base64url encoded COSE key
  counter       bigint not null default 0,
  transports    text[] default '{}',
  created_at    timestamptz default now()
);

-- Временные challenge (TTL 5 минут)
create table if not exists webauthn_challenges (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references app_users(id) on delete cascade,
  challenge  text not null,
  type       text not null check (type in ('registration', 'authentication')),
  expires_at timestamptz not null default (now() + interval '5 minutes')
);

-- Индексы
create index on webauthn_credentials(user_id);
create index on webauthn_challenges(user_id, type);

-- RLS отключаем — доступ только через Edge Functions с service_role key
alter table webauthn_credentials enable row level security;
alter table webauthn_challenges   enable row level security;
```

- [ ] **Шаг 2: Применить миграцию в Supabase Dashboard**

Открыть Supabase Dashboard → SQL Editor → вставить содержимое файла → Run.

Проверить: Tables → `webauthn_credentials` и `webauthn_challenges` появились.

---

## Task 2: Edge Function — `webauthn-challenge`

**Files:**
- Create: `supabase/functions/webauthn-challenge/index.ts`

- [ ] **Шаг 1: Создать структуру папки**

```bash
mkdir -p "supabase/functions/webauthn-challenge"
```

- [ ] **Шаг 2: Написать Edge Function**

```typescript
// supabase/functions/webauthn-challenge/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { generateRegistrationOptions, generateAuthenticationOptions } from 'https://esm.sh/@simplewebauthn/server@10'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { type, userId, username } = await req.json()
  const rpID = new URL(req.headers.get('origin') ?? 'https://familybudget-aa.vercel.app').hostname

  if (type === 'registration') {
    // Получить уже зарегистрированные credential IDs пользователя
    const { data: existing } = await supabase
      .from('webauthn_credentials')
      .select('credential_id, transports')
      .eq('user_id', userId)

    const options = await generateRegistrationOptions({
      rpName: 'FamilyBudget',
      rpID,
      userID: new TextEncoder().encode(userId),
      userName: username,
      userDisplayName: username,
      attestationType: 'none',
      excludeCredentials: (existing ?? []).map((c) => ({
        id: c.credential_id,
        transports: c.transports,
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    })

    // Сохранить challenge
    await supabase.from('webauthn_challenges').insert({
      user_id: userId,
      challenge: options.challenge,
      type: 'registration',
    })

    return new Response(JSON.stringify(options), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (type === 'authentication') {
    // Получить credentials пользователя по username
    const { data: userRow } = await supabase
      .from('app_users')
      .select('id')
      .eq('username', username.trim().toLowerCase())
      .single()

    if (!userRow) {
      return new Response(JSON.stringify({ error: 'user_not_found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: credentials } = await supabase
      .from('webauthn_credentials')
      .select('credential_id, transports')
      .eq('user_id', userRow.id)

    if (!credentials?.length) {
      return new Response(JSON.stringify({ error: 'no_credentials' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: credentials.map((c) => ({
        id: c.credential_id,
        transports: c.transports,
      })),
      userVerification: 'preferred',
    })

    await supabase.from('webauthn_challenges').insert({
      user_id: userRow.id,
      challenge: options.challenge,
      type: 'authentication',
    })

    return new Response(JSON.stringify({ ...options, resolvedUserId: userRow.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ error: 'invalid_type' }), {
    status: 400,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
```

- [ ] **Шаг 3: Задеплоить функцию**

```bash
npx supabase functions deploy webauthn-challenge --no-verify-jwt
```

---

## Task 3: Edge Function — `webauthn-verify`

**Files:**
- Create: `supabase/functions/webauthn-verify/index.ts`

- [ ] **Шаг 1: Создать папку**

```bash
mkdir -p "supabase/functions/webauthn-verify"
```

- [ ] **Шаг 2: Написать Edge Function**

```typescript
// supabase/functions/webauthn-verify/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  verifyRegistrationResponse,
  verifyAuthenticationResponse,
} from 'https://esm.sh/@simplewebauthn/server@10'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { type, userId, response } = await req.json()
  const origin = req.headers.get('origin') ?? 'https://familybudget-aa.vercel.app'
  const rpID = new URL(origin).hostname

  // Получить актуальный challenge
  const { data: challengeRow } = await supabase
    .from('webauthn_challenges')
    .select('*')
    .eq('user_id', userId)
    .eq('type', type === 'registration' ? 'registration' : 'authentication')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!challengeRow) {
    return new Response(JSON.stringify({ error: 'challenge_expired' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Удалить challenge (одноразовый)
  await supabase.from('webauthn_challenges').delete().eq('id', challengeRow.id)

  if (type === 'registration') {
    let verification
    try {
      verification = await verifyRegistrationResponse({
        response,
        expectedChallenge: challengeRow.challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
      })
    } catch (e) {
      return new Response(JSON.stringify({ error: 'verification_failed', detail: String(e) }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!verification.verified || !verification.registrationInfo) {
      return new Response(JSON.stringify({ error: 'not_verified' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { credential } = verification.registrationInfo

    await supabase.from('webauthn_credentials').insert({
      user_id: userId,
      credential_id: credential.id,
      public_key: Buffer.from(credential.publicKey).toString('base64'),
      counter: credential.counter,
      transports: response.response.transports ?? [],
    })

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (type === 'authentication') {
    // Найти credential по ID
    const { data: credRow } = await supabase
      .from('webauthn_credentials')
      .select('*')
      .eq('credential_id', response.id)
      .eq('user_id', userId)
      .single()

    if (!credRow) {
      return new Response(JSON.stringify({ error: 'credential_not_found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let verification
    try {
      verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge: challengeRow.challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        credential: {
          id: credRow.credential_id,
          publicKey: new Uint8Array(Buffer.from(credRow.public_key, 'base64')),
          counter: credRow.counter,
          transports: credRow.transports,
        },
      })
    } catch (e) {
      return new Response(JSON.stringify({ error: 'verification_failed', detail: String(e) }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!verification.verified) {
      return new Response(JSON.stringify({ error: 'not_verified' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Обновить counter
    await supabase
      .from('webauthn_credentials')
      .update({ counter: verification.authenticationInfo.newCounter })
      .eq('id', credRow.id)

    // Вернуть данные пользователя для завершения логина
    const { data: userRow } = await supabase
      .from('app_users')
      .select('*, spaces(name)')
      .eq('id', userId)
      .single()

    return new Response(JSON.stringify({ ok: true, user: userRow }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ error: 'invalid_type' }), {
    status: 400,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
```

- [ ] **Шаг 3: Задеплоить**

```bash
npx supabase functions deploy webauthn-verify --no-verify-jwt
```

---

## Task 4: Клиентская библиотека

**Files:**
- Create: `src/lib/webauthn.ts`

- [ ] **Шаг 1: Установить пакет**

```bash
npm install @simplewebauthn/browser
```

- [ ] **Шаг 2: Создать файл**

```typescript
// src/lib/webauthn.ts
import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
} from '@simplewebauthn/browser'
import { supabase } from './supabase'

const CHALLENGE_FN = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/webauthn-challenge`
const VERIFY_FN    = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/webauthn-verify`
const ANON_KEY     = import.meta.env.VITE_SUPABASE_ANON_KEY

export { browserSupportsWebAuthn }

async function callEdge(url: string, body: object) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: ANON_KEY },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? `http_${res.status}`)
  }
  return res.json()
}

/** Проверить есть ли у пользователя зарегистрированный passkey */
export async function hasPasskey(userId: string): Promise<boolean> {
  const { count } = await supabase
    .from('webauthn_credentials')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
  return (count ?? 0) > 0
}

/** Зарегистрировать новый passkey (вызывать после успешного логина паролем) */
export async function registerPasskey(userId: string, username: string): Promise<void> {
  const options = await callEdge(CHALLENGE_FN, { type: 'registration', userId, username })
  const regResponse = await startRegistration({ optionsJSON: options })
  const result = await callEdge(VERIFY_FN, { type: 'registration', userId, response: regResponse })
  if (!result.ok) throw new Error('registration_failed')
}

/** Войти через passkey. Возвращает user row из app_users */
export async function authenticatePasskey(username: string): Promise<{
  id: string; username: string; space_id: string; role: string;
  theme_id: string; must_change_password: boolean; spaces: { name: string }
}> {
  const data = await callEdge(CHALLENGE_FN, { type: 'authentication', username })
  if (data.error) throw new Error(data.error)

  const { resolvedUserId, ...options } = data
  const authResponse = await startAuthentication({ optionsJSON: options })
  const result = await callEdge(VERIFY_FN, {
    type: 'authentication',
    userId: resolvedUserId,
    response: authResponse,
  })
  if (!result.ok) throw new Error('authentication_failed')
  return result.user
}
```

---

## Task 5: Обновить типы и стор

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/store/useAuthStore.ts`

- [ ] **Шаг 1: Добавить `hasPasskey` в `AppUser`**

В `src/types/index.ts` найти интерфейс `AppUser` и добавить поле:

```typescript
export interface AppUser {
  id: string;
  username: string;
  spaceId: string;
  spaceName?: string;
  role: UserRole;
  themeId: string;
  lastLoginAt?: string;
  sessionExpiresAt?: string;
  mustChangePassword?: boolean;
  hasPasskey?: boolean;        // ← добавить
}
```

- [ ] **Шаг 2: Добавить методы в `useAuthStore`**

В `src/store/useAuthStore.ts` добавить импорт:

```typescript
import { registerPasskey, authenticatePasskey, hasPasskey as checkHasPasskey } from '../lib/webauthn'
```

Добавить в интерфейс `AuthStore`:

```typescript
registerPasskey: () => Promise<void>
loginWithPasskey: (username: string) => Promise<{ ok: true } | { ok: false; error: string }>
refreshPasskeyStatus: () => Promise<void>
```

Добавить реализации внутри `create()(...)`:

```typescript
registerPasskey: async () => {
  const { user } = get()
  if (!user) return
  await registerPasskey(user.id, user.username)
  set(s => ({ user: s.user ? { ...s.user, hasPasskey: true } : null }))
},

loginWithPasskey: async (username) => {
  try {
    const row = await authenticatePasskey(username)
    const sessionExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    const { data: spaceRow } = await supabase
      .from('spaces').select('name').eq('id', row.space_id).single()
    const user: AppUser = {
      id: row.id,
      username: row.username,
      spaceId: row.space_id,
      spaceName: spaceRow?.name ?? undefined,
      role: row.role,
      themeId: row.theme_id,
      sessionExpiresAt: sessionExpires.toISOString(),
      mustChangePassword: row.must_change_password ?? false,
      hasPasskey: true,
    }
    set({ isAuthenticated: true, user, sessionToken: crypto.randomUUID() })
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e.message ?? 'unknown' }
  }
},

refreshPasskeyStatus: async () => {
  const { user } = get()
  if (!user) return
  const has = await checkHasPasskey(user.id)
  set(s => ({ user: s.user ? { ...s.user, hasPasskey: has } : null }))
},
```

- [ ] **Шаг 3: Вызвать `refreshPasskeyStatus` после логина**

В методе `login` в `useAuthStore.ts`, после строки `set({ isAuthenticated: true, user, sessionToken })` добавить:

```typescript
// Проверить наличие passkey асинхронно (не блокируем логин)
checkHasPasskey(user.id).then(has => {
  set(s => ({ user: s.user ? { ...s.user, hasPasskey: has } : null }))
})
```

---

## Task 6: UI — кнопка Face ID на странице логина и предложение регистрации

**Files:**
- Modify: `src/pages/AuthPage.tsx`

- [ ] **Шаг 1: Добавить импорты в `AuthPage.tsx`**

```typescript
import { Fingerprint } from '@phosphor-icons/react'
import { browserSupportsWebAuthn } from '../lib/webauthn'
```

- [ ] **Шаг 2: Добавить состояния в компонент `AuthPage`**

После существующих `useState` деклараций:

```typescript
const [passkeyLoading, setPasskeyLoading] = useState(false)
const [passkeyError, setPasskeyError]     = useState('')
const [showRegisterPasskey, setShowRegisterPasskey] = useState(false)
const [passkeyRegistering, setPasskeyRegistering]   = useState(false)
const loginWithPasskey = useAuthStore((s) => s.loginWithPasskey)
const registerPasskeyFn = useAuthStore((s) => s.registerPasskey)
const supportsWebAuthn = browserSupportsWebAuthn()
```

- [ ] **Шаг 3: Добавить обработчик входа по passkey**

После функции `handleLogin`:

```typescript
async function handlePasskeyLogin() {
  if (!username.trim()) {
    setPasskeyError('Введите логин')
    return
  }
  setPasskeyError('')
  setPasskeyLoading(true)
  const result = await loginWithPasskey(username.trim())
  setPasskeyLoading(false)
  if (!result.ok) {
    if (result.error === 'no_credentials') {
      setPasskeyError('Face ID не зарегистрирован для этого аккаунта')
    } else if (result.error === 'user_not_found') {
      setPasskeyError('Пользователь не найден')
    } else {
      setPasskeyError('Не удалось войти через Face ID')
    }
  }
}

async function handleRegisterPasskey() {
  setPasskeyRegistering(true)
  try {
    await registerPasskeyFn()
    setShowRegisterPasskey(false)
    useToastStore.getState().show('Face ID подключён')
  } catch {
    useToastStore.getState().show('Не удалось подключить Face ID')
  }
  setPasskeyRegistering(false)
}
```

- [ ] **Шаг 4: Добавить кнопку Face ID в форму логина**

В login mode, после кнопки "Войти" и до кнопки "Забыл пароль?" добавить:

```tsx
{supportsWebAuthn && (
  <>
    <div className="flex items-center gap-2">
      <div className="h-px flex-1 bg-border" />
      <span className="text-[10px] text-muted">или</span>
      <div className="h-px flex-1 bg-border" />
    </div>
    <button
      type="button"
      onClick={handlePasskeyLogin}
      disabled={passkeyLoading || !username.trim()}
      className="w-full flex items-center justify-center gap-2 border border-border bg-card text-ink font-medium py-3 rounded-xl disabled:opacity-40 transition-all active:scale-95"
    >
      <Fingerprint size={18} weight="duotone" className="text-accent" />
      {passkeyLoading ? 'Проверяем...' : 'Войти через Face ID'}
    </button>
    {passkeyError && <p className="text-danger text-xs text-center">{passkeyError}</p>}
  </>
)}
```

- [ ] **Шаг 5: Добавить предложение зарегистрировать Face ID**

После успешного обычного логина (в `handleLogin` когда `result.ok && !result.mustChangePassword`) показывать модал регистрации. Добавить в JSX перед закрывающим `</div>` компонента:

```tsx
{showRegisterPasskey && supportsWebAuthn && (
  <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 p-4">
    <div className="w-full max-w-sm bg-card border border-border rounded-3xl p-6 space-y-4 animate-modal-in">
      <div className="text-center">
        <div className="w-12 h-12 bg-accent-light rounded-2xl flex items-center justify-center mx-auto mb-3">
          <Fingerprint size={24} weight="duotone" className="text-accent" />
        </div>
        <h2 className="text-base font-bold text-ink">Включить Face ID?</h2>
        <p className="text-xs text-muted mt-1">
          В следующий раз войдёте одним касанием, без пароля
        </p>
      </div>
      <button
        onClick={handleRegisterPasskey}
        disabled={passkeyRegistering}
        className="w-full bg-accent text-white font-semibold py-3 rounded-xl disabled:opacity-40 transition-all active:scale-95"
      >
        {passkeyRegistering ? 'Настраиваем...' : 'Включить Face ID'}
      </button>
      <button
        onClick={() => setShowRegisterPasskey(false)}
        className="w-full text-muted text-sm py-2 hover:text-ink transition-colors"
      >
        Не сейчас
      </button>
    </div>
  </div>
)}
```

- [ ] **Шаг 6: Триггер показа модала после логина**

В `handleLogin`, заменить:

```typescript
if (result.ok) {
  if (result.mustChangePassword) setMode('change_password');
  return;
}
```

На:

```typescript
if (result.ok) {
  if (result.mustChangePassword) {
    setMode('change_password')
    return
  }
  // Предложить Face ID если ещё не зарегистрирован и браузер поддерживает
  const currentUser = useAuthStore.getState().user
  if (supportsWebAuthn && currentUser && !currentUser.hasPasskey) {
    setShowRegisterPasskey(true)
  }
  return
}
```

---

## Task 7: Импорт `useToastStore` в `AuthPage`

**Files:**
- Modify: `src/pages/AuthPage.tsx`

- [ ] **Шаг 1: Добавить импорт**

```typescript
import { useToastStore } from '../store/useToastStore'
```

---

## Task 8: Проверить деплой на Vercel

- [ ] **Шаг 1: Убедиться что Supabase CLI установлен**

```bash
npx supabase --version
```

Если нет: `npm install -g supabase`

- [ ] **Шаг 2: Залогиниться и слинковать проект**

```bash
npx supabase login
npx supabase link --project-ref wwsjbgdesrtmlqaychzo
```

- [ ] **Шаг 3: Задеплоить обе функции**

```bash
npx supabase functions deploy webauthn-challenge --no-verify-jwt
npx supabase functions deploy webauthn-verify --no-verify-jwt
```

- [ ] **Шаг 4: Проверить что функции видны**

Supabase Dashboard → Edge Functions → должны появиться `webauthn-challenge` и `webauthn-verify`.

- [ ] **Шаг 5: Задеплоить фронтенд на Vercel**

```bash
git add -A
git commit -m "feat: WebAuthn Face ID login"
git push
```

Vercel автодеплоит из main.

---

## Примечания

- **iOS Safari**: Face ID работает только на HTTPS. На `localhost` не работает — тестировать через Vercel preview или `mkcert`.
- **Android**: работает через отпечаток пальца (Fingerprint) / PIN.
- **Windows**: работает через Windows Hello (лицо, отпечаток, PIN).
- **Если `no_credentials`**: пользователь ввёл логин но не регистрировал Face ID — показываем ошибку, предлагаем войти паролем.
- **Supabase RLS**: Edge Functions используют `SUPABASE_SERVICE_ROLE_KEY` — обходят RLS. Клиент напрямую к таблицам `webauthn_*` не обращается кроме `hasPasskey` (read-only через `anon` key). Добавьте RLS политику для `webauthn_credentials` select: `auth.uid() = user_id` если нужно.

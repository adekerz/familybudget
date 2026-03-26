import { useState } from 'react';
import { Eye, EyeSlash, DownloadSimple, Shield, Key, SignIn } from '@phosphor-icons/react';
import { useAuthStore } from '../store/useAuthStore';

type AuthMode = 'login' | 'setup' | 'recovery' | 'show_codes' | 'change_password';

function downloadCodes(codes: string[], username: string) {
  const content = [
    'FamilyBudget — Recovery Codes',
    `Username: ${username}`,
    `Дата создания: ${new Date().toLocaleDateString('ru-RU')}`,
    '',
    'Храните в безопасном месте. Каждый код используется один раз.',
    '',
    ...codes.map((c, i) => `${i + 1}. ${c}`),
  ].join('\n');
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `familybudget-recovery-${username}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

export function AuthPage() {
  const { login, setupFirstPassword, recoverWithCode, changePassword } = useAuthStore();
  const authUser = useAuthStore((s) => s.user);

  // Если пользователь уже залогинен, но должен сменить пароль — сразу в режим смены
  const [mode, setMode] = useState<AuthMode>(
    authUser?.mustChangePassword ? 'change_password' : 'login'
  );

  // Login state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Setup (first password) state
  const [setupUserId, setSetupUserId] = useState('');
  const [setupUsername, setSetupUsername] = useState('');
  const [setupPassword, setSetupPassword] = useState('');
  const [setupConfirm, setSetupConfirm] = useState('');
  const [setupError, setSetupError] = useState('');
  const [setupLoading, setSetupLoading] = useState(false);

  // Recovery state
  const [recoveryUsername, setRecoveryUsername] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [recoveryPassword, setRecoveryPassword] = useState('');
  const [recoveryError, setRecoveryError] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);

  // Show codes state
  const [codes, setCodes] = useState<string[]>([]);
  const [codesUsername, setCodesUsername] = useState('');
  const [downloaded, setDownloaded] = useState(false);
  const [codesFromChangePassword, setCodesFromChangePassword] = useState(false);

  // Change password state
  const [changePass, setChangePass] = useState('');
  const [changePassConfirm, setChangePassConfirm] = useState('');
  const [changePassError, setChangePassError] = useState('');
  const [changePassLoading, setChangePassLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setLoginError('');
    setLoginLoading(true);

    const result = await login(username, password);
    setLoginLoading(false);

    if (result.ok) {
      if (result.mustChangePassword) setMode('change_password');
      return;
    }

    if (result.error === 'rate_limited') {
      setLoginError('Слишком много попыток. Подождите 15 минут.');
    } else if (result.error === 'not_setup') {
      // Нужно установить пароль — получить userId из БД
      const { supabase } = await import('../lib/supabase');
      const { data } = await supabase
        .from('app_users')
        .select('id, username')
        .eq('username', username.trim().toLowerCase())
        .single();
      if (data) {
        setSetupUserId(data.id);
        setSetupUsername(data.username);
        setMode('setup');
      }
    } else {
      setLoginError('Неверный логин или пароль.');
    }
  }

  async function handleSetup(e: React.FormEvent) {
    e.preventDefault();
    if (setupPassword.length < 8) {
      setSetupError('Пароль должен быть минимум 8 символов.');
      return;
    }
    if (setupPassword !== setupConfirm) {
      setSetupError('Пароли не совпадают.');
      return;
    }
    setSetupError('');
    setSetupLoading(true);
    const result = await setupFirstPassword(setupUserId, setupPassword);
    setSetupLoading(false);
    setCodes(result.recoveryCodes);
    setCodesUsername(setupUsername);
    setDownloaded(false);
    setMode('show_codes');
    // После показа кодов — логин произойдёт автоматически через handleLogin
  }

  async function handleRecovery(e: React.FormEvent) {
    e.preventDefault();
    if (!recoveryUsername.trim() || !recoveryCode || !recoveryPassword) return;
    setRecoveryError('');
    setRecoveryLoading(true);
    const ok = await recoverWithCode(recoveryUsername, recoveryCode, recoveryPassword);
    setRecoveryLoading(false);
    if (!ok) {
      setRecoveryError('Неверный код восстановления или пользователь не найден.');
      return;
    }
    // Авторизуем с новым паролем
    const result = await login(recoveryUsername, recoveryPassword);
    if (!result.ok) {
      setRecoveryError('Пароль сброшен, но не удалось войти. Попробуйте войти вручную.');
    }
  }

  function handleDownloadCodes() {
    downloadCodes(codes, codesUsername);
    setDownloaded(true);
  }

  async function handleCodesConfirm() {
    if (!downloaded) return;
    if (codesFromChangePassword) {
      // Пользователь уже залогинен — AuthPage размонтируется автоматически
      return;
    }
    // Попробовать автоматически войти (пароль уже был введён в setup)
    const result = await login(setupUsername, setupPassword);
    if (!result.ok) {
      setMode('login');
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (changePass.length < 8) {
      setChangePassError('Пароль должен быть минимум 8 символов.');
      return;
    }
    if (changePass !== changePassConfirm) {
      setChangePassError('Пароли не совпадают.');
      return;
    }
    setChangePassError('');
    setChangePassLoading(true);
    const newCodes = await changePassword(changePass);
    setChangePassLoading(false);
    if (newCodes) {
      setCodes(newCodes);
      setCodesUsername(username);
      setDownloaded(false);
      setCodesFromChangePassword(true);
      setMode('show_codes');
    }
  }

  if (mode === 'change_password') {
    return (
      <div className="auth-bg flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-card border border-border rounded-3xl p-6 space-y-5 shadow-xl">
          <div className="text-center">
            <div className="w-12 h-12 bg-warning-bg rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Key size={24} className="text-warning" />
            </div>
            <h1 className="text-lg font-bold text-ink">Смените временный пароль</h1>
            <p className="text-xs text-muted mt-1">
              Вы вошли с временным паролем. Придумайте постоянный.
            </p>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="text-xs text-muted mb-1.5 block">Новый пароль</label>
              <input
                type="password"
                autoFocus
                value={changePass}
                onChange={e => setChangePass(e.target.value)}
                placeholder="Минимум 8 символов"
                className="w-full bg-card border border-border rounded-xl px-4 py-3 text-ink focus:outline-none focus:border-accent transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-muted mb-1.5 block">Подтвердите пароль</label>
              <input
                type="password"
                value={changePassConfirm}
                onChange={e => setChangePassConfirm(e.target.value)}
                placeholder="Повторите пароль"
                className="w-full bg-card border border-border rounded-xl px-4 py-3 text-ink focus:outline-none focus:border-accent transition-colors"
              />
            </div>
            {changePassError && <p className="text-danger text-xs">{changePassError}</p>}
            <button
              type="submit"
              disabled={changePassLoading || !changePass || !changePassConfirm}
              className="w-full bg-accent text-white font-semibold py-3 rounded-xl disabled:opacity-40 transition-all active:scale-95"
            >
              {changePassLoading ? 'Сохраняем...' : 'Установить пароль'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (mode === 'show_codes') {
    return (
      <div className="auth-bg flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-card border border-border rounded-3xl p-6 space-y-5 shadow-xl">
          <div className="text-center">
            <div className="w-12 h-12 bg-success-bg rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Shield size={24} className="text-success" />
            </div>
            <h1 className="text-lg font-bold text-ink">Коды восстановления</h1>
            <p className="text-xs text-muted mt-1">
              Сохраните в безопасном месте. Они не будут показаны повторно.
            </p>
          </div>

          <div className="bg-alice border border-alice-dark rounded-2xl p-4 space-y-1.5">
            {codes.map((code, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[10px] text-muted w-4">{i + 1}.</span>
                <span className="font-mono text-sm font-bold text-ink tracking-wider">{code}</span>
              </div>
            ))}
          </div>

          <button
            onClick={handleDownloadCodes}
            className="w-full flex items-center justify-center gap-2 bg-accent text-white font-semibold py-3 rounded-xl transition-all active:scale-95"
          >
            <DownloadSimple size={16} />
            Скачать коды
          </button>

          <button
            onClick={handleCodesConfirm}
            disabled={!downloaded}
            className="w-full font-semibold py-3 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-success text-white active:scale-95"
          >
            {downloaded ? 'Продолжить' : 'Сначала скачайте коды'}
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'setup') {
    return (
      <div className="auth-bg flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-card border border-border rounded-3xl p-6 space-y-5 shadow-xl">
          <div className="text-center">
            <div className="w-12 h-12 bg-accent-light rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Key size={24} className="text-accent" />
            </div>
            <h1 className="text-lg font-bold text-ink">Добро пожаловать, администратор</h1>
            <p className="text-xs text-muted mt-1">Создайте пароль для входа</p>
          </div>

          <form onSubmit={handleSetup} className="space-y-4">
            <div>
              <label className="text-xs text-muted mb-1.5 block">Новый пароль</label>
              <input
                type="password"
                value={setupPassword}
                onChange={e => setSetupPassword(e.target.value)}
                placeholder="Минимум 8 символов"
                className="w-full bg-card border border-border rounded-xl px-4 py-3 text-ink focus:outline-none focus:border-accent transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-muted mb-1.5 block">Подтвердите пароль</label>
              <input
                type="password"
                value={setupConfirm}
                onChange={e => setSetupConfirm(e.target.value)}
                placeholder="Повторите пароль"
                className="w-full bg-card border border-border rounded-xl px-4 py-3 text-ink focus:outline-none focus:border-accent transition-colors"
              />
            </div>
            {setupError && <p className="text-danger text-xs">{setupError}</p>}
            <button
              type="submit"
              disabled={setupLoading || !setupPassword || !setupConfirm}
              className="w-full bg-accent text-white font-semibold py-3 rounded-xl disabled:opacity-40 transition-all active:scale-95"
            >
              {setupLoading ? 'Сохраняем...' : 'Создать пароль'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (mode === 'recovery') {
    return (
      <div className="auth-bg flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-card border border-border rounded-3xl p-6 space-y-5 shadow-xl">
          <div className="text-center">
            <h1 className="text-lg font-bold text-ink">Восстановление доступа</h1>
            <p className="text-xs text-muted mt-1">Введите код из файла с кодами восстановления</p>
          </div>

          <form onSubmit={handleRecovery} className="space-y-4">
            <div>
              <label className="text-xs text-muted mb-1.5 block">Логин</label>
              <input
                type="text"
                value={recoveryUsername}
                onChange={e => setRecoveryUsername(e.target.value)}
                placeholder="username"
                className="w-full bg-card border border-border rounded-xl px-4 py-3 text-ink focus:outline-none focus:border-accent transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-muted mb-1.5 block">Код восстановления</label>
              <input
                type="text"
                value={recoveryCode}
                onChange={e => setRecoveryCode(e.target.value.toUpperCase())}
                placeholder="XXXX-XXXX"
                className="w-full bg-card border border-border rounded-xl px-4 py-3 text-ink font-mono focus:outline-none focus:border-accent transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-muted mb-1.5 block">Новый пароль</label>
              <input
                type="password"
                value={recoveryPassword}
                onChange={e => setRecoveryPassword(e.target.value)}
                placeholder="Минимум 8 символов"
                className="w-full bg-card border border-border rounded-xl px-4 py-3 text-ink focus:outline-none focus:border-accent transition-colors"
              />
            </div>
            {recoveryError && <p className="text-danger text-xs">{recoveryError}</p>}
            <button
              type="submit"
              disabled={recoveryLoading || !recoveryUsername || !recoveryCode || !recoveryPassword}
              className="w-full bg-accent text-white font-semibold py-3 rounded-xl disabled:opacity-40 transition-all active:scale-95"
            >
              {recoveryLoading ? 'Проверяем...' : 'Сбросить пароль'}
            </button>
            <button
              type="button"
              onClick={() => setMode('login')}
              className="w-full text-muted text-sm py-2 hover:text-ink transition-colors"
            >
              Вернуться к входу
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Login mode
  return (
    <div className="auth-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-card border border-border rounded-3xl p-6 space-y-5 shadow-xl">
        <div className="text-center">
          <div className="w-12 h-12 bg-accent-light rounded-2xl flex items-center justify-center mx-auto mb-3">
            <SignIn size={24} className="text-accent" />
          </div>
          <h1 className="text-xl font-bold text-ink">FamilyBudget</h1>
          <p className="text-xs text-muted mt-1">Войдите в семейный бюджет</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs text-muted mb-1.5 block">Логин</label>
            <input
              type="text"
              autoComplete="username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="username"
              className="w-full bg-card border border-border rounded-xl px-4 py-3 text-ink focus:outline-none focus:border-accent transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-muted mb-1.5 block">Пароль</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-card border border-border rounded-xl px-4 py-3 pr-11 text-ink focus:outline-none focus:border-accent transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink p-1 transition-colors"
              >
                {showPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {loginError && (
            <div className="bg-danger-bg border border-danger/30 rounded-xl px-4 py-2">
              <p className="text-danger text-xs">{loginError}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loginLoading || !username.trim() || !password}
            className="w-full bg-accent text-white font-semibold py-3 rounded-xl disabled:opacity-40 transition-all active:scale-95"
          >
            {loginLoading ? 'Входим...' : 'Войти'}
          </button>

          <button
            type="button"
            onClick={() => setMode('recovery')}
            className="w-full text-muted text-sm py-1 hover:text-ink transition-colors"
          >
            Забыл пароль?
          </button>
        </form>
      </div>
    </div>
  );
}

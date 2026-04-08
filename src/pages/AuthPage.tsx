import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeSlash, DownloadSimple, Shield, Key, SignIn, Check, X } from '@phosphor-icons/react';
import { useAuthStore } from '../store/useAuthStore';
import { useToastStore } from '../store/useToastStore'
import { Fingerprint } from '@phosphor-icons/react'
import { browserSupportsWebAuthn } from '../lib/webauthn'
import BottomSheet from '../components/ui/BottomSheet'

interface PasswordStrength {
  minLength: boolean;
  hasNumber: boolean;
  hasSpecialOrUpper: boolean;
}

function checkPassword(p: string): PasswordStrength {
  return {
    minLength:         p.length >= 8,
    hasNumber:         /\d/.test(p),
    hasSpecialOrUpper: /[A-Z!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p),
  };
}

function PasswordRequirements({ password }: { password: string }) {
  const { t } = useTranslation();
  if (!password) return null;
  const s = checkPassword(password);
  const rules = [
    { ok: s.minLength,         label: t('pwd_min_length') },
    { ok: s.hasNumber,         label: t('pwd_has_number') },
    { ok: s.hasSpecialOrUpper, label: t('pwd_has_special') },
  ];
  return (
    <ul className="space-y-1 mt-1">
      {rules.map((r) => (
        <li key={r.label} className="flex items-center gap-1.5 text-xs">
          {r.ok
            ? <Check size={12} weight="bold" className="text-success shrink-0" />
            : <X     size={12} weight="bold" className="text-danger  shrink-0" />
          }
          <span className={r.ok ? 'text-success' : 'text-muted'}>{r.label}</span>
        </li>
      ))}
    </ul>
  );
}

function isPasswordValid(p: string): boolean {
  const s = checkPassword(p);
  return s.minLength && s.hasNumber && s.hasSpecialOrUpper;
}

type AuthMode = 'login' | 'setup' | 'recovery' | 'recovery_passkey' | 'show_codes' | 'change_password';

function downloadCodes(codes: string[], username: string, t: (k: string) => string) {
  const content = [
    '╔══════════════════════════════════╗',
    '║       FLUX — Recovery Codes      ║',
    '╚══════════════════════════════════╝',
    '',
    `Username: ${username}`,
    `${t('recovery_date_prefix')}${new Date().toLocaleDateString('ru-RU')}`,
    '',
    t('recovery_keep_safe'),
    t('recovery_one_time'),
    '',
    ...codes.map((c, i) => `  ${i + 1}. ${c}`),
  ].join('\n');
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `flux-recovery-${username}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

export function AuthPage() {
  const { t } = useTranslation();
  const { login, setupFirstPassword, recoverWithCode, changePassword, confirmPasswordChanged, recoverWithPasskey } = useAuthStore();
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

  // Recovery via passkey state
  const [passkeyRecoveryUsername, setPasskeyRecoveryUsername] = useState('');
  const [passkeyRecoveryPass, setPasskeyRecoveryPass] = useState('');
  const [passkeyRecoveryConfirm, setPasskeyRecoveryConfirm] = useState('');
  const [passkeyRecoveryError, setPasskeyRecoveryError] = useState('');
  const [passkeyRecoveryLoading, setPasskeyRecoveryLoading] = useState(false);

  // Passkey state
  const [passkeyLoading, setPasskeyLoading]               = useState(false)
  const [passkeyError, setPasskeyError]                   = useState('')
  const [showRegisterPasskey, setShowRegisterPasskey]     = useState(false)
  const [passkeyRegistering, setPasskeyRegistering]       = useState(false)
  const [autoScanDone, setAutoScanDone]                   = useState(false)
  const [passkeyAvailable, setPasskeyAvailable]           = useState<boolean | null>(null)
  const loginWithPasskey                                  = useAuthStore((s) => s.loginWithPasskey)
  const registerPasskeyFn                                 = useAuthStore((s) => s.registerPasskey)
  const supportsWebAuthn                                  = browserSupportsWebAuthn()

  // Флаг чтобы не запускать дважды (StrictMode в dev вызывает эффекты дважды)
  const autoPasskeyAttempted = useRef(false);

  useEffect(() => {
    if (mode !== 'login') return;
    if (!supportsWebAuthn) return;
    if (autoPasskeyAttempted.current) return;

    autoPasskeyAttempted.current = true;

    if ('PublicKeyCredential' in window) {
      (PublicKeyCredential as any).isUserVerifyingPlatformAuthenticatorAvailable()
        .then((available: boolean) => setPasskeyAvailable(available))
        .catch(() => setPasskeyAvailable(false));
    } else {
      setPasskeyAvailable(false);
    }

    const timer = setTimeout(async () => {
      setPasskeyLoading(true);
      setPasskeyError('');
      const result = await loginWithPasskey('');
      setPasskeyLoading(false);

      if (result.ok) {
        return;
      }

      setAutoScanDone(true);
    }, 300);

    return () => clearTimeout(timer);
  }, [mode, supportsWebAuthn]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setLoginError('');
    setLoginLoading(true);

    const result = await login(username, password);
    setLoginLoading(false);

    if (result.ok) {
      if (result.mustChangePassword) {
        setMode('change_password')
        return
      }
      const currentUser = useAuthStore.getState().user
      if (supportsWebAuthn && currentUser && !currentUser.hasPasskey) {
        setShowRegisterPasskey(true)
      }
      return
    }

    if (result.error === 'rate_limited') {
      setLoginError(t('err_rate_limit'));
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
      setLoginError(t('err_wrong_credentials'));
    }
  }

  async function handleSetup(e: React.FormEvent) {
    e.preventDefault();
    if (!isPasswordValid(setupPassword)) {
      setSetupError(t('err_password_weak'));
      return;
    }
    if (setupPassword !== setupConfirm) {
      setSetupError(t('err_passwords_no_match'));
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
      setRecoveryError(t('err_recovery_invalid'));
      return;
    }
    // Авторизуем с новым паролем
    const result = await login(recoveryUsername, recoveryPassword);
    if (!result.ok) {
      setRecoveryError(t('err_recovery_login_fail'));
    }
  }

  function handleDownloadCodes() {
    downloadCodes(codes, codesUsername, t);
    setDownloaded(true);
  }

  async function handleCodesConfirm() {
    if (!downloaded) return;
    if (codesFromChangePassword) {
      // Сбрасываем mustChangePassword — теперь App.tsx покажет главное приложение
      confirmPasswordChanged();
      return;
    }
    // Попробовать автоматически войти (пароль уже был введён в setup)
    const result = await login(setupUsername, setupPassword);
    if (!result.ok) {
      setMode('login');
    }
  }

  async function handlePasskeyLogin() {
    setPasskeyError('');
    setPasskeyLoading(true);
    const result = await loginWithPasskey('');
    setPasskeyLoading(false);
    setAutoScanDone(true);
    if (!result.ok) {
      if (
        result.error.includes('NotAllowed') ||
        result.error.includes('cancel') ||
        result.error.includes('abort')
      ) {
        return;
      }
      if (result.error === 'no_credentials') {
        setPasskeyError(t('err_faceid_not_registered'));
      } else if (result.error === 'user_not_found') {
        setPasskeyError(t('err_user_not_found'));
      } else if (result.error === 'timeout') {
        setPasskeyError(t('err_faceid_timeout'));
      } else {
        setPasskeyError(t('err_faceid_fail'));
      }
    }
  }

  async function handleRegisterPasskey() {
    setPasskeyRegistering(true)
    try {
      await registerPasskeyFn()
      setShowRegisterPasskey(false)
      useToastStore.getState().show(t('toast_faceid_connected'))
    } catch {
      useToastStore.getState().show(t('toast_faceid_fail'))
    }
    setPasskeyRegistering(false)
  }

  async function handlePasskeyRecovery(e: React.FormEvent) {
    e.preventDefault();
    if (!passkeyRecoveryUsername.trim()) { setPasskeyRecoveryError(t('err_enter_login')); return; }
    if (!isPasswordValid(passkeyRecoveryPass)) { setPasskeyRecoveryError(t('err_password_requirements')); return; }
    if (passkeyRecoveryPass !== passkeyRecoveryConfirm) { setPasskeyRecoveryError(t('err_passwords_no_match')); return; }
    setPasskeyRecoveryError('');
    setPasskeyRecoveryLoading(true);
    const result = await recoverWithPasskey(passkeyRecoveryUsername.trim(), passkeyRecoveryPass);
    setPasskeyRecoveryLoading(false);
    if (!result.ok) {
      if (result.error === 'no_passkey') {
        setPasskeyRecoveryError(t('err_faceid_no_account'));
      } else if (result.error === 'user_not_found') {
        setPasskeyRecoveryError(t('err_user_not_found'));
      } else {
        setPasskeyRecoveryError(t('err_faceid_identity'));
      }
      return;
    }
    // Показываем новые коды
    setCodes(result.codes);
    setCodesUsername(passkeyRecoveryUsername.trim());
    setDownloaded(false);
    setCodesFromChangePassword(false);
    setMode('show_codes');
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!isPasswordValid(changePass)) {
      setChangePassError(t('err_password_weak'));
      return;
    }
    if (changePass !== changePassConfirm) {
      setChangePassError(t('err_passwords_no_match'));
      return;
    }
    setChangePassError('');
    setChangePassLoading(true);
    const newCodes = await changePassword(changePass);
    setChangePassLoading(false);
    if (newCodes) {
      setCodes(newCodes);
      // authUser?.username используем когда username (поле логина) пустой (смена пароля не с auth-формы)
      setCodesUsername(username || authUser?.username || '');
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
            <h1 className="text-lg font-bold text-ink">{t('change_temp_password_title')}</h1>
            <p className="text-xs text-muted mt-1">
              {t('change_temp_password_desc')}
            </p>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="text-xs text-muted mb-1.5 block">{t('new_password_label')}</label>
              <input
                type="password"
                autoFocus
                value={changePass}
                onChange={e => setChangePass(e.target.value)}
                placeholder={t('password_min_placeholder')}
                className="w-full bg-card border border-border rounded-xl px-4 py-3 text-ink focus:outline-none focus:border-accent transition-colors"
              />
              <PasswordRequirements password={changePass} />
            </div>
            <div>
              <label className="text-xs text-muted mb-1.5 block">{t('confirm_password_label')}</label>
              <input
                type="password"
                value={changePassConfirm}
                onChange={e => setChangePassConfirm(e.target.value)}
                placeholder={t('repeat_password_placeholder')}
                className="w-full bg-card border border-border rounded-xl px-4 py-3 text-ink focus:outline-none focus:border-accent transition-colors"
              />
            </div>
            {changePassError && <p className="text-danger text-xs">{changePassError}</p>}
            <button
              type="submit"
              disabled={changePassLoading || !isPasswordValid(changePass) || changePass !== changePassConfirm}
              className="w-full bg-accent text-white font-semibold py-3 rounded-xl disabled:opacity-40 transition-all active:scale-95"
            >
              {changePassLoading ? t('saving_label_verb') : t('set_password_btn')}
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
            <h1 className="text-lg font-bold text-ink">{t('recovery_codes_section_title')}</h1>
            <p className="text-xs text-muted mt-1">
              {t('recovery_codes_section_desc')}
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
            {t('download_codes_btn')}
          </button>

          <button
            onClick={handleCodesConfirm}
            disabled={!downloaded}
            className="w-full font-semibold py-3 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-success text-white active:scale-95"
          >
            {downloaded ? t('continue_btn') : t('download_first_btn')}
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
            <h1 className="text-lg font-bold text-ink">{t('welcome_admin_title')}</h1>
            <p className="text-xs text-muted mt-1">{t('welcome_admin_desc')}</p>
          </div>

          <form onSubmit={handleSetup} className="space-y-4">
            <div>
              <label className="text-xs text-muted mb-1.5 block">{t('new_password_label')}</label>
              <input
                type="password"
                value={setupPassword}
                onChange={e => setSetupPassword(e.target.value)}
                placeholder={t('password_min_placeholder')}
                className="w-full bg-card border border-border rounded-xl px-4 py-3 text-ink focus:outline-none focus:border-accent transition-colors"
              />
              <PasswordRequirements password={setupPassword} />
            </div>
            <div>
              <label className="text-xs text-muted mb-1.5 block">{t('confirm_password_label')}</label>
              <input
                type="password"
                value={setupConfirm}
                onChange={e => setSetupConfirm(e.target.value)}
                placeholder={t('repeat_password_placeholder')}
                className="w-full bg-card border border-border rounded-xl px-4 py-3 text-ink focus:outline-none focus:border-accent transition-colors"
              />
            </div>
            {setupError && <p className="text-danger text-xs">{setupError}</p>}
            <button
              type="submit"
              disabled={setupLoading || !isPasswordValid(setupPassword) || setupPassword !== setupConfirm}
              className="w-full bg-accent text-white font-semibold py-3 rounded-xl disabled:opacity-40 transition-all active:scale-95"
            >
              {setupLoading ? t('saving_label_verb') : t('create_password_btn')}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (mode === 'recovery_passkey') {
    return (
      <div className="auth-bg flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-card border border-border rounded-3xl p-6 space-y-5 shadow-xl">
          <div className="text-center">
            <div className="w-12 h-12 bg-accent-light rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Fingerprint size={24} weight="duotone" className="text-accent" />
            </div>
            <h1 className="text-lg font-bold text-ink">{t('faceid_recovery_title')}</h1>
            <p className="text-xs text-muted mt-1">{t('faceid_recovery_desc')}</p>
          </div>

          <form onSubmit={handlePasskeyRecovery} className="space-y-4">
            <div>
              <label className="text-xs text-muted mb-1.5 block">{t('login_label')}</label>
              <input
                type="text"
                autoFocus
                value={passkeyRecoveryUsername}
                onChange={e => setPasskeyRecoveryUsername(e.target.value)}
                placeholder="username"
                className="w-full bg-card border border-border rounded-xl px-4 py-3 text-ink focus:outline-none focus:border-accent transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-muted mb-1.5 block">{t('new_password_label')}</label>
              <input
                type="password"
                value={passkeyRecoveryPass}
                onChange={e => setPasskeyRecoveryPass(e.target.value)}
                placeholder={t('password_min_placeholder')}
                className="w-full bg-card border border-border rounded-xl px-4 py-3 text-ink focus:outline-none focus:border-accent transition-colors"
              />
              <PasswordRequirements password={passkeyRecoveryPass} />
            </div>
            <div>
              <label className="text-xs text-muted mb-1.5 block">{t('confirm_password_label')}</label>
              <input
                type="password"
                value={passkeyRecoveryConfirm}
                onChange={e => setPasskeyRecoveryConfirm(e.target.value)}
                placeholder={t('repeat_password_placeholder')}
                className="w-full bg-card border border-border rounded-xl px-4 py-3 text-ink focus:outline-none focus:border-accent transition-colors"
              />
            </div>
            {passkeyRecoveryError && <p className="text-danger text-xs">{passkeyRecoveryError}</p>}
            <button
              type="submit"
              disabled={passkeyRecoveryLoading || !passkeyRecoveryUsername.trim() || !isPasswordValid(passkeyRecoveryPass) || passkeyRecoveryPass !== passkeyRecoveryConfirm}
              className="w-full flex items-center justify-center gap-2 bg-accent text-white font-semibold py-3 rounded-xl disabled:opacity-40 transition-all active:scale-95"
            >
              <Fingerprint size={18} weight="duotone" />
              {passkeyRecoveryLoading ? t('verifying_faceid') : t('confirm_via_faceid')}
            </button>
            <button
              type="button"
              onClick={() => setMode('recovery')}
              className="w-full text-muted text-sm py-2 hover:text-ink transition-colors"
            >
              {t('use_recovery_code')}
            </button>
            <button
              type="button"
              onClick={() => setMode('login')}
              className="w-full text-muted text-sm py-1 hover:text-ink transition-colors"
            >
              {t('back_to_login')}
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
            <h1 className="text-lg font-bold text-ink">{t('recovery_access_title')}</h1>
            <p className="text-xs text-muted mt-1">{t('recovery_access_desc')}</p>
          </div>

          <form onSubmit={handleRecovery} className="space-y-4">
            <div>
              <label className="text-xs text-muted mb-1.5 block">{t('login_label')}</label>
              <input
                type="text"
                value={recoveryUsername}
                onChange={e => setRecoveryUsername(e.target.value)}
                placeholder="username"
                className="w-full bg-card border border-border rounded-xl px-4 py-3 text-ink focus:outline-none focus:border-accent transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-muted mb-1.5 block">{t('recovery_code_label')}</label>
              <input
                type="text"
                value={recoveryCode}
                onChange={e => setRecoveryCode(e.target.value.toUpperCase())}
                placeholder="XXXX-XXXX"
                className="w-full bg-card border border-border rounded-xl px-4 py-3 text-ink font-mono focus:outline-none focus:border-accent transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-muted mb-1.5 block">{t('new_password_label')}</label>
              <input
                type="password"
                value={recoveryPassword}
                onChange={e => setRecoveryPassword(e.target.value)}
                placeholder={t('password_min_placeholder')}
                className="w-full bg-card border border-border rounded-xl px-4 py-3 text-ink focus:outline-none focus:border-accent transition-colors"
              />
            </div>
            {recoveryError && <p className="text-danger text-xs">{recoveryError}</p>}
            <button
              type="submit"
              disabled={recoveryLoading || !recoveryUsername || !recoveryCode || !recoveryPassword}
              className="w-full bg-accent text-white font-semibold py-3 rounded-xl disabled:opacity-40 transition-all active:scale-95"
            >
              {recoveryLoading ? t('verifying') : t('reset_password_btn')}
            </button>
            {supportsWebAuthn && (
              <button
                type="button"
                onClick={() => setMode('recovery_passkey')}
                className="w-full flex items-center justify-center gap-2 border border-border bg-card text-ink font-medium py-2.5 rounded-xl transition-all active:scale-95 text-sm"
              >
                <Fingerprint size={16} weight="duotone" className="text-accent" />
                {t('recover_via_faceid')}
              </button>
            )}
            <button
              type="button"
              onClick={() => setMode('login')}
              className="w-full text-muted text-sm py-2 hover:text-ink transition-colors"
            >
              {t('back_to_login')}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Login mode
  return (
    <div className="auth-bg flex flex-col items-center justify-center p-4" style={{ minHeight: '100dvh' }}>
      {/* Logo hero */}
      <div className="mb-8 flex flex-col items-center">
        <img
          src="/icons/flux-icon.png"
          alt="Flux"
          className="w-20 h-20 rounded-3xl mb-4"
          style={{ mixBlendMode: 'screen', boxShadow: '0 0 60px rgba(0,212,255,0.2)' }}
        />
        <span className="text-3xl font-extrabold flux-gradient-text">Flux</span>
        <p className="text-sm mt-2" style={{ color: 'var(--text3)' }}>{t('smart_family_budget')}</p>
      </div>

      <div className="w-full max-w-sm bg-card border border-border rounded-3xl p-6 space-y-5 shadow-xl">
        <div className="text-center">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 transition-all ${
            passkeyLoading
              ? 'bg-accent animate-pulse'
              : 'bg-accent-light'
          }`}>
            {passkeyLoading
              ? <Fingerprint size={24} weight="duotone" className="text-white" />
              : <SignIn size={24} className="text-accent" />
            }
          </div>
          <p className="text-xs text-muted mt-1">
            {passkeyLoading
              ? t('touch_scanner')
              : t('sign_in_account')
            }
          </p>
        </div>

        {/* Показываем форму только когда не идёт автосканирование */}
        <div className={`transition-all duration-300 ${
          passkeyLoading ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs text-muted mb-1.5 block">{t('login_label')}</label>
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
              <label className="text-xs text-muted mb-1.5 block">{t('password_label')}</label>
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
              {loginLoading ? t('signing_in') : t('sign_in_btn')}
            </button>

            {supportsWebAuthn && passkeyAvailable !== false && (
              <>
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-[10px] text-muted">{t('or_label')}</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAutoScanDone(false);
                    autoPasskeyAttempted.current = false;
                    handlePasskeyLogin();
                  }}
                  disabled={passkeyLoading}
                  className="w-full flex items-center justify-center gap-2 border border-border bg-card text-ink font-medium py-3 rounded-xl disabled:opacity-40 transition-all active:scale-95"
                >
                  <Fingerprint size={18} weight="duotone" className="text-accent" />
                  {passkeyLoading
                    ? t('checking_label')
                    : autoScanDone
                    ? t('retry_faceid')
                    : t('sign_in_faceid')
                  }
                </button>
                {passkeyError && <p className="text-danger text-xs text-center">{passkeyError}</p>}
              </>
            )}

            <button
              type="button"
              onClick={() => setMode('recovery')}
              className="w-full text-muted text-sm py-1 hover:text-ink transition-colors"
            >
              {t('forgot_password')}
            </button>
          </form>
        </div>
      </div>

      <BottomSheet
        isOpen={showRegisterPasskey && supportsWebAuthn}
        onClose={() => setShowRegisterPasskey(false)}
        title={t('enable_faceid_title')}
      >
        <div className="text-center">
          <div className="w-12 h-12 bg-accent-light rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Fingerprint size={24} weight="duotone" className="text-accent" />
          </div>
          <p className="text-xs text-muted">{t('enable_faceid_desc')}</p>
        </div>
        <button
          onClick={handleRegisterPasskey}
          disabled={passkeyRegistering}
          className="w-full bg-accent text-white font-semibold py-3 rounded-xl disabled:opacity-40 transition-all active:scale-95"
        >
          {passkeyRegistering ? t('setting_up') : t('enable_faceid_btn')}
        </button>
        <button
          onClick={() => setShowRegisterPasskey(false)}
          className="w-full text-muted text-sm py-2 hover:text-ink transition-colors"
        >
          {t('not_now_btn')}
        </button>
      </BottomSheet>
    </div>
  );
}

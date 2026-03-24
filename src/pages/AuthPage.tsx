import { useState } from 'react';
import { Wallet, ChevronRight, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import Button from '../components/ui/Button';

export function AuthPage() {
  const login = useAuthStore((s) => s.login);
  const whitelist = useAuthStore((s) => s.whitelist);

  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  const isFirstUser = whitelist.length === 0;

  function formatInput(raw: string): string {
    const digits = raw.replace(/\D/g, '').slice(0, 11);
    if (digits.length === 0) return '';
    let result = '+7';
    if (digits.length > 1) result += ' ' + digits.slice(1, 4);
    if (digits.length > 4) result += ' ' + digits.slice(4, 7);
    if (digits.length > 7) result += ' ' + digits.slice(7, 9);
    if (digits.length > 9) result += ' ' + digits.slice(9, 11);
    return result;
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError('');
    setPhone(formatInput(e.target.value));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ok = login(phone);
    if (!ok) {
      setError('Номер не в списке доступа');
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  }

  const digits = phone.replace(/\D/g, '');
  const isReady = digits.length === 11;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      {/* Logo */}
      <div className="mb-10 flex flex-col items-center gap-3">
        <div className="w-16 h-16 rounded-2xl bg-accent-light border border-accent/30 flex items-center justify-center">
          <Wallet size={32} className="text-accent" />
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-bold">
            <span className="text-ink">Family</span>
            <span className="text-accent">Budget</span>
          </h1>
          <p className="text-sm text-muted mt-1">Семейный бюджет под контролем</p>
        </div>
      </div>

      {/* Card */}
      <div className={`w-full max-w-sm bg-card border border-border rounded-2xl p-6 shadow-sm transition-transform ${shake ? 'animate-shake' : ''}`}>
        <p className="text-sm text-muted mb-4">
          {isFirstUser
            ? 'Первый вход — вы станете администратором'
            : 'Введите ваш номер телефона'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <input
              type="tel"
              value={phone}
              onChange={handleChange}
              placeholder="+7 XXX XXX XX XX"
              className="w-full bg-card border border-border rounded-xl px-4 py-3 text-ink text-lg font-semibold tracking-widest placeholder:text-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-light transition-colors"
              autoFocus
            />
            {error && (
              <div className="flex items-center gap-2 mt-2 text-danger text-xs">
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
            )}
          </div>

          <Button
            type="submit"
            disabled={!isReady}
            className="w-full flex items-center justify-center gap-2"
          >
            Войти
            <ChevronRight size={18} />
          </Button>
        </form>
      </div>

      <p className="mt-6 text-xs text-muted text-center max-w-xs">
        Вход только по номеру телефона. Пароль не нужен.
      </p>
    </div>
  );
}

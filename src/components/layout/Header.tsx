import { LogOut } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

export function Header() {
  const logout = useAuthStore((s) => s.logout);

  const today = new Date().toLocaleDateString('ru-RU', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
  });

  return (
    <header className="flex items-center justify-between px-4 py-3 bg-card border-b border-border sticky top-0 z-40">
      <div>
        <h1 className="text-base font-semibold text-white tracking-wide">FamilyBudget</h1>
        <p className="text-xs text-muted capitalize">{today}</p>
      </div>
      <button
        onClick={logout}
        className="p-2 rounded-lg text-muted hover:text-white hover:bg-border/50 transition-colors"
        title="Выйти"
      >
        <LogOut size={18} />
      </button>
    </header>
  );
}

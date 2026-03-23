import { useState } from 'react';
import { Plus, Trash2, Download, Upload, LogOut, ChevronRight, Shield } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { useAuthStore } from '../store/useAuthStore';
import { useIncomeStore } from '../store/useIncomeStore';
import { useExpenseStore } from '../store/useExpenseStore';
import { useGoalsStore } from '../store/useGoalsStore';
import { formatPhone } from '../lib/format';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';

export function SettingsPage() {
  const { whitelist, currentUser, addToWhitelist, removeFromWhitelist, logout } = useAuthStore();
  const [newPhone, setNewPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [showAddPhone, setShowAddPhone] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const incomes = useIncomeStore((s) => s.incomes);
  const expenses = useExpenseStore((s) => s.expenses);
  const goals = useGoalsStore((s) => s.goals);

  function handleAddPhone() {
    const digits = newPhone.replace(/\D/g, '');
    if (digits.length !== 11 || !digits.startsWith('7')) {
      setPhoneError('Введите номер в формате +7 XXX XXX XX XX');
      return;
    }
    addToWhitelist('+' + digits);
    setNewPhone('');
    setShowAddPhone(false);
  }

  function handleExport() {
    const data = {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      incomes,
      expenses,
      goals,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `family-budget-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (data.incomes) useIncomeStore.setState({ incomes: data.incomes });
        if (data.expenses) useExpenseStore.setState({ expenses: data.expenses });
        if (data.goals) useGoalsStore.setState({ goals: data.goals });
        alert('Данные импортированы успешно!');
      } catch {
        alert('Ошибка: неверный формат файла');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function handleClearAll() {
    useIncomeStore.setState({ incomes: [] });
    useExpenseStore.setState({ expenses: [] });
    useGoalsStore.setState({ goals: [] });
    setShowClearConfirm(false);
  }

  return (
    <div className="flex flex-col min-h-screen bg-primary">
      <Header />
      <main className="flex-1 overflow-y-auto px-4 pt-4 pb-28 space-y-4">

        {/* Whitelist */}
        <section className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-accent" />
              <p className="font-semibold text-white text-sm">Доступ к приложению</p>
            </div>
            <button
              onClick={() => setShowAddPhone(true)}
              className="text-accent text-xs flex items-center gap-1 hover:text-accent/80"
            >
              <Plus size={14} />
              Добавить
            </button>
          </div>
          <div className="divide-y divide-border">
            {whitelist.map((phone) => (
              <div key={phone} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-white text-sm font-mono">{formatPhone(phone)}</p>
                  {phone === currentUser && (
                    <p className="text-accent text-xs">Текущий пользователь</p>
                  )}
                </div>
                {phone !== currentUser && (
                  <button
                    onClick={() => removeFromWhitelist(phone)}
                    className="text-muted hover:text-danger transition-colors p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Data management */}
        <section className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="font-semibold text-white text-sm">Данные</p>
            <p className="text-muted text-xs mt-0.5">
              {incomes.length} доходов · {expenses.length} расходов · {goals.length} целей
            </p>
          </div>
          <div className="divide-y divide-border">
            <button
              onClick={handleExport}
              className="flex items-center justify-between w-full px-4 py-3 hover:bg-primary/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Download size={16} className="text-success" />
                <span className="text-white text-sm">Экспорт данных (JSON)</span>
              </div>
              <ChevronRight size={14} className="text-muted" />
            </button>
            <label className="flex items-center justify-between w-full px-4 py-3 hover:bg-primary/50 transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <Upload size={16} className="text-accent" />
                <span className="text-white text-sm">Импорт данных (JSON)</span>
              </div>
              <ChevronRight size={14} className="text-muted" />
              <input type="file" accept=".json" className="hidden" onChange={handleImport} />
            </label>
            <button
              onClick={() => setShowClearConfirm(true)}
              className="flex items-center justify-between w-full px-4 py-3 hover:bg-primary/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Trash2 size={16} className="text-danger" />
                <span className="text-danger text-sm">Очистить все данные</span>
              </div>
              <ChevronRight size={14} className="text-muted" />
            </button>
          </div>
        </section>

        {/* Logout */}
        <section className="bg-card border border-border rounded-2xl overflow-hidden">
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-4 py-4 hover:bg-primary/50 transition-colors"
          >
            <LogOut size={16} className="text-danger" />
            <span className="text-danger font-medium text-sm">Выйти из аккаунта</span>
          </button>
        </section>

        {/* App version */}
        <p className="text-center text-muted text-xs pb-2">FamilyBudget v1.0 · Данные хранятся локально</p>
      </main>

      {/* Add phone modal */}
      <Modal isOpen={showAddPhone} onClose={() => { setShowAddPhone(false); setNewPhone(''); setPhoneError(''); }} title="Добавить номер">
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-muted mb-1">Номер телефона</label>
            <input
              autoFocus
              type="tel"
              value={newPhone}
              onChange={(e) => { setNewPhone(e.target.value); setPhoneError(''); }}
              placeholder="+7 777 123 45 67"
              className="w-full bg-primary border border-border rounded-xl px-4 py-3 text-white font-mono focus:outline-none focus:border-accent"
            />
            {phoneError && <p className="text-danger text-xs mt-1">{phoneError}</p>}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setShowAddPhone(false)} className="flex-1">Отмена</Button>
            <Button onClick={handleAddPhone} className="flex-1">Добавить</Button>
          </div>
        </div>
      </Modal>

      {/* Clear confirm modal */}
      <Modal isOpen={showClearConfirm} onClose={() => setShowClearConfirm(false)} title="Очистить данные?">
        <div className="space-y-4">
          <p className="text-muted text-sm">Все доходы, расходы и цели будут удалены. Это действие нельзя отменить.</p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setShowClearConfirm(false)} className="flex-1">Отмена</Button>
            <Button variant="danger" onClick={handleClearAll} className="flex-1">Очистить всё</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

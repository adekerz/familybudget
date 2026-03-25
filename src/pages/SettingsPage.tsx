import { useState } from 'react';
import { Plus, Trash2, Download, Upload, LogOut, ChevronRight, Shield, Sliders, Tag, Lock } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { useAuthStore } from '../store/useAuthStore';
import { useIncomeStore } from '../store/useIncomeStore';
import { useExpenseStore } from '../store/useExpenseStore';
import { useGoalsStore } from '../store/useGoalsStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useCategoryStore } from '../store/useCategoryStore';
import { useFixedExpenseStore } from '../store/useFixedExpenseStore';
import { formatPhone, formatMoney } from '../lib/format';
import { Icon, FIXED_ICON_NAMES } from '../lib/icons';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';

export function SettingsPage() {
  const { whitelist, currentUser, addToWhitelist, removeFromWhitelist, logout } = useAuthStore();
  const { defaultRatios, updateDefaultRatios } = useSettingsStore();
  const categories = useCategoryStore((s) => s.categories);
  const setCategoryLimit = useCategoryStore((s) => s.setCategoryLimit);

  const fixedExpenses = useFixedExpenseStore((s) => s.fixedExpenses);
  const addFixedExpense = useFixedExpenseStore((s) => s.addFixedExpense);
  const removeFixedExpense = useFixedExpenseStore((s) => s.removeFixedExpense);
  const toggleFixedExpense = useFixedExpenseStore((s) => s.toggleFixedExpense);

  const [showAddFixed, setShowAddFixed] = useState(false);
  const [fixedName, setFixedName] = useState('');
  const [fixedAmount, setFixedAmount] = useState('');
  const [fixedIcon, setFixedIcon] = useState('Home');

  const [newPhone, setNewPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [showAddPhone, setShowAddPhone] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Distribution sliders local state
  const [ratios, setRatios] = useState(defaultRatios);
  const [ratiosSaved, setRatiosSaved] = useState(false);

  // Category limits modal
  const [editLimitCatId, setEditLimitCatId] = useState<string | null>(null);
  const [limitInput, setLimitInput] = useState('');

  const incomes = useIncomeStore((s) => s.incomes);
  const expenses = useExpenseStore((s) => s.expenses);
  const goals = useGoalsStore((s) => s.goals);

  function handleAddFixed() {
    const amt = parseInt(fixedAmount.replace(/\D/g, ''), 10) || 0;
    if (!fixedName.trim() || amt <= 0) return;
    addFixedExpense({ name: fixedName.trim(), amount: amt, icon: fixedIcon });
    setFixedName('');
    setFixedAmount('');
    setFixedIcon('Home');
    setShowAddFixed(false);
  }

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

  function handleSlider(key: 'mandatory' | 'flexible' | 'savings', val: number) {
    const others = Object.keys(ratios).filter((k) => k !== key) as (keyof typeof ratios)[];
    const remaining = 100 - val;
    const perOther = Math.round(remaining / 2);
    setRatios({
      ...ratios,
      [key]: val / 100,
      [others[0]]: perOther / 100,
      [others[1]]: (100 - val - perOther) / 100,
    });
    setRatiosSaved(false);
  }

  function handleSaveRatios() {
    updateDefaultRatios(ratios);
    setRatiosSaved(true);
    setTimeout(() => setRatiosSaved(false), 2000);
  }

  function handleOpenLimitEdit(catId: string) {
    const cat = categories.find((c) => c.id === catId);
    setLimitInput(cat?.monthlyLimit ? String(cat.monthlyLimit) : '');
    setEditLimitCatId(catId);
  }

  function handleSaveLimit() {
    if (!editLimitCatId) return;
    const val = parseInt(limitInput, 10);
    setCategoryLimit(editLimitCatId, val > 0 ? val : undefined);
    setEditLimitCatId(null);
  }

  const editLimitCat = categories.find((c) => c.id === editLimitCatId);

  const SLIDER_COLORS: Record<string, string> = {
    mandatory: 'text-accent',
    flexible: 'text-text2',
    savings: 'text-success',
  };
  const SLIDER_LABELS: Record<string, string> = {
    mandatory: 'Обязательные',
    flexible: 'Гибкие',
    savings: 'Накопления',
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 overflow-y-auto px-4 pt-4 pb-28 space-y-4">

        {/* Distribution defaults */}
        <section className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <Sliders size={16} className="text-accent" />
            <p className="font-semibold text-ink text-sm">Распределение дохода (по умолчанию)</p>
          </div>
          <div className="px-4 py-4 space-y-4">
            {(['mandatory', 'flexible', 'savings'] as const).map((key) => (
              <div key={key}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className={`font-medium ${SLIDER_COLORS[key]}`}>{SLIDER_LABELS[key]}</span>
                  <span className="font-bold text-ink">{Math.round(ratios[key] * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={80}
                  value={Math.round(ratios[key] * 100)}
                  onChange={(e) => handleSlider(key, parseInt(e.target.value))}
                  className="w-full accent-accent"
                />
              </div>
            ))}
            <button
              onClick={handleSaveRatios}
              className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] ${
                ratiosSaved
                  ? 'bg-success-bg text-success border border-success/30'
                  : 'bg-accent text-white hover:bg-accent/90'
              }`}
            >
              {ratiosSaved ? 'Сохранено!' : 'Сохранить'}
            </button>
            <p className="text-xs text-muted text-center">
              Применяется к новым доходам
            </p>
          </div>
        </section>

        {/* Fixed expenses */}
        <section className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Lock size={16} className="text-accent" />
              <p className="font-semibold text-ink text-sm">Фиксированные расходы</p>
            </div>
            <button
              onClick={() => setShowAddFixed(true)}
              className="text-accent text-xs flex items-center gap-1 hover:text-accent/80 transition-colors"
            >
              <Plus size={14} />
              Добавить
            </button>
          </div>
          {fixedExpenses.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-muted text-xs">Нет фиксированных расходов</p>
              <p className="text-muted text-[10px] mt-1">Аренда, коммуналка, интернет — вычитаются из дохода до распределения</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {fixedExpenses.map((fe) => (
                <div key={fe.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="w-7 h-7 rounded-[9px] bg-muted/10 flex items-center justify-center shrink-0">
                    <Icon name={fe.icon} size={14} strokeWidth={2} className="text-muted" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium text-ink ${!fe.isActive ? 'line-through opacity-50' : ''}`}>
                      {fe.name}
                    </p>
                  </div>
                  <p className={`text-sm font-bold text-ink ${!fe.isActive ? 'opacity-50' : ''}`}>
                    {formatMoney(fe.amount)}
                  </p>
                  <button
                    onClick={() => toggleFixedExpense(fe.id)}
                    className={`w-8 h-5 rounded-full transition-colors shrink-0 ${
                      fe.isActive ? 'bg-accent' : 'bg-border'
                    }`}
                  >
                    <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform mx-0.5 ${
                      fe.isActive ? 'translate-x-3' : 'translate-x-0'
                    }`} />
                  </button>
                  <button
                    onClick={() => removeFixedExpense(fe.id)}
                    className="text-muted hover:text-danger transition-colors p-1 shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="px-4 py-2 border-t border-border">
            <p className="text-[10px] text-muted text-center">
              Вычитаются из дохода до распределения 50/30/20
            </p>
          </div>
        </section>

        {/* Category limits */}
        <section className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <Tag size={16} className="text-accent" />
            <p className="font-semibold text-ink text-sm">Лимиты категорий</p>
          </div>
          <div className="divide-y divide-border">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between px-4 py-2.5">
                <p className="text-sm text-ink">{cat.name}</p>
                <button
                  onClick={() => handleOpenLimitEdit(cat.id)}
                  className={`text-xs font-semibold transition-colors ${
                    cat.monthlyLimit ? 'text-accent hover:text-accent-dark' : 'text-muted hover:text-ink'
                  }`}
                >
                  {cat.monthlyLimit ? formatMoney(cat.monthlyLimit) : 'Нет лимита'}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Whitelist */}
        <section className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-accent" />
              <p className="font-semibold text-ink text-sm">Доступ к приложению</p>
            </div>
            <button
              onClick={() => setShowAddPhone(true)}
              className="text-accent text-xs flex items-center gap-1 hover:text-accent/80 transition-colors"
            >
              <Plus size={14} />
              Добавить
            </button>
          </div>
          <div className="divide-y divide-border">
            {whitelist.map((phone) => (
              <div key={phone} className="flex items-center justify-between px-4 py-3 hover:bg-primary/70 transition-colors">
                <div>
                  <p className="text-ink text-sm font-semibold">{formatPhone(phone)}</p>
                  {phone === currentUser && (
                    <span className="inline-block bg-accent-light text-accent text-xs rounded-full px-2 py-0.5 mt-0.5">
                      Текущий пользователь
                    </span>
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
            <p className="font-semibold text-ink text-sm">Данные</p>
            <p className="text-muted text-xs mt-0.5">
              {incomes.length} доходов · {expenses.length} расходов · {goals.length} целей
            </p>
          </div>
          <div className="divide-y divide-border">
            <button
              onClick={handleExport}
              className="flex items-center justify-between w-full px-4 py-3 hover:bg-primary/70 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-success-bg flex items-center justify-center">
                  <Download size={15} className="text-success" />
                </div>
                <span className="text-ink text-sm">Экспорт данных (JSON)</span>
              </div>
              <ChevronRight size={14} className="text-muted" />
            </button>
            <label className="flex items-center justify-between w-full px-4 py-3 hover:bg-primary/70 transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-accent-light flex items-center justify-center">
                  <Upload size={15} className="text-accent" />
                </div>
                <span className="text-ink text-sm">Импорт данных (JSON)</span>
              </div>
              <ChevronRight size={14} className="text-muted" />
              <input type="file" accept=".json" className="hidden" onChange={handleImport} />
            </label>
            <button
              onClick={() => setShowClearConfirm(true)}
              className="flex items-center justify-between w-full px-4 py-3 hover:bg-primary/70 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-danger-bg flex items-center justify-center">
                  <Trash2 size={15} className="text-danger" />
                </div>
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
            className="flex items-center gap-3 w-full px-4 py-4 hover:bg-primary/70 transition-colors"
          >
            <div className="w-8 h-8 rounded-xl bg-danger-bg flex items-center justify-center">
              <LogOut size={15} className="text-danger" />
            </div>
            <span className="text-danger font-medium text-sm">Выйти из аккаунта</span>
          </button>
        </section>

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
              className="w-full bg-card border border-border rounded-xl px-4 py-3 text-ink font-semibold focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-light placeholder:text-muted"
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

      {/* Add fixed expense modal */}
      <Modal
        isOpen={showAddFixed}
        onClose={() => { setShowAddFixed(false); setFixedName(''); setFixedAmount(''); setFixedIcon('Home'); }}
        title="Фиксированный расход"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-muted mb-1">Название</label>
            <input
              autoFocus
              type="text"
              value={fixedName}
              onChange={(e) => setFixedName(e.target.value)}
              placeholder="Аренда квартиры"
              className="w-full bg-card border border-border rounded-xl px-4 py-3 text-ink font-semibold focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-light placeholder:text-muted"
            />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Сумма</label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={fixedAmount}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '');
                  setFixedAmount(digits ? parseInt(digits, 10).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : '');
                }}
                placeholder="0"
                className="w-full bg-card border border-border rounded-xl px-4 py-3 pr-10 text-ink font-bold text-lg focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-light placeholder:text-muted"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted">₸</span>
            </div>
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Иконка</label>
            <div className="flex flex-wrap gap-2">
              {FIXED_ICON_NAMES.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setFixedIcon(name)}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                    fixedIcon === name
                      ? 'bg-accent text-white'
                      : 'bg-card border border-border text-muted hover:border-accent/50'
                  }`}
                >
                  <Icon name={name} size={16} strokeWidth={2} />
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setShowAddFixed(false)} className="flex-1">Отмена</Button>
            <Button onClick={handleAddFixed} className="flex-1">Добавить</Button>
          </div>
        </div>
      </Modal>

      {/* Category limit modal */}
      <Modal
        isOpen={!!editLimitCatId}
        onClose={() => setEditLimitCatId(null)}
        title={`Лимит: ${editLimitCat?.name ?? ''}`}
      >
        <div className="space-y-4">
          <p className="text-muted text-sm">Месячный лимит. Оставьте пустым, чтобы убрать.</p>
          <div className="relative">
            <input
              autoFocus
              type="number"
              inputMode="numeric"
              value={limitInput}
              onChange={(e) => setLimitInput(e.target.value)}
              placeholder="0"
              className="w-full bg-card border border-border rounded-xl px-4 py-3 pr-10 text-ink font-bold text-lg focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-light placeholder:text-muted"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted">₸</span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setEditLimitCatId(null)} className="flex-1">Отмена</Button>
            <Button onClick={handleSaveLimit} className="flex-1">Сохранить</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Plus, Trash, FileText, SignOut, CaretRight, Sliders, Tag, Lock, Palette, Calendar, Users, Pencil, Fingerprint, DeviceMobile, Bell } from '@phosphor-icons/react';
import { subscribeToPush, unsubscribeFromPush, isPushSubscribed, isPushSupported } from '../lib/push';
import { generateBudgetPDF } from '../lib/pdfExport';
import { useBudgetSummary } from '../store/useBudgetStore';
import { Header } from '../components/layout/Header';
import { useAuthStore } from '../store/useAuthStore';
import { useIncomeStore } from '../store/useIncomeStore';
import { useExpenseStore } from '../store/useExpenseStore';
import { useGoalsStore } from '../store/useGoalsStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useCategoryStore } from '../store/useCategoryStore';
import { useFixedExpenseStore } from '../store/useFixedExpenseStore';
import { formatMoney } from '../lib/format';
import { Icon, FIXED_ICON_NAMES } from '../lib/icons';
import { supabase } from '../lib/supabase';
import { ThemeSwitcherFull } from '../components/ui/ThemeSwitcher';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { useToastStore } from '../store/useToastStore';
import { browserSupportsWebAuthn } from '../lib/webauthn';
import type { PasskeyCredential } from '../lib/webauthn';

export function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const registerPasskey = useAuthStore((s) => s.registerPasskey);
  const deleteUserPasskey = useAuthStore((s) => s.deleteUserPasskey);
  const listUserPasskeys = useAuthStore((s) => s.listUserPasskeys);
  const supportsWebAuthn = browserSupportsWebAuthn();

  const [passkeys, setPasskeys] = useState<PasskeyCredential[]>([]);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [deletingPasskeyId, setDeletingPasskeyId] = useState<string | null>(null);

  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const pushSupported = isPushSupported();

  useEffect(() => {
    if (user && supportsWebAuthn) {
      listUserPasskeys().then(setPasskeys);
    }
  }, [user?.id]);

  useEffect(() => {
    if (pushSupported) {
      isPushSubscribed().then(setPushSubscribed);
    }
  }, []);

  async function handleRegisterPasskey() {
    setPasskeyLoading(true);
    try {
      await registerPasskey();
      showToast('Face ID подключён', 'success');
      const updated = await listUserPasskeys();
      setPasskeys(updated);
    } catch {
      showToast('Не удалось подключить Face ID', 'error');
    }
    setPasskeyLoading(false);
  }

  async function handleDeletePasskey(id: string) {
    setDeletingPasskeyId(id);
    const ok = await deleteUserPasskey(id);
    if (ok) {
      setPasskeys(p => p.filter(pk => pk.id !== id));
      showToast('Face ID удалён', 'success');
    } else {
      showToast('Не удалось удалить Face ID', 'error');
    }
    setDeletingPasskeyId(null);
  }

  async function handleTogglePush() {
    setPushLoading(true);
    try {
      if (pushSubscribed) {
        await unsubscribeFromPush();
        setPushSubscribed(false);
        showToast('Уведомления отключены', 'success');
      } else {
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') {
          showToast('Разрешение отклонено', 'error');
          return;
        }
        const ok = await subscribeToPush();
        if (ok) {
          setPushSubscribed(true);
          showToast('Уведомления включены', 'success');
        } else {
          showToast('Не удалось подключить уведомления', 'error');
        }
      }
    } finally {
      setPushLoading(false);
    }
  }

  const {
    defaultRatios, updateDefaultRatios,
    incomeSources, addIncomeSource, updateIncomeSource, removeIncomeSource,
    payers, addPayer, removePayer, renamePayer,
  } = useSettingsStore();
  const showToast = useToastStore(s => s.show);
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

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Payers CRUD
  const [newPayerName, setNewPayerName] = useState('');
  const [editPayerId, setEditPayerId] = useState<string | null>(null);
  const [editPayerName, setEditPayerName] = useState('');

  // Income Sources CRUD
  const [showAddSource, setShowAddSource] = useState(false);
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceDay, setNewSourceDay] = useState<number | 'last'>(1);
  const [editSourceId, setEditSourceId] = useState<string | null>(null);
  const [editSourceDay, setEditSourceDay] = useState<number | 'last'>(1);

  // Distribution sliders local state
  const [ratios, setRatios] = useState(defaultRatios);
  const [ratiosSaved, setRatiosSaved] = useState(false);

  // Category limits modal
  const [editLimitCatId, setEditLimitCatId] = useState<string | null>(null);
  const [limitInput, setLimitInput] = useState('');

  const incomes = useIncomeStore((s) => s.incomes);
  const expenses = useExpenseStore((s) => s.expenses);
  const goals = useGoalsStore((s) => s.goals);
  const summary = useBudgetSummary();

  function handleAddFixed() {
    const amt = parseInt(fixedAmount.replace(/\D/g, ''), 10) || 0;
    if (!fixedName.trim() || amt <= 0) return;
    addFixedExpense({ name: fixedName.trim(), amount: amt, icon: fixedIcon });
    setFixedName('');
    setFixedAmount('');
    setFixedIcon('Home');
    setShowAddFixed(false);
  }

  function getCategoryName(id: string): string {
    return categories.find((c) => c.id === id)?.name ?? id;
  }

  function handleDownloadPDF() {
    generateBudgetPDF(incomes, expenses, goals, summary, getCategoryName);
  }

  async function handleClearAll() {
    const spaceId = user?.spaceId;
    if (spaceId) {
      await Promise.all([
        supabase.from('incomes').delete().eq('space_id', spaceId),
        supabase.from('expenses').delete().eq('space_id', spaceId),
        supabase.from('goals').delete().eq('space_id', spaceId),
      ]);
    }
    useIncomeStore.setState({ incomes: [] });
    useExpenseStore.setState({ expenses: [] });
    useGoalsStore.setState({ goals: [] });
    setShowClearConfirm(false);
    showToast('Все данные удалены', 'success');
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
    showToast('Настройки сохранены', 'success');
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

        {/* Theme switcher */}
        <section className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <Palette size={16} className="text-accent" />
            <p className="font-semibold text-ink text-sm">Оформление</p>
          </div>
          <div className="px-4 py-4">
            <ThemeSwitcherFull />
          </div>
        </section>

        {/* Income Sources */}
        <section className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-accent" />
              <p className="font-semibold text-ink text-sm">Источники и даты поступлений</p>
            </div>
            <button
              onClick={() => setShowAddSource(true)}
              className="text-accent text-xs flex items-center gap-1 hover:text-accent/80 transition-colors"
            >
              <Plus size={14} />
              Добавить
            </button>
          </div>
          {incomeSources.length === 0 ? (
            <div className="px-4 py-5 text-center">
              <p className="text-muted text-xs">Нет источников дохода</p>
              <p className="text-muted text-[10px] mt-1">Добавьте зарплату, аванс и другие поступления</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {incomeSources.map((src) => (
                <div key={src.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-ink font-medium">{src.name}</p>
                  </div>
                  {editSourceId === src.id ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={editSourceDay === 'last' ? 'last' : String(editSourceDay)}
                        onChange={e => setEditSourceDay(e.target.value === 'last' ? 'last' : parseInt(e.target.value))}
                        className="bg-card border border-border rounded-xl px-2 py-1 text-xs text-ink focus:outline-none focus:border-accent"
                      >
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                          <option key={d} value={d}>{d}-е</option>
                        ))}
                        <option value="last">Последний</option>
                      </select>
                      <button
                        onClick={() => {
                          updateIncomeSource(src.id, { day: editSourceDay });
                          setEditSourceId(null);
                        }}
                        className="text-xs text-accent font-semibold"
                      >Ок</button>
                      <button onClick={() => setEditSourceId(null)} className="text-xs text-muted">✕</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted">
                        {src.day === 'last' ? 'Последний' : `${src.day}-е`}
                      </span>
                      <button
                        onClick={() => { setEditSourceId(src.id); setEditSourceDay(src.day); }}
                        className="text-muted hover:text-accent transition-colors p-1"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => removeIncomeSource(src.id)}
                        className="text-muted hover:text-danger transition-colors p-1"
                      >
                        <Trash size={13} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Payers */}
        <section className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <Users size={16} className="text-accent" />
            <p className="font-semibold text-ink text-sm">Кто платил</p>
          </div>
          <div className="divide-y divide-border">
            {payers.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                {editPayerId === p.id ? (
                  <>
                    <input
                      type="text"
                      value={editPayerName}
                      onChange={e => setEditPayerName(e.target.value)}
                      className="flex-1 bg-card border border-border rounded-xl px-3 py-1.5 text-sm text-ink focus:outline-none focus:border-accent"
                    />
                    <button
                      onClick={() => { renamePayer(p.id, editPayerName); setEditPayerId(null); }}
                      className="text-xs text-accent font-semibold"
                    >Ок</button>
                    <button onClick={() => setEditPayerId(null)} className="text-xs text-muted">✕</button>
                  </>
                ) : (
                  <>
                    <p className="flex-1 text-sm text-ink">{p.name}</p>
                    <button
                      onClick={() => { setEditPayerId(p.id); setEditPayerName(p.name); }}
                      className="text-muted hover:text-accent transition-colors p-1"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => removePayer(p.id)}
                      className="text-muted hover:text-danger transition-colors p-1"
                    >
                      <Trash size={14} />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
          <div className="px-4 py-3 border-t border-border flex gap-2">
            <input
              type="text"
              value={newPayerName}
              onChange={e => setNewPayerName(e.target.value)}
              placeholder="Новый плательщик..."
              className="flex-1 bg-card border border-border rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent"
            />
            <button
              onClick={() => {
                if (!newPayerName.trim()) return;
                addPayer(newPayerName.trim());
                setNewPayerName('');
              }}
              className="px-3 py-2 bg-accent text-white rounded-xl text-sm font-semibold"
            >
              <Plus size={14} />
            </button>
          </div>
        </section>

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
                    <Trash size={14} />
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

        {/* WebAuthn / Face ID */}
        {supportsWebAuthn && (
          <section className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <Fingerprint size={16} className="text-accent" />
              <p className="font-semibold text-ink text-sm">Face ID / Touch ID</p>
            </div>
            <div className="px-4 py-3 space-y-3">
              {passkeys.length === 0 ? (
                <p className="text-xs text-muted">Нет зарегистрированных устройств</p>
              ) : (
                <div className="space-y-2">
                  {passkeys.map((pk) => (
                    <div key={pk.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <DeviceMobile size={15} className="text-muted shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-ink">
                            {pk.device_type === 'face_id' ? 'Face ID' :
                             pk.device_type === 'fingerprint' ? 'Отпечаток пальца' :
                             pk.device_type === 'windows_hello' ? 'Windows Hello' :
                             pk.device_type === 'security_key' ? 'Ключ безопасности' :
                             'Passkey'}
                          </p>
                          <p className="text-[10px] text-muted">
                            Добавлено {new Date(pk.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeletePasskey(pk.id)}
                        disabled={deletingPasskeyId === pk.id}
                        className="text-muted hover:text-danger transition-colors p-1 disabled:opacity-40"
                      >
                        <Trash size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={handleRegisterPasskey}
                disabled={passkeyLoading}
                className="flex items-center gap-2 text-accent text-xs font-semibold disabled:opacity-40"
              >
                <Plus size={14} />
                {passkeyLoading ? 'Настраиваем...' : 'Добавить устройство'}
              </button>
            </div>
          </section>
        )}

        {/* Push notifications */}
        {pushSupported && (
          <section className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <Bell size={16} className="text-accent" />
              <p className="font-semibold text-ink text-sm">Push-уведомления</p>
            </div>
            <div className="px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-ink">
                  {pushSubscribed ? 'Уведомления включены' : 'Уведомления выключены'}
                </p>
                <p className="text-[10px] text-muted mt-0.5">
                  Напоминания о бюджете и целях
                </p>
              </div>
              <button
                onClick={handleTogglePush}
                disabled={pushLoading}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 disabled:opacity-40 ${
                  pushSubscribed ? 'bg-accent' : 'bg-border'
                }`}
              >
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${
                  pushSubscribed ? 'left-6' : 'left-1'
                }`} />
              </button>
            </div>
          </section>
        )}

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
              onClick={handleDownloadPDF}
              className="flex items-center justify-between w-full px-4 py-3 hover:bg-primary/70 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-accent-light flex items-center justify-center">
                  <FileText size={15} className="text-accent" />
                </div>
                <span className="text-ink text-sm">Скачать отчёт PDF</span>
              </div>
              <CaretRight size={14} className="text-muted" />
            </button>
            <button
              onClick={() => setShowClearConfirm(true)}
              className="flex items-center justify-between w-full px-4 py-3 hover:bg-primary/70 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-danger-bg flex items-center justify-center">
                  <Trash size={15} className="text-danger" />
                </div>
                <span className="text-danger text-sm">Очистить все данные</span>
              </div>
              <CaretRight size={14} className="text-muted" />
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
              <SignOut size={15} className="text-danger" />
            </div>
            <span className="text-danger font-medium text-sm">Выйти из аккаунта</span>
          </button>
        </section>

        <p className="text-center text-muted text-xs pb-2">FamilyBudget v2.0 · Данные хранятся в Supabase</p>
      </main>

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

      {/* Add income source modal */}
      <Modal
        isOpen={showAddSource}
        onClose={() => { setShowAddSource(false); setNewSourceName(''); setNewSourceDay(1); }}
        title="Добавить источник дохода"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-muted mb-1">Название</label>
            <input
              type="text"
              value={newSourceName}
              onChange={e => setNewSourceName(e.target.value)}
              placeholder="Зарплата, аванс..."
              className="w-full bg-card border border-border rounded-xl px-4 py-3 text-ink focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">День поступления</label>
            <select
              value={newSourceDay === 'last' ? 'last' : String(newSourceDay)}
              onChange={e => setNewSourceDay(e.target.value === 'last' ? 'last' : parseInt(e.target.value))}
              className="w-full bg-card border border-border rounded-xl px-4 py-3 text-ink focus:outline-none focus:border-accent"
            >
              {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                <option key={d} value={d}>{d}-е число</option>
              ))}
              <option value="last">Последний день месяца</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setShowAddSource(false)} className="flex-1">Отмена</Button>
            <Button
              onClick={() => {
                if (!newSourceName.trim()) return;
                addIncomeSource({ name: newSourceName.trim(), day: newSourceDay });
                setNewSourceName('');
                setNewSourceDay(1);
                setShowAddSource(false);
                showToast('Источник добавлен', 'success');
              }}
              className="flex-1"
            >Добавить</Button>
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

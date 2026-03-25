import { useState, useEffect } from 'react';
import { Plus, Trash2, Users, Download, ShieldCheck, ArrowRight } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { useAuthStore } from '../store/useAuthStore';
import { supabase } from '../lib/supabase';
import type { UserRole } from '../types';
import { useToastStore } from '../store/useToastStore';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';

interface AppUserRow {
  id: string;
  username: string;
  role: UserRole;
  space_id: string;
  theme_id: string;
  created_at: string;
  last_login_at?: string;
}

interface SpaceRow {
  id: string;
  name: string;
}

interface WhitelistRow {
  phone: string;
}

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

export function AdminPage() {
  const { register } = useAuthStore();
  const showToast = useToastStore(s => s.show);

  const [spaces, setSpaces] = useState<SpaceRow[]>([]);
  const [users, setUsers] = useState<AppUserRow[]>([]);
  const [whitelist, setWhitelist] = useState<WhitelistRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Create space
  const [showCreateSpace, setShowCreateSpace] = useState(false);
  const [spaceName, setSpaceName] = useState('');

  // Create user
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newSpaceId, setNewSpaceId] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('member');
  const [createUserError, setCreateUserError] = useState('');

  // Recovery codes display
  const [showCodesModal, setShowCodesModal] = useState(false);
  const [codesForUser, setCodesForUser] = useState<string[]>([]);
  const [codesUsername, setCodesUsername] = useState('');
  const [codesDownloaded, setCodesDownloaded] = useState(false);

  // Migration
  const [_migratePhone, setMigratePhone] = useState('');
  const [migrateUsername, setMigrateUsername] = useState('');
  const [migratePassword, setMigratePassword] = useState('');
  const [migrateSpaceId, setMigrateSpaceId] = useState('');
  const [showMigrateForm, setShowMigrateForm] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [{ data: sp }, { data: us }, { data: wl }] = await Promise.all([
      supabase.from('spaces').select('*').order('created_at'),
      supabase.from('app_users').select('*').order('created_at'),
      supabase.from('whitelist').select('phone'),
    ]);
    setSpaces(sp ?? []);
    setUsers(us ?? []);
    setWhitelist(wl ?? []);
    setLoading(false);
    if (sp?.length) setNewSpaceId(sp[0].id);
    if (sp?.length) setMigrateSpaceId(sp[0].id);
  }

  async function handleCreateSpace() {
    if (!spaceName.trim()) return;
    const { data } = await supabase.from('spaces').insert({ name: spaceName.trim() }).select().single();
    if (data) {
      setSpaces(s => [...s, data]);
      showToast('Пространство создано', 'success');
    }
    setSpaceName('');
    setShowCreateSpace(false);
  }

  async function handleCreateUser() {
    setCreateUserError('');
    if (!newUsername.trim() || !newPassword || !newSpaceId) return;
    const result = await register(newUsername, newPassword, newSpaceId, newRole);
    if (!result.ok) {
      setCreateUserError(result.error === 'username_taken' ? 'Логин занят' : 'Space не найден');
      return;
    }
    setCodesForUser(result.recoveryCodes);
    setCodesUsername(newUsername.trim().toLowerCase());
    setCodesDownloaded(false);
    setShowCreateUser(false);
    setShowCodesModal(true);
    setNewUsername('');
    setNewPassword('');
    showToast('Аккаунт создан', 'success');
    await loadData();
  }

  async function handleDeleteUser(id: string) {
    await supabase.from('app_users').delete().eq('id', id);
    setUsers(u => u.filter(x => x.id !== id));
    showToast('Пользователь удалён', 'success');
  }

  async function handleMigrateUser(_phone: string) {
    if (!migrateUsername.trim() || !migratePassword || !migrateSpaceId) return;
    const result = await register(migrateUsername, migratePassword, migrateSpaceId, 'member');
    if (!result.ok) {
      showToast(result.error === 'username_taken' ? 'Логин занят' : 'Ошибка', 'error');
      return;
    }
    setCodesForUser(result.recoveryCodes);
    setCodesUsername(migrateUsername.trim().toLowerCase());
    setCodesDownloaded(false);
    setShowMigrateForm(null);
    setShowCodesModal(true);
    setMigrateUsername('');
    setMigratePassword('');
    showToast('Аккаунт создан', 'success');
    await loadData();
  }

  async function handleRemoveFromWhitelist(phone: string) {
    await supabase.from('whitelist').delete().eq('phone', phone);
    setWhitelist(w => w.filter(x => x.phone !== phone));
    showToast('Номер удалён из списка', 'success');
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-muted text-sm">Загрузка...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 overflow-y-auto px-4 pt-4 pb-28 space-y-5">
        <div className="flex items-center gap-2">
          <ShieldCheck size={20} className="text-accent" />
          <h2 className="text-base font-semibold text-ink">Панель администратора</h2>
        </div>

        {/* Spaces */}
        <section className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <p className="font-semibold text-ink text-sm">Пространства (spaces)</p>
            <button
              onClick={() => setShowCreateSpace(true)}
              className="text-accent text-xs flex items-center gap-1"
            >
              <Plus size={14} />
              Создать
            </button>
          </div>
          <div className="divide-y divide-border">
            {spaces.map(sp => (
              <div key={sp.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-ink">{sp.name}</p>
                  <p className="text-[10px] text-muted">{users.filter(u => u.space_id === sp.id).length} пользователей</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Users */}
        <section className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-accent" />
              <p className="font-semibold text-ink text-sm">Пользователи</p>
            </div>
            <button
              onClick={() => setShowCreateUser(true)}
              className="text-accent text-xs flex items-center gap-1"
            >
              <Plus size={14} />
              Создать
            </button>
          </div>
          <div className="divide-y divide-border">
            {users.map(u => (
              <div key={u.id} className="px-4 py-3 flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium text-ink">{u.username}</p>
                  <p className="text-[10px] text-muted">{u.role} · {spaces.find(s => s.id === u.space_id)?.name ?? u.space_id}</p>
                </div>
                <button
                  onClick={() => handleDeleteUser(u.id)}
                  className="w-11 h-11 flex items-center justify-center rounded-xl bg-danger-bg border border-danger/20 text-danger hover:bg-danger hover:text-white active:scale-95 transition-all"
                >
                  <Trash2 size={16} strokeWidth={2} />
                </button>
              </div>
            ))}
            {users.length === 0 && (
              <div className="px-4 py-6 text-center text-muted text-sm">Нет пользователей</div>
            )}
          </div>
        </section>

        {/* Migration from whitelist */}
        {whitelist.length > 0 && (
          <section className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <p className="font-semibold text-ink text-sm">Миграция со старой системы</p>
              <p className="text-[10px] text-muted mt-0.5">Привяжите номера телефонов к новым аккаунтам</p>
            </div>
            <div className="divide-y divide-border">
              {whitelist.map(w => (
                <div key={w.phone}>
                  <div className="px-4 py-3 flex items-center gap-3">
                    <p className="flex-1 text-sm text-ink font-medium">{w.phone}</p>
                    <button
                      onClick={() => { setShowMigrateForm(w.phone); setMigratePhone(w.phone); }}
                      className="flex items-center gap-1 text-accent text-xs font-semibold"
                    >
                      Создать аккаунт <ArrowRight size={12} />
                    </button>
                  </div>
                  {showMigrateForm === w.phone && (
                    <div className="px-4 pb-4 space-y-3">
                      <input
                        type="text"
                        value={migrateUsername}
                        onChange={e => setMigrateUsername(e.target.value)}
                        placeholder="Логин"
                        className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-sm text-ink focus:outline-none focus:border-accent"
                      />
                      <input
                        type="password"
                        value={migratePassword}
                        onChange={e => setMigratePassword(e.target.value)}
                        placeholder="Пароль"
                        className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-sm text-ink focus:outline-none focus:border-accent"
                      />
                      <select
                        value={migrateSpaceId}
                        onChange={e => setMigrateSpaceId(e.target.value)}
                        className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-sm text-ink focus:outline-none"
                      >
                        {spaces.map(sp => (
                          <option key={sp.id} value={sp.id}>{sp.name}</option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowMigrateForm(null)}
                          className="flex-1 py-2 rounded-xl text-sm text-muted border border-border"
                        >
                          Отмена
                        </button>
                        <button
                          onClick={() => handleMigrateUser(w.phone)}
                          disabled={!migrateUsername || !migratePassword}
                          className="flex-1 py-2 rounded-xl text-sm bg-accent text-white font-semibold disabled:opacity-40"
                        >
                          Создать
                        </button>
                      </div>
                      <button
                        onClick={() => handleRemoveFromWhitelist(w.phone)}
                        className="w-full text-[10px] text-danger hover:underline"
                      >
                        Удалить номер из whitelist
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Create Space Modal */}
      <Modal isOpen={showCreateSpace} onClose={() => setShowCreateSpace(false)} title="Новое пространство">
        <div className="space-y-4">
          <input
            type="text"
            value={spaceName}
            onChange={e => setSpaceName(e.target.value)}
            placeholder="Название (например: family)"
            className="w-full bg-card border border-border rounded-xl px-4 py-3 text-ink focus:outline-none focus:border-accent"
          />
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setShowCreateSpace(false)} className="flex-1">Отмена</Button>
            <Button onClick={handleCreateSpace} className="flex-1">Создать</Button>
          </div>
        </div>
      </Modal>

      {/* Create User Modal */}
      <Modal isOpen={showCreateUser} onClose={() => setShowCreateUser(false)} title="Новый пользователь">
        <div className="space-y-4">
          <input
            type="text"
            value={newUsername}
            onChange={e => setNewUsername(e.target.value)}
            placeholder="Логин"
            className="w-full bg-card border border-border rounded-xl px-4 py-3 text-ink focus:outline-none focus:border-accent"
          />
          <input
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            placeholder="Пароль"
            className="w-full bg-card border border-border rounded-xl px-4 py-3 text-ink focus:outline-none focus:border-accent"
          />
          <select
            value={newSpaceId}
            onChange={e => setNewSpaceId(e.target.value)}
            className="w-full bg-card border border-border rounded-xl px-4 py-3 text-ink focus:outline-none"
          >
            {spaces.map(sp => (
              <option key={sp.id} value={sp.id}>{sp.name}</option>
            ))}
          </select>
          <div className="flex gap-2">
            {(['member', 'admin', 'superadmin'] as const).map(r => (
              <button
                key={r}
                type="button"
                onClick={() => setNewRole(r)}
                className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${
                  newRole === r ? 'bg-accent text-white' : 'bg-card border border-border text-muted'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          {createUserError && <p className="text-danger text-xs">{createUserError}</p>}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setShowCreateUser(false)} className="flex-1">Отмена</Button>
            <Button onClick={handleCreateUser} className="flex-1">Создать</Button>
          </div>
        </div>
      </Modal>

      {/* Recovery Codes Modal */}
      <Modal isOpen={showCodesModal} onClose={() => {}} title="Коды восстановления">
        <div className="space-y-4">
          <p className="text-xs text-muted">Сохраните коды в безопасном месте. Они не будут показаны повторно.</p>
          <div className="bg-alice border border-alice-dark rounded-2xl p-4 space-y-1.5">
            {codesForUser.map((code, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[10px] text-muted w-4">{i + 1}.</span>
                <span className="font-mono text-sm font-bold text-ink tracking-wider">{code}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => { downloadCodes(codesForUser, codesUsername); setCodesDownloaded(true); }}
            className="w-full flex items-center justify-center gap-2 bg-accent text-white font-semibold py-3 rounded-xl active:scale-95 transition-all"
          >
            <Download size={16} />
            Скачать коды
          </button>
          <Button
            onClick={() => setShowCodesModal(false)}
            className="w-full"
            disabled={!codesDownloaded}
          >
            {codesDownloaded ? 'Закрыть' : 'Сначала скачайте коды'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

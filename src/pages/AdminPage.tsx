import { useState, useEffect } from 'react';
import { Plus, Trash, Users, ShieldCheck, Clock, Circle, DownloadSimple, Shield } from '@phosphor-icons/react';
import { Header } from '../components/layout/Header';
import { useAuthStore } from '../store/useAuthStore';
import { supabase } from '../lib/supabase';
import type { UserRole } from '../types';
import { useToastStore } from '../store/useToastStore';
import { useUndoStore } from '../store/useUndoStore';
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
  session_expires_at?: string;
}

interface SpaceRow {
  id: string;
  name: string;
}

function generateTempPassword(): string {
  const adjectives = ['Blue', 'Fast', 'Calm', 'Soft', 'Bold', 'Warm', 'Cool', 'Bright'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${adj}${num}`;
}

function isOnline(userId: string, onlineUsers: string[]): boolean {
  return onlineUsers.includes(userId);
}

function formatLastLogin(dateStr?: string): string {
  if (!dateStr) return 'Никогда';
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMin < 1) return 'Только что';
  if (diffMin < 60) return `${diffMin} мин. назад`;
  if (diffHours < 24) return `${diffHours} ч. назад`;
  if (diffDays < 7) return `${diffDays} д. назад`;
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}


const FAMILY_SPACE_NAME = 'family';

export function AdminPage() {
  const { register, changeUserRole } = useAuthStore();
  const currentUser = useAuthStore(s => s.user);
  const onlineUsers = useAuthStore(s => s.onlineUsers) || [];
  const showToast = useToastStore(s => s.show);

  const [spaces, setSpaces] = useState<SpaceRow[]>([]);
  const [users, setUsers] = useState<AppUserRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Create space
  const [showCreateSpace, setShowCreateSpace] = useState(false);
  const [spaceName, setSpaceName] = useState('');

  // Create user
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newSpaceId, setNewSpaceId] = useState('');
  const [createUserError, setCreateUserError] = useState('');
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [copiedPassword, setCopiedPassword] = useState(false);

  // Show created user info (temp password + note about recovery codes)
  const [showUserCreated, setShowUserCreated] = useState(false);
  const [createdUsername, setCreatedUsername] = useState('');
  const [createdTempPassword, setCreatedTempPassword] = useState('');
  const [copiedCreatedPass, setCopiedCreatedPass] = useState(false);

  // Delete user confirm
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const deleteUser = users.find(u => u.id === deleteUserId);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [{ data: sp }, { data: us }] = await Promise.all([
      supabase.from('spaces').select('*').order('created_at'),
      supabase.from('app_users').select('id, username, role, space_id, theme_id, created_at, last_login_at, session_expires_at').order('created_at'),
    ]);
    setSpaces(sp ?? []);
    setUsers(us ?? []);
    setLoading(false);
    if (sp?.length) setNewSpaceId(sp[0].id);
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
    if (!newUsername.trim() || !newSpaceId) return;
    const tempPass = generatedPassword || generateTempPassword();
    const result = await register(newUsername, tempPass, newSpaceId, 'member');
    if (!result.ok) {
      setCreateUserError(result.error === 'username_taken' ? 'Логин занят' : 'Space не найден');
      return;
    }
    setShowCreateUser(false);
    setCreatedUsername(newUsername.trim().toLowerCase());
    setCreatedTempPassword(tempPass);
    setCopiedCreatedPass(false);
    setNewUsername('');
    setGeneratedPassword('');
    setCopiedPassword(false);
    setShowUserCreated(true);
    await loadData();
  }

  async function handleDeleteUser(id: string) {
    const user = users.find(u => u.id === id);
    if (!user) return;
    setDeleteUserId(null);

    // Оптимистично убираем из списка
    setUsers(prev => prev.filter(u => u.id !== id));

    useUndoStore.getState().show({
      message: `Пользователь «${user.username}» удалён`,
      duration: 5000,
      onUndo: () => {
        setUsers(prev => [...prev, user].sort((a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        ));
      },
      onConfirm: async () => {
        await supabase.from('app_users').delete().eq('id', id);
      },
    });
  }

  async function handleChangeRole(userId: string, newRole: 'admin' | 'member') {
    const ok = await changeUserRole(userId, newRole);
    if (ok) {
      setUsers(u => u.map(x => x.id === userId ? { ...x, role: newRole } : x));
      showToast('Роль изменена', 'success');
    }
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

  const isAdmin = currentUser?.role === 'admin';

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
              onClick={() => { setGeneratedPassword(generateTempPassword()); setCopiedPassword(false); setShowCreateUser(true); }}
              className="text-accent text-xs flex items-center gap-1"
            >
              <Plus size={14} />
              Создать
            </button>
          </div>
          <div className="divide-y divide-border">
            {users.map(u => {
              const spaceName_ = spaces.find(s => s.id === u.space_id)?.name ?? u.space_id;
              const isSelf = u.id === currentUser?.id;
              const isFamilySpace = spaceName_.toLowerCase() === FAMILY_SPACE_NAME;
              const canChangeRole = isAdmin && !isSelf && !isFamilySpace;
              const online = isOnline(u.id, onlineUsers);
              return (
                <div key={u.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-ink">{u.username}</p>
                      {online && (
                        <span className="flex items-center gap-1 text-[10px] text-success font-medium">
                          <Circle size={6} weight="fill" className="text-success" />
                          онлайн
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted">{u.role} · {spaceName_}</p>
                    <p className="text-[10px] text-muted flex items-center gap-1 mt-0.5">
                      <Clock size={9} />
                      {formatLastLogin(u.last_login_at)}
                    </p>
                  </div>
                  {canChangeRole && (
                    <button
                      onClick={() => handleChangeRole(u.id, u.role === 'member' ? 'admin' : 'member')}
                      className="text-xs font-semibold text-accent border border-accent/30 rounded-lg px-2.5 py-1.5 hover:bg-accent/10 active:scale-95 transition-all shrink-0"
                    >
                      {u.role === 'member' ? 'Сделать админом' : 'Участник'}
                    </button>
                  )}
                  <button
                    onClick={() => setDeleteUserId(u.id)}
                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-danger-bg border border-danger/20 text-danger hover:bg-danger hover:text-white active:scale-95 transition-all shrink-0"
                  >
                    <Trash size={15} />
                  </button>
                </div>
              );
            })}
            {users.length === 0 && (
              <div className="px-4 py-6 text-center text-muted text-sm">Нет пользователей</div>
            )}
          </div>
        </section>
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
      <Modal
        isOpen={showCreateUser}
        onClose={() => { setShowCreateUser(false); setNewUsername(''); setGeneratedPassword(''); setCopiedPassword(false); setCreateUserError(''); }}
        title="Новый пользователь"
      >
        <div className="space-y-4">
          <input
            type="text"
            autoFocus
            value={newUsername}
            onChange={e => setNewUsername(e.target.value)}
            placeholder="Логин (например: alina)"
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

          <div className="bg-warning-bg border border-warning/30 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-warning font-semibold">Временный пароль</p>
              <button
                type="button"
                onClick={() => { setGeneratedPassword(generateTempPassword()); setCopiedPassword(false); }}
                className="text-[10px] text-warning underline"
              >
                Обновить
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex-1 font-mono text-sm font-bold text-ink bg-card border border-border rounded-lg px-3 py-2">
                {generatedPassword}
              </span>
              <button
                type="button"
                onClick={() => { navigator.clipboard.writeText(generatedPassword); setCopiedPassword(true); }}
                className={`text-xs px-3 py-2 rounded-lg font-semibold transition-all ${copiedPassword ? 'bg-success-bg text-success' : 'bg-accent text-white'}`}
              >
                {copiedPassword ? 'Скопирован!' : 'Копировать'}
              </button>
            </div>
            <p className="text-[10px] text-warning/80">
              Передайте пользователю. При первом входе обязательна смена пароля — тогда появятся коды восстановления.
            </p>
          </div>

          <p className="text-xs text-muted">Роль: участник — можно изменить после создания</p>
          {createUserError && <p className="text-danger text-xs">{createUserError}</p>}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => { setShowCreateUser(false); setNewUsername(''); setGeneratedPassword(''); }} className="flex-1">Отмена</Button>
            <Button onClick={handleCreateUser} className="flex-1">Создать</Button>
          </div>
        </div>
      </Modal>

      {/* User Created Info Modal */}
      <Modal isOpen={showUserCreated} onClose={() => setShowUserCreated(false)} title="Аккаунт создан">
        <div className="space-y-4">
          <div className="text-center">
            <div className="w-12 h-12 bg-success-bg rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Shield size={24} className="text-success" />
            </div>
            <p className="text-sm text-muted">
              Аккаунт <span className="font-bold text-ink">{createdUsername}</span> создан.
              Передайте пользователю временный пароль.
            </p>
          </div>

          <div className="bg-alice border border-alice-dark rounded-xl p-3 space-y-2">
            <p className="text-xs font-semibold text-accent">Временный пароль</p>
            <div className="flex items-center gap-2">
              <span className="flex-1 font-mono text-sm font-bold text-ink bg-card border border-border rounded-lg px-3 py-2">
                {createdTempPassword}
              </span>
              <button
                onClick={() => { navigator.clipboard.writeText(createdTempPassword); setCopiedCreatedPass(true); }}
                className={`text-xs px-3 py-2 rounded-lg font-semibold transition-all ${copiedCreatedPass ? 'bg-success-bg text-success' : 'bg-accent text-white'}`}
              >
                {copiedCreatedPass ? 'Скопирован!' : 'Копировать'}
              </button>
            </div>
          </div>

          <div className="bg-sand/40 border border-border rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <DownloadSimple size={14} className="text-muted" />
              <p className="text-xs font-semibold text-ink">Коды восстановления</p>
            </div>
            <p className="text-[11px] text-muted">
              Коды восстановления будут сгенерированы автоматически, когда пользователь сменит временный пароль при первом входе. Их покажут на экране для скачивания.
            </p>
          </div>

          <Button onClick={() => setShowUserCreated(false)} className="w-full">Понятно</Button>
        </div>
      </Modal>

      {/* Delete User Confirm Modal */}
      <Modal isOpen={!!deleteUserId} onClose={() => setDeleteUserId(null)} title="Удалить пользователя?">
        <div className="space-y-4">
          <p className="text-muted text-sm">
            Пользователь <span className="font-bold text-ink">«{deleteUser?.username}»</span> будет удалён. Все его данные останутся в пространстве.
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setDeleteUserId(null)} className="flex-1">Отмена</Button>
            <Button variant="danger" onClick={() => deleteUserId && handleDeleteUser(deleteUserId)} className="flex-1">Удалить</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

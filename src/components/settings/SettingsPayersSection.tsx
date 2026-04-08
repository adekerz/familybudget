import { useState } from 'react';
import { Users, Plus, Pencil, Trash } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../../store/useSettingsStore';
import BottomSheet from '../ui/BottomSheet';
import { EmptyState } from '../ui/EmptyState';

export function SettingsPayersSection() {
  const { t } = useTranslation();
  const { payers, addPayer, removePayer, renamePayer } = useSettingsStore();

  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [newName, setNewName] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  function handleAdd() {
    if (!newName.trim()) return;
    addPayer(newName.trim());
    setNewName('');
    setShowAdd(false);
  }

  function handleEditOpen(id: string, name: string) {
    setEditId(id);
    setEditName(name);
    setShowEdit(true);
  }

  function handleEditSave() {
    if (editId) renamePayer(editId, editName);
    setShowEdit(false);
    setEditId(null);
    setEditName('');
  }

  return (
    <>
      <section className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-accent" />
            <p className="font-semibold text-ink text-sm">{t('payers_title')}</p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="text-accent text-xs flex items-center gap-1 hover:text-accent/80 transition-colors"
          >
            <Plus size={14} />{t('add_label')}
          </button>
        </div>

        {payers.length === 0 ? (
          <EmptyState
            icon={Users}
            title={t('payers_title')}
            hint={t('new_payer_placeholder')}
            actionLabel={t('add_label')}
            onAction={() => setShowAdd(true)}
          />
        ) : (
          <div className="divide-y divide-border">
            {payers.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                <p className="flex-1 text-sm text-ink">{p.name}</p>
                <button onClick={() => handleEditOpen(p.id, p.name)} className="text-muted hover:text-accent transition-colors p-1"><Pencil size={13} /></button>
                <button onClick={() => removePayer(p.id)} className="text-muted hover:text-danger transition-colors p-1"><Trash size={14} /></button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Add modal */}
      <BottomSheet isOpen={showAdd} onClose={() => { setShowAdd(false); setNewName(''); }} title={t('add_label')}>
        <div>
          <label className="block text-xs text-muted mb-1">{t('name_label')}</label>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t('new_payer_placeholder')}
            className="w-full bg-card border border-border rounded-xl px-4 py-3 text-ink focus:outline-none focus:border-accent"
            autoFocus
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowAdd(false); setNewName(''); }}
            className="flex-1 py-3 rounded-xl text-sm font-semibold"
            style={{ background: 'var(--sand)', color: 'var(--text2)' }}
          >
            {t('cancel')}
          </button>
          <button
            onClick={handleAdd}
            className="flex-1 py-3 rounded-xl text-sm font-bold"
            style={{ background: 'var(--cer)', color: '#fff' }}
          >
            {t('save')}
          </button>
        </div>
      </BottomSheet>

      {/* Edit modal */}
      <BottomSheet isOpen={showEdit} onClose={() => setShowEdit(false)} title={t('edit_goal')}>
        <div>
          <label className="block text-xs text-muted mb-1">{t('name_label')}</label>
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="w-full bg-card border border-border rounded-xl px-4 py-3 text-ink focus:outline-none focus:border-accent"
            autoFocus
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowEdit(false)}
            className="flex-1 py-3 rounded-xl text-sm font-semibold"
            style={{ background: 'var(--sand)', color: 'var(--text2)' }}
          >
            {t('cancel')}
          </button>
          <button
            onClick={handleEditSave}
            className="flex-1 py-3 rounded-xl text-sm font-bold"
            style={{ background: 'var(--cer)', color: '#fff' }}
          >
            {t('save')}
          </button>
        </div>
      </BottomSheet>
    </>
  );
}

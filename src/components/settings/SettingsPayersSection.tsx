import { useState } from 'react';
import { Users, Plus, Pencil, Trash } from '@phosphor-icons/react';
import { useSettingsStore } from '../../store/useSettingsStore';

export function SettingsPayersSection() {
  const { payers, addPayer, removePayer, renamePayer } = useSettingsStore();

  const [newName, setNewName] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  return (
    <section className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <Users size={16} className="text-accent" />
        <p className="font-semibold text-ink text-sm">Кто платил</p>
      </div>

      <div className="divide-y divide-border">
        {payers.map((p) => (
          <div key={p.id} className="flex items-center gap-3 px-4 py-2.5">
            {editId === p.id ? (
              <>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 bg-card border border-border rounded-xl px-3 py-1.5 text-sm text-ink focus:outline-none focus:border-accent"
                />
                <button onClick={() => { renamePayer(p.id, editName); setEditId(null); }} className="text-xs text-accent font-semibold">Ок</button>
                <button onClick={() => setEditId(null)} className="text-xs text-muted">✕</button>
              </>
            ) : (
              <>
                <p className="flex-1 text-sm text-ink">{p.name}</p>
                <button onClick={() => { setEditId(p.id); setEditName(p.name); }} className="text-muted hover:text-accent transition-colors p-1"><Pencil size={13} /></button>
                <button onClick={() => removePayer(p.id)} className="text-muted hover:text-danger transition-colors p-1"><Trash size={14} /></button>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="px-4 py-3 border-t border-border flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Новый плательщик..."
          className="flex-1 bg-card border border-border rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent"
        />
        <button
          onClick={() => { if (!newName.trim()) return; addPayer(newName.trim()); setNewName(''); }}
          className="px-3 py-2 bg-accent text-white rounded-xl text-sm font-semibold active:scale-[0.97]"
        >
          <Plus size={14} />
        </button>
      </div>
    </section>
  );
}

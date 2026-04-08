import { useState } from 'react';
import { Calendar, Plus, Pencil, Trash } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useToastStore } from '../../store/useToastStore';
import BottomSheet from '../ui/BottomSheet';
import Button from '../ui/Button';

export function SettingsIncomeSourcesSection() {
  const { t } = useTranslation();
  const { incomeSources, addIncomeSource, updateIncomeSource, removeIncomeSource } = useSettingsStore();
  const showToast = useToastStore((s) => s.show);

  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDay, setNewDay] = useState<number | 'last'>(1);
  const [editId, setEditId] = useState<string | null>(null);
  const [editDay, setEditDay] = useState<number | 'last'>(1);

  function handleAdd() {
    if (!newName.trim()) return;
    addIncomeSource({ name: newName.trim(), day: newDay });
    setNewName('');
    setNewDay(1);
    setShowAdd(false);
    showToast(t('expense_added'), 'success');
  }

  const dayOptions = Array.from({ length: 31 }, (_, i) => i + 1);

  return (
    <>
      <section className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-accent" />
            <p className="font-semibold text-ink text-sm">{t('income_sources_title')}</p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="text-accent text-xs flex items-center gap-1 hover:text-accent/80 transition-colors"
          >
            <Plus size={14} />{t('add_label')}
          </button>
        </div>

        {incomeSources.length === 0 ? (
          <div className="px-4 py-5 text-center">
            <p className="text-muted text-xs">{t('no_income_sources')}</p>
            <p className="text-muted text-[10px] mt-1">{t('add_income_sources_hint')}</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {incomeSources.map((src) => (
              <div key={src.id} className="flex items-center gap-3 px-4 py-2.5">
                <p className="flex-1 text-sm text-ink font-medium">{src.name}</p>
                {editId === src.id ? (
                  <div className="flex items-center gap-2">
                    <select
                      value={editDay === 'last' ? 'last' : String(editDay)}
                      onChange={(e) => setEditDay(e.target.value === 'last' ? 'last' : parseInt(e.target.value))}
                      className="bg-card border border-border rounded-xl px-2 py-1 text-xs text-ink focus:outline-none focus:border-accent"
                    >
                      {dayOptions.map((d) => <option key={d} value={d}>{d}-е</option>)}
                      <option value="last">{t('last_day')}</option>
                    </select>
                    <button onClick={() => { updateIncomeSource(src.id, { day: editDay }); setEditId(null); }} className="text-xs text-accent font-semibold">{t('ok_short')}</button>
                    <button onClick={() => setEditId(null)} className="text-xs text-muted">✕</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted">{src.day === 'last' ? t('last_day') : t('day_ordinal', { count: src.day })}</span>
                    <button onClick={() => { setEditId(src.id); setEditDay(src.day); }} className="text-muted hover:text-accent transition-colors p-1"><Pencil size={13} /></button>
                    <button onClick={() => removeIncomeSource(src.id)} className="text-muted hover:text-danger transition-colors p-1"><Trash size={13} /></button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <BottomSheet isOpen={showAdd} onClose={() => { setShowAdd(false); setNewName(''); setNewDay(1); }} title={t('add_income_source_title')}>
        <div>
          <label className="block text-xs text-muted mb-1">{t('source_name')}</label>
          <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={t('income_sources_placeholder')} className="w-full bg-card border border-border rounded-xl px-4 py-3 text-ink focus:outline-none focus:border-accent" />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">{t('income_day')}</label>
          <select value={newDay === 'last' ? 'last' : String(newDay)} onChange={(e) => setNewDay(e.target.value === 'last' ? 'last' : parseInt(e.target.value))} className="w-full bg-card border border-border rounded-xl px-4 py-3 text-ink focus:outline-none focus:border-accent">
            {dayOptions.map((d) => <option key={d} value={d}>{t('day_of_month', { count: d })}</option>)}
            <option value="last">{t('last_day_of_month')}</option>
          </select>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setShowAdd(false)} className="flex-1">{t('cancel')}</Button>
          <Button onClick={handleAdd} className="flex-1">{t('add_label')}</Button>
        </div>
      </BottomSheet>
    </>
  );
}

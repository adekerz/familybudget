import { useEffect, useState } from 'react';
import { Warning, X } from '@phosphor-icons/react';
import { RiskEngine } from '../../services/RiskEngine';
import { useAuthStore } from '../../store/useAuthStore';
import type { RiskWarning } from '../../types';

export function RiskWarningsWidget() {
  const spaceId = useAuthStore((s) => s.user?.spaceId);
  const [warnings, setWarnings] = useState<RiskWarning[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!spaceId) return;
    RiskEngine.getActiveWarnings(spaceId).then(setWarnings);
  }, [spaceId]);

  const visible = warnings.filter((_, i) => !dismissed.has(String(i)));
  if (visible.length === 0) return null;

  return (
    <div className="px-4 pb-2 space-y-2">
      {visible.map((w, i) => (
        <div
          key={i}
          className="flex items-start gap-2 px-3 py-2.5 rounded-xl"
          style={{
            background: w.severity === 'critical' ? 'var(--expense-bg)' : 'rgba(253,203,110,0.12)',
            border: `1px solid ${w.severity === 'critical' ? 'var(--expense)' : 'var(--color-warning, #FDCB6E)'}`,
          }}
        >
          <Warning
            size={14}
            weight="fill"
            style={{ color: w.severity === 'critical' ? 'var(--expense)' : '#FDCB6E', flexShrink: 0, marginTop: 2 }}
          />
          <p className="flex-1 text-xs" style={{ color: 'var(--ink)' }}>{w.message}</p>
          <button
            onClick={() => setDismissed((prev) => new Set([...prev, String(i)]))}
            className="p-0.5"
            style={{ color: 'var(--text3)' }}
          >
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}

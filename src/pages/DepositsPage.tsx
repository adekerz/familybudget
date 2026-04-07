import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash, Vault } from '@phosphor-icons/react';
import { Header } from '../components/layout/Header';
import { DepositCalculator } from '../components/deposits/DepositCalculator';
import { useDepositStore } from '../store/useDepositStore';
import { formatMoney } from '../lib/format';

export function DepositsPage() {
  const { t } = useTranslation();
  const { deposits, loading, loadDeposits, removeDeposit } = useDepositStore();
  const [showCalc, setShowCalc] = useState(false);

  useEffect(() => { loadDeposits(); }, []);

  const totalDeposited = deposits.reduce((s, d) => s + d.currentAmount, 0);

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--page)' }}>
      <Header />

      <div className="px-4 py-4 space-y-4 max-w-lg mx-auto">
        {/* Summary */}
        <div className="rounded-2xl p-5" style={{ background: 'var(--card)' }}>
          <p className="text-xs mb-1" style={{ color: 'var(--text3)' }}>{t('total_deposits')}</p>
          <p className="text-2xl font-extrabold" style={{ color: 'var(--cer)' }}>
            {formatMoney(totalDeposited)}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text3)' }}>{t('deposit_count', { count: deposits.length })}</p>
        </div>

        {/* Deposits list */}
        {loading ? (
          <p className="text-center py-8" style={{ color: 'var(--text3)' }}>{t('loading')}</p>
        ) : deposits.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <Vault size={40} style={{ color: 'var(--text3)' }} weight="thin" />
            <p className="text-sm font-semibold mt-3" style={{ color: 'var(--ink)' }}>
              {t('no_deposits_title')}
            </p>
            <p className="text-xs mt-1 max-w-[240px]" style={{ color: 'var(--text3)' }}>
              {t('no_deposits_hint')}
            </p>
            <button
              onClick={() => setShowCalc(true)}
              className="mt-4 px-5 py-2.5 rounded-xl text-sm font-bold"
              style={{ background: 'var(--cer)', color: '#fff' }}
            >
              {t('add_deposit')}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {deposits.map((dep) => {
              const monthsRemaining = dep.endDate
                ? Math.max(0, Math.ceil(
                    (new Date(dep.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30)
                  ))
                : null;
              return (
                <div key={dep.id} className="rounded-2xl p-4 space-y-2" style={{ background: 'var(--card)' }}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold" style={{ color: 'var(--ink)' }}>{dep.name}</p>
                      <p className="text-xs" style={{ color: 'var(--text3)' }}>
                        {dep.interestRate}% {t('annual_rate')}
                        {dep.capitalization ? ` · ${t('with_capitalization')}` : ''}
                        {monthsRemaining !== null && ` · ${t('months_remaining', { count: monthsRemaining })}`}
                      </p>
                    </div>
                    <button
                      onClick={() => removeDeposit(dep.id)}
                      className="p-1.5 rounded-lg"
                      style={{ color: 'var(--text3)' }}
                    >
                      <Trash size={16} />
                    </button>
                  </div>
                  <div className="flex justify-between">
                    <div>
                      <p className="text-xs" style={{ color: 'var(--text3)' }}>{t('current_amount')}</p>
                      <p className="font-extrabold tabular-nums" style={{ color: 'var(--cer)' }}>
                        {formatMoney(dep.currentAmount)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs" style={{ color: 'var(--text3)' }}>{t('initial_amount')}</p>
                      <p className="font-semibold tabular-nums" style={{ color: 'var(--ink)' }}>
                        {formatMoney(dep.initialAmount)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add button */}
        <button
          onClick={() => setShowCalc(true)}
          className="w-full py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2"
          style={{ background: 'var(--card)', color: 'var(--cer)', border: '2px dashed var(--cer)' }}
        >
          <Plus size={18} weight="bold" />
          {t('add_deposit')}
        </button>
      </div>

      {/* Calculator modal */}
      {showCalc && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center p-4 bg-black/50"
          onClick={(e) => e.target === e.currentTarget && setShowCalc(false)}
        >
          <div
            className="w-full max-w-lg rounded-3xl p-6 overflow-y-auto"
            style={{ background: 'var(--card)', maxHeight: '92vh' }}
          >
            <DepositCalculator onClose={() => setShowCalc(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

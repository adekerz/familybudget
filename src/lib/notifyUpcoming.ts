import { supabase } from './supabase';
import { useAuthStore } from '../store/useAuthStore';
import { isPushSubscribed } from './push';

const NOTIFY_KEY = 'fb_notified_ids'
const LAST_CHECK_KEY = 'fb_notify_last_check'
const MIN_INTERVAL_MS = 4 * 60 * 60 * 1000 // не чаще раза в 4 часа
const DAYS_AHEAD = 2;

/**
 * Проверяет planned_transactions на ближайшие DAYS_AHEAD дней
 * и отправляет push если ещё не отправляли сегодня.
 * Вызывать при открытии приложения и при возврате на вкладку.
 */
export async function checkAndNotifyUpcoming(): Promise<void> {
  // Не чаще MIN_INTERVAL_MS
  const lastCheck = Number(localStorage.getItem(LAST_CHECK_KEY) ?? 0);
  if (Date.now() - lastCheck < MIN_INTERVAL_MS) return;

  // Проверяем что push подключён
  if (!(await isPushSubscribed())) return;

  const user = useAuthStore.getState().user;
  if (!user?.spaceId) return;

  const today = new Date();
  const deadline = new Date(today.getTime() + DAYS_AHEAD * 24 * 60 * 60 * 1000);
  const todayStr    = today.toISOString().split('T')[0];
  const deadlineStr = deadline.toISOString().split('T')[0];

  // Загружаем pending транзакции в ближайшие DAYS_AHEAD дней
  const { data } = await supabase
    .from('planned_transactions')
    .select('id, title, amount, scheduled_date')
    .eq('space_id', user.spaceId)
    .eq('status', 'pending')
    .eq('type', 'expense')
    .gte('scheduled_date', todayStr)
    .lte('scheduled_date', deadlineStr)
    .order('scheduled_date');

  if (!data || data.length === 0) return;

  // Читаем уже уведомлённые ID (сохраняются в localStorage между сессиями)
  let notified: Record<string, string> = {};
  try {
    const raw = localStorage.getItem(NOTIFY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, string>;
      // Оставляем только сегодняшние записи
      for (const [id, date] of Object.entries(parsed)) {
        if (date === todayStr) notified[id] = date;
      }
    }
  } catch { /* ignore */ }

  // Фильтруем новые (ещё не уведомляли в эту сессию)
  const toNotify = (data as { id: string; title: string; amount: number; scheduled_date: string }[])
    .filter(tx => !notified[tx.id]);

  if (toNotify.length === 0) return;

  const fmt = (n: number) =>
    new Intl.NumberFormat('ru-KZ', { style: 'currency', currency: 'KZT', maximumFractionDigits: 0 }).format(n);

  // Формируем текст
  let title: string;
  let body: string;

  if (toNotify.length === 1) {
    const tx = toNotify[0];
    const daysLeft = Math.ceil(
      (new Date(tx.scheduled_date).getTime() - today.getTime()) / 86400000
    );
    title = daysLeft === 0 ? '💳 Сегодня списание' : `💳 Через ${daysLeft} дн. списание`;
    body = `${tx.title}: ${fmt(tx.amount)}`;
  } else {
    const total = toNotify.reduce((s, tx) => s + tx.amount, 0);
    title = `💳 ${toNotify.length} платежа в ближайшие ${DAYS_AHEAD} дня`;
    body = `Общая сумма: ${fmt(total)}`;
  }

  // Отправляем через Edge Function
  try {
    const sessionToken = useAuthStore.getState().sessionToken;
    await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/push-notify`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          title,
          body,
          url: '/budget',
          space_id: user.spaceId,
        }),
      }
    );

    // Помечаем как уведомлённые
    toNotify.forEach(tx => { notified[tx.id] = todayStr; });
    localStorage.setItem(NOTIFY_KEY, JSON.stringify(notified));
    localStorage.setItem(LAST_CHECK_KEY, String(Date.now()));
  } catch { /* ignore — не ломаем приложение */ }
}

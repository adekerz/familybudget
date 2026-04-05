import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

Deno.serve(async (req) => {
  // Проверка секрета — защита от неавторизованных вызовов
  const secret = req.headers.get('x-cron-secret');
  const expectedSecret = Deno.env.get('CRON_SECRET');
  if (expectedSecret && secret !== expectedSecret) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { type } = await req.json().catch(() => ({ type: 'morning' }));

  // Получить все push подписки
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('subscription, user_id');

  if (!subs?.length) return new Response('No subscribers');

  // Для каждого пользователя — считаем данные
  for (const sub of subs) {
    try {
      const { data: user } = await supabase
        .from('app_users')
        .select('space_id, notify_morning, notify_evening')
        .eq('id', sub.user_id)
        .single();

      if (!user) continue;
      if (type === 'morning' && !user.notify_morning) continue;
      if (type === 'evening' && !user.notify_evening) continue;

      // Данные для уведомления
      const { data: expenses } = await supabase
        .from('expenses')
        .select('amount')
        .eq('space_id', user.space_id)
        .gte('date', new Date().toISOString().slice(0, 10));

      const todaySpent = (expenses ?? []).reduce((s: number, e: { amount: number }) => s + e.amount, 0);

      const message = type === 'morning'
        ? `Доброе утро! Сегодня потрачено: ${todaySpent.toLocaleString('ru-KZ')} ₸`
        : `Итог дня: ${todaySpent.toLocaleString('ru-KZ')} ₸ потрачено`;

      // Отправить через push-notify функцию
      await supabase.functions.invoke('push-notify', {
        body: { subscription: sub.subscription, message, title: 'FamilyBudget' },
      });
    } catch (e) {
      console.error('Push error:', e);
    }
  }

  return new Response('OK');
});

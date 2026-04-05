import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const OPENROUTER_KEY = Deno.env.get('OPENROUTER_API_KEY') ?? '';

async function generateInsight(context: string): Promise<string> {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash-lite',
      messages: [
        {
          role: 'system',
          content: 'Ты финансовый советник для казахстанской семьи. Дай краткий (1-2 предложения) практичный совет на основе данных бюджета. Отвечай по-русски.',
        },
        { role: 'user', content: context },
      ],
      max_tokens: 150,
    }),
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? 'Продолжайте вести учёт расходов.';
}

Deno.serve(async (req) => {
  // Проверка секрета — защита от неавторизованных вызовов
  const secret = req.headers.get('x-cron-secret');
  const expectedSecret = Deno.env.get('CRON_SECRET');
  if (expectedSecret && secret !== expectedSecret) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { type = 'daily' } = await req.json().catch(() => ({}));

  // Получить все активные пространства
  const { data: spaces } = await supabase
    .from('spaces')
    .select('id');

  if (!spaces?.length) return new Response('No spaces');

  for (const space of spaces) {
    try {
      // Получить данные по пространству
      const today = new Date().toISOString().slice(0, 10);
      const monthStart = today.slice(0, 8) + '01';

      const [{ data: expenses }, { data: incomes }, { data: period }] = await Promise.all([
        supabase.from('expenses').select('amount, type, bank').eq('space_id', space.id).gte('date', monthStart).is('deleted_at', null),
        supabase.from('incomes').select('amount').eq('space_id', space.id).gte('date', monthStart).is('deleted_at', null),
        supabase.rpc('get_active_pay_period', { p_space_id: space.id }),
      ]);

      const totalExpenses = (expenses ?? []).reduce((s: number, e: { amount: number }) => s + e.amount, 0);
      const totalIncome = (period as { salary_amount?: number }[] | null)?.[0]?.salary_amount
        ?? (incomes ?? []).reduce((s: number, i: { amount: number }) => s + i.amount, 0);
      const safeToSpend = Math.max(0, totalIncome - totalExpenses);

      const context = `Бюджет: ${totalIncome.toLocaleString('ru-KZ')} ₸. Потрачено: ${totalExpenses.toLocaleString('ru-KZ')} ₸. Остаток: ${safeToSpend.toLocaleString('ru-KZ')} ₸. Тип отчёта: ${type}.`;

      const text = await generateInsight(context);

      await supabase.from('ai_insights').insert({
        space_id: space.id,
        text,
        type,
      });

      // Отправить push если пользователи давно не заходили
      const { data: users } = await supabase
        .from('app_users')
        .select('id')
        .eq('space_id', space.id);

      for (const user of (users ?? [])) {
        const { data: subs } = await supabase
          .from('push_subscriptions')
          .select('subscription')
          .eq('user_id', user.id);

        for (const sub of (subs ?? [])) {
          await supabase.functions.invoke('push-notify', {
            body: { subscription: sub.subscription, title: 'FamilyBudget', message: text },
          }).catch(() => {});
        }
      }
    } catch (e) {
      console.error('Error for space', space.id, e);
    }
  }

  return new Response('OK');
});

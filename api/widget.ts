// api/widget.ts — Vercel Serverless Function
// Возвращает safeToSpend и dailyLimit для iOS Scriptable виджета

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = SupabaseClient<any, any, any>;

const supabaseUrl = process.env.SUPABASE_URL ?? '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const authHeader = req.headers.authorization ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing token' });
  }

  const supabase: AnyClient = createClient(supabaseUrl, supabaseServiceKey);

  // Пробуем Supabase Auth
  const anonClient: AnyClient = createClient(supabaseUrl, supabaseAnonKey);
  const { data: { user }, error: authError } = await anonClient.auth.getUser(token);

  if (authError || !user) {
    // Кастомная auth — ищем session_token в app_users
    const { data: appUser } = await supabase
      .from('app_users')
      .select('space_id')
      .eq('session_token', token)
      .single();

    if (!appUser) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    return getWidgetData(supabase, appUser.space_id as string, res);
  }

  const { data: appUser } = await supabase
    .from('app_users')
    .select('space_id')
    .eq('auth_id', user.id)
    .single();

  if (!appUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  return getWidgetData(supabase, appUser.space_id as string, res);
}

async function getWidgetData(supabase: AnyClient, spaceId: string, res: VercelResponse) {
  const today = new Date().toISOString().split('T')[0];

  const { data: period } = await supabase
    .from('pay_periods')
    .select('start_date, end_date, salary_amount')
    .eq('space_id', spaceId)
    .eq('status', 'active')
    .lte('start_date', today)
    .gte('end_date', today)
    .single() as { data: { start_date: string; end_date: string; salary_amount: number } | null };

  if (!period) {
    return res.json({ safeToSpend: null, dailyLimit: null, hasPeriod: false });
  }

  const { data: expenses } = await supabase
    .from('expenses')
    .select('amount')
    .eq('space_id', spaceId)
    .gte('date', period.start_date)
    .lte('date', period.end_date) as { data: { amount: number }[] | null };

  const { data: incomes } = await supabase
    .from('incomes')
    .select('amount')
    .eq('space_id', spaceId)
    .gte('date', period.start_date)
    .lte('date', period.end_date) as { data: { amount: number }[] | null };

  const totalExpenses = (expenses ?? []).reduce((sum, e) => sum + e.amount, 0);
  const totalIncome = period.salary_amount + (incomes ?? []).reduce((sum, i) => sum + i.amount, 0);

  const start = new Date(period.start_date);
  const end = new Date(period.end_date);
  const now = new Date(today);

  const daysTotal = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1);
  const daysRemaining = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86400000) + 1);

  const safeToSpend = totalIncome - totalExpenses;
  const dailyLimit = daysRemaining > 0 ? Math.floor(safeToSpend / daysRemaining) : 0;

  return res.json({
    hasPeriod: true,
    safeToSpend: Math.round(safeToSpend),
    dailyLimit: Math.max(0, dailyLimit),
    daysRemaining,
    daysTotal,
    totalIncome: Math.round(totalIncome),
    totalExpenses: Math.round(totalExpenses),
  });
}

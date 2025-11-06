// Summarized stats for last 60 days
import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

type Row = {
  duration_sec: number | null;
  is_outdoor: boolean | null;
  type: string | null;
  start_time: string;          // ISO
  time_of_day: 'morning' | 'afternoon' | 'evening' | null;
};

export async function GET() {
  const supa = await supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const sinceISO = new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString();

  // pull what we need
  const { data: rows, error } = await supa
    .from('activities')
    .select('duration_sec,is_outdoor,type,start_time,time_of_day')
    .eq('user_id', user.id)
    .gte('start_time', sinceISO);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const list = (rows ?? []) as Row[];

  const activities = list.length;

  const avgDurationMin = activities
    ? Math.round(
        list.reduce((s, r) => s + (r.duration_sec ?? 0), 0) / activities / 60
      )
    : 0;

  const outdoorCount = list.reduce((s, r) => s + (r.is_outdoor ? 1 : 0), 0);
  const outdoorPct = activities ? Math.round((outdoorCount / activities) * 100) : 0;

  // most frequent type
  const typeCounts = new Map<string, number>();
  for (const r of list) {
    const t = r.type ?? 'other';
    typeCounts.set(t, (typeCounts.get(t) ?? 0) + 1);
  }
  const topType = [...typeCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

  // time-of-day chart
  const buckets = { morning: 0, afternoon: 0, evening: 0 };
  for (const r of list) {
    if (r.time_of_day === 'morning') buckets.morning++;
    else if (r.time_of_day === 'afternoon') buckets.afternoon++;
    else if (r.time_of_day === 'evening') buckets.evening++;
  }
  const chart = [
    { name: 'Morning', count: buckets.morning },
    { name: 'Afternoon', count: buckets.afternoon },
    { name: 'Evening', count: buckets.evening },
  ];

  // last sync from connections
  const { data: conn } = await supa
    .from('connections')
    .select('last_synced_at')
    .eq('user_id', user.id)
    .eq('provider', 'strava')
    .order('last_synced_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    lastSync: conn?.last_synced_at ?? null,
    totals: { activities, avgDurationMin, outdoorPct, topType },
    chart,
  });
}

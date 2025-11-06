// Richer stats for last 60 days
import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

type Row = {
  start_time: string; // ISO
  duration_sec: number | null;
  is_outdoor: boolean | null;
  type: string | null;
  duration_bucket: 'short' | 'medium' | 'long' | null;
  time_of_day: 'morning' | 'afternoon' | 'evening' | null;
};

function dayName(dateIso: string) {
  const d = new Date(dateIso);
  return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getUTCDay()];
}

export async function GET() {
  const supa = await supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const sinceMs = Date.now() - 60 * 24 * 3600 * 1000;
  const sinceISO = new Date(sinceMs).toISOString();

  const { data: rows, error } = await supa
    .from('activities')
    .select('start_time,duration_sec,is_outdoor,type,duration_bucket,time_of_day')
    .eq('user_id', user.id)
    .gte('start_time', sinceISO);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const list = (rows ?? []) as Row[];
  const activities = list.length;
  const minutes = Math.round(list.reduce((s, r) => s + (r.duration_sec ?? 0), 0) / 60);
  const outdoorPct = activities
    ? Math.round((list.reduce((s,r)=>s + (r.is_outdoor ? 1 : 0), 0) / activities) * 100)
    : 0;

  // typeDistribution
  const typeCounts = new Map<string, number>();
  for (const r of list) {
    const t = r.type ?? 'other';
    typeCounts.set(t, (typeCounts.get(t) ?? 0) + 1);
  }
  const typeDistribution = [...typeCounts.entries()]
    .map(([name,count]) => ({ name, count, pct: activities ? Math.round((count/activities)*100) : 0 }))
    .sort((a,b)=>b.count-a.count);

  // weekdayCounts
  const wdCounts = new Map<string, number>([['Mon',0],['Tue',0],['Wed',0],['Thu',0],['Fri',0],['Sat',0],['Sun',0]]);
  for (const r of list) {
    const n = dayName(r.start_time);
    wdCounts.set(n, (wdCounts.get(n) ?? 0) + 1);
  }
  const weekdayOrder = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const weekdayCounts = weekdayOrder.map(name => ({ name, count: wdCounts.get(name) ?? 0 }));

  // timeOfDayCounts
  const tod = { morning: 0, afternoon: 0, evening: 0 };
  for (const r of list) {
    if (r.time_of_day === 'morning') tod.morning++;
    else if (r.time_of_day === 'afternoon') tod.afternoon++;
    else if (r.time_of_day === 'evening') tod.evening++;
  }
  const timeOfDayCounts = [
    { name: 'Morning', count: tod.morning },
    { name: 'Afternoon', count: tod.afternoon },
    { name: 'Evening', count: tod.evening },
  ];

  // avgStartTime (HH:MM) in UTC
  const minutesOfDay = list.map(r => {
    const d = new Date(r.start_time);
    return d.getUTCHours() * 60 + d.getUTCMinutes();
  });
  const avgStartTime =
    minutesOfDay.length
      ? (() => {
          const m = Math.round(minutesOfDay.reduce((a,b)=>a+b,0)/minutesOfDay.length);
          const hh = String(Math.floor(m/60)).padStart(2,'0');
          const mm = String(m%60).padStart(2,'0');
          return `${hh}:${mm}`;
        })()
      : null;

  // commonDurationBucket
  const bucketCounts = new Map<string, number>();
  for (const r of list) {
    const b = r.duration_bucket ?? 'short';
    bucketCounts.set(b, (bucketCounts.get(b) ?? 0) + 1);
  }
  const commonDurationBucket = [...bucketCounts.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0] ?? null as
    | 'short' | 'medium' | 'long' | null;

  // longestStreakDays
  const days = new Set(
    list.map(r => new Date(r.start_time).toISOString().slice(0,10)) // YYYY-MM-DD
  );
  const sortedDays = [...days].sort();
  let longest = 0, current = 0, prev: string | null = null;
  for (const day of sortedDays) {
    if (!prev) { current = 1; }
    else {
      const diff =
        (new Date(day).getTime() - new Date(prev).getTime()) / (24*3600*1000);
      current = diff === 1 ? current + 1 : 1;
    }
    longest = Math.max(longest, current);
    prev = day;
  }

  return NextResponse.json({
    range: { sinceISO, days: 60 },
    totals: { activities, minutes, outdoorPct },
    typeDistribution,
    weekdayCounts,
    timeOfDayCounts,
    avgStartTime,
    commonDurationBucket,
    longestStreakDays: longest,
  });
}

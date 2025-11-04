import { NextResponse } from 'next/server';
import axios from 'axios';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// --- helpers: light normalization ---
function toDurationBucket(sec: number) {
  if (sec < 20 * 60) return 'short';
  if (sec < 45 * 60) return 'medium';
  return 'long';
}
function toTimeOfDay(dateIso: string) {
  const h = new Date(dateIso).getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}
function mapType(stravaType: string) {
  // raw -> canonical type + meta category
  const t = stravaType;
  if (['Run'].includes(t)) return { type: 'run', meta: 'endurance' };
  if (['Ride', 'VirtualRide'].includes(t)) return { type: 'ride', meta: 'endurance' };
  if (['Walk'].includes(t)) return { type: 'walk', meta: 'endurance' };
  if (['Hike'].includes(t)) return { type: 'hike', meta: 'endurance' };
  if (['Swim'].includes(t)) return { type: 'swim', meta: 'endurance' };
  if (['Yoga'].includes(t)) return { type: 'yoga', meta: 'mindful' };
  if (['WeightTraining'].includes(t)) return { type: 'strength', meta: 'strength' };
  if (['Workout', 'Crossfit', 'HIIT'].includes(t)) return { type: 'hiit', meta: 'strength' };
  return { type: 'other', meta: 'endurance' };
}

export async function GET() {
  try {
    // 1) Get the most recent Strava connection (we have only your account for now)
    const { data: conn, error: connErr } = await supabaseAdmin
      .from('connections')
      .select('*')
      .eq('provider', 'strava')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    if (connErr || !conn) {
      return NextResponse.json({ ok: false, error: 'No Strava connection found' }, { status: 400 });
    }

    const accessToken = conn.access_token as string;

    // 2) Build "after" param for last 30 days
    const days60 = Math.floor((Date.now() - 60 * 24 * 3600 * 1000) / 1000);

    // 3) Fetch pages of activities
    const all: any[] = [];
    let page = 1;
    while (true) {
      const res = await axios.get('https://www.strava.com/api/v3/athlete/activities', {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { after: days60, page, per_page: 50 },
      });
      const arr = res.data as any[];
      all.push(...arr);
      if (arr.length < 50) break; // no more pages
      page++;
    }

    if (all.length === 0) {
      return NextResponse.json({ ok: true, imported: 0 });
    }

    // 4) Normalize & upsert into Supabase
    const rows = all.map((a) => {
      const { type, meta } = mapType(a.type);
      const startIso = a.start_date; // UTC ISO
      const duration = Math.round(a.moving_time ?? a.elapsed_time ?? 0);
      const isOutdoor = a.trainer ? false : true; // Strava 'trainer' flag for indoor (treat virtual as indoor)
      return {
        id: a.id,
        user_id: conn.user_id,
        type,
        subtype: a.type,
        start_time: startIso,
        duration_sec: duration,
        distance_m: a.distance ?? null,
        is_outdoor: isOutdoor,
        meta_category: meta,
        duration_bucket: toDurationBucket(duration),
        time_of_day: toTimeOfDay(startIso),
        raw: a,
      };
    });

    // Upsert (insert or update on conflict id)
    const { error: upsertErr } = await supabaseAdmin
      .from('activities')
      .upsert(rows, { onConflict: 'id' });
    if (upsertErr) {
      console.error('Upsert error', upsertErr);
      return NextResponse.json({ ok: false, error: upsertErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, imported: rows.length });
  } catch (e: any) {
    console.error('Sync error', e?.response?.data || e.message);
    return NextResponse.json({ ok: false, error: 'Sync failed' }, { status: 500 });
  }
}


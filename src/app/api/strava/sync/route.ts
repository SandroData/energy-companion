// Force Node runtime (Axios + Node APIs)
export const runtime = 'nodejs';

import { NextResponse } from "next/server";
import axios, { AxiosError, AxiosResponse } from "axios";
import { supabaseServer } from '@/lib/supabaseServer';
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/** Types */
type StravaActivity = {
  id: number;
  type: string;
  start_date: string; // ISO UTC
  moving_time?: number;
  elapsed_time?: number;
  distance?: number;
  trainer?: boolean; // indoor if true
};

/** Helpers */
function toDurationBucket(sec: number) {
  if (sec < 20 * 60) return "short";
  if (sec < 45 * 60) return "medium";
  return "long";
}
function toTimeOfDay(dateIso: string) {
  const h = new Date(dateIso).getUTCHours(); // bucketing OK in UTC
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}
function mapType(stravaType: string): { type: string; meta: string } {
  const t = stravaType;
  if (t === "Run") return { type: "run", meta: "endurance" };
  if (t === "Ride" || t === "VirtualRide") return { type: "ride", meta: "endurance" };
  if (t === "Walk") return { type: "walk", meta: "endurance" };
  if (t === "Hike") return { type: "hike", meta: "endurance" };
  if (t === "Swim") return { type: "swim", meta: "endurance" };
  if (t === "Yoga") return { type: "yoga", meta: "mindful" };
  if (t === "WeightTraining") return { type: "strength", meta: "strength" };
  if (t === "Workout" || t === "Crossfit" || t === "HIIT") return { type: "hiit", meta: "strength" };
  return { type: "other", meta: "endurance" };
}

/** Refresh helper */
async function refreshAccessToken(conn: any): Promise<string> {
  if (!conn.refresh_token) throw new Error('No refresh_token stored');
  const r = await axios.post('https://www.strava.com/oauth/token', {
    client_id: process.env.STRAVA_CLIENT_ID,
    client_secret: process.env.STRAVA_CLIENT_SECRET,
    grant_type: 'refresh_token',
    refresh_token: conn.refresh_token,
  });
  const { access_token: newAccess, refresh_token: newRefresh, expires_at: newExpSec } = r.data ?? {};
  if (!newAccess) throw new Error('No access_token in refresh response');

  // convert epoch seconds -> ISO for timestamptz column
  const expiresAtIso = newExpSec ? new Date(newExpSec * 1000).toISOString() : null;

  const { error: updErr } = await supabaseAdmin
    .from('connections')
    .update({
      access_token: newAccess,
      refresh_token: newRefresh ?? conn.refresh_token,
      expires_at: expiresAtIso,
    })
    .eq('id', conn.id);
  if (updErr) console.warn('Could not persist refreshed token:', updErr.message);

  return newAccess;
}

/** Main sync (POST) */
export async function POST() {
  const supa = await supabaseServer();
const { data: { user } } = await supa.auth.getUser();
if (!user) return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });

const { data: conn, error: connErr } = await supabaseAdmin
  .from('connections')
  .select('*')
  .eq('provider', 'strava')
  .eq('user_id', user.id)     // 🔒 only this user’s connection
  .order('created_at', { ascending: false })
  .limit(1)
  .single();
  try {
    // Get latest connection
    const { data: conn, error: connErr } = await supabaseAdmin
      .from("connections")
      .select("*")
      .eq("provider", "strava")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (connErr || !conn) {
      return NextResponse.json({ ok: false, error: "No Strava connection found" }, { status: 400 });
    }

    let accessToken = String(conn.access_token);

    // --- Refresh token if expired ---
    const now = Math.floor(Date.now() / 1000);
    const exp = conn.expires_at
      ? Math.floor(new Date(conn.expires_at as string).getTime() / 1000)
      : null;

    if (exp && exp < now + 60) {
      try {
        accessToken = await refreshAccessToken(conn);
      } catch (err) {
        console.error("Token refresh failed:", (err as Error).message);
        return NextResponse.json({ ok: false, error: "Token refresh failed" }, { status: 401 });
      }
    }

    // --- Fetch last 60 days ---
    const afterUnix = Math.floor((Date.now() - 60 * 24 * 3600 * 1000) / 1000);
    const all: StravaActivity[] = [];
    let page = 1;
    let triedRefresh = false;

    while (true) {
      try {
        const res: AxiosResponse<StravaActivity[]> = await axios.get(
          "https://www.strava.com/api/v3/athlete/activities",
          {
            headers: { Authorization: `Bearer ${accessToken}` },
            params: { after: afterUnix, page, per_page: 50 },
          }
        );
        const arr = res.data ?? [];
        all.push(...arr);
        if (arr.length < 50) break;
        page++;
      } catch (e) {
        const ax = e as AxiosError;
        const status = ax.response?.status;

        // Retry once on 401
        if (status === 401 && !triedRefresh) {
          triedRefresh = true;
          try {
            accessToken = await refreshAccessToken(conn);
            continue;
          } catch (refreshErr) {
            console.error("Token refresh failed:", (refreshErr as Error).message);
            return NextResponse.json({ ok: false, error: "Token refresh failed" }, { status: 401 });
          }
        }

        const body = ax.response?.data;
        console.error("Strava activities fetch failed:", status, body);
        return NextResponse.json({ ok: false, error: `Strava fetch failed (${status})`, details: body }, { status: status || 500 });
      }
    }

    // --- Save data ---
    if (all.length > 0) {
      const rows = all.map((a) => {
        const { type, meta } = mapType(a.type);
        const startIso = a.start_date;
        const duration = Math.round(a.moving_time ?? a.elapsed_time ?? 0);
        const isOutdoor = a.trainer ? false : true;
        return {
          id: a.id,
          user_id: conn.user_id as string,
          type,
          subtype: a.type,
          start_time: startIso,
          duration_sec: duration,
          distance_m: a.distance ?? null,
          is_outdoor: isOutdoor,
          meta_category: meta,
          duration_bucket: toDurationBucket(duration),
          time_of_day: toTimeOfDay(startIso),
          raw: a as unknown,
        };
      });

      const { error: upsertErr } = await supabaseAdmin
        .from("activities")
        .upsert(rows, { onConflict: "id" });
      if (upsertErr) {
        console.error("Upsert error", upsertErr.message);
        return NextResponse.json({ ok: false, error: upsertErr.message }, { status: 500 });
      }
    }

    // --- Stamp last sync ---
    const { error: stampErr } = await supabaseAdmin
      .from("connections")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("id", conn.id);
    if (stampErr) console.warn("Could not update last_synced_at:", stampErr.message);

    return NextResponse.json({ ok: true, imported: all.length });
  } catch (e) {
    const msg =
      (e as { response?: { data?: unknown }; message?: string })?.response?.data ??
      (e as Error)?.message ??
      "Sync failed";
    console.error("Sync error", msg);
    return NextResponse.json({ ok: false, error: String(msg) }, { status: 500 });
  }
}

/** Optional: allow GET for manual testing */
export const GET = POST;



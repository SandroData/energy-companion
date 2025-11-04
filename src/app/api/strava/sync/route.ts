import { NextResponse } from "next/server";
import axios, { AxiosResponse } from "axios";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type StravaActivity = {
  id: number;
  type: string;
  start_date: string; // ISO UTC
  moving_time?: number;
  elapsed_time?: number;
  distance?: number;
  trainer?: boolean; // indoor if true
};

function toDurationBucket(sec: number) {
  if (sec < 20 * 60) return "short";
  if (sec < 45 * 60) return "medium";
  return "long";
}

function toTimeOfDay(dateIso: string) {
  const h = new Date(dateIso).getUTCHours(); // UTC is fine for buckets
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}

function mapType(stravaType: string): { type: string; meta: string } {
  const t = stravaType;
  if (["Run"].includes(t)) return { type: "run", meta: "endurance" };
  if (["Ride", "VirtualRide"].includes(t)) return { type: "ride", meta: "endurance" };
  if (["Walk"].includes(t)) return { type: "walk", meta: "endurance" };
  if (["Hike"].includes(t)) return { type: "hike", meta: "endurance" };
  if (["Swim"].includes(t)) return { type: "swim", meta: "endurance" };
  if (["Yoga"].includes(t)) return { type: "yoga", meta: "mindful" };
  if (["WeightTraining"].includes(t)) return { type: "strength", meta: "strength" };
  if (["Workout", "Crossfit", "HIIT"].includes(t)) return { type: "hiit", meta: "strength" };
  return { type: "other", meta: "endurance" };
}

export async function GET() {
  try {
    // get latest Strava connection
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

    const accessToken = String(conn.access_token);

    // last 60 days
    const afterUnix = Math.floor((Date.now() - 60 * 24 * 3600 * 1000) / 1000);

    const all: StravaActivity[] = [];
    let page = 1;
    while (true) {
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
    }

    if (all.length === 0) {
      return NextResponse.json({ ok: true, imported: 0 });
    }

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

    return NextResponse.json({ ok: true, imported: rows.length });
  } catch (e) {
    const msg =
      (e as { response?: { data?: unknown }; message?: string })?.response?.data ??
      (e as Error)?.message ??
      "Sync failed";
    console.error("Sync error", msg);
    return NextResponse.json({ ok: false, error: "Sync failed" }, { status: 500 });
  }
}


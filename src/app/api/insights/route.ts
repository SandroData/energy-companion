import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type ActivityRow = {
  type: string | null;
  subtype: string | null;
  duration_sec: number | null;
  is_outdoor: boolean | null;
  time_of_day: string | null;
};

function percent(part: number, total: number) {
  return total === 0 ? 0 : Math.round((part / total) * 100);
}

export async function GET() {
  try {
    const { data: acts, error } = await supabaseAdmin
      .from("activities")
      .select("type, subtype, duration_sec, is_outdoor, time_of_day");

    if (error) throw error;

    const activities = (acts ?? []) as ActivityRow[];
    if (activities.length === 0) {
      return NextResponse.json({ ok: true, insights: null });
    }

    const total = activities.length;
    const avgDuration =
      activities.reduce((sum, a) => sum + (a.duration_sec ?? 0), 0) / total;

    const typeCounts: Record<string, number> = {};
    for (const a of activities) {
      const key = a.type ?? "unknown";
      typeCounts[key] = (typeCounts[key] ?? 0) + 1;
    }
    const topType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    const timeCounts: Record<string, number> = {};
    for (const a of activities) {
      const key = a.time_of_day ?? "unknown";
      timeCounts[key] = (timeCounts[key] ?? 0) + 1;
    }
    const topTime = Object.entries(timeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    const outdoorPct = percent(
      activities.filter((a) => Boolean(a.is_outdoor)).length,
      total
    );

    const insights = {
      total_activities: total,
      top_type: topType,
      top_time_of_day: topTime,
      avg_duration_min: Math.round(avgDuration / 60),
      outdoor_pct: outdoorPct,
    };

    return NextResponse.json({ ok: true, insights });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("Insights error", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}


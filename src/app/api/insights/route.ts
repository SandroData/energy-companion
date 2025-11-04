import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// --- helpers ---
function percent(part: number, total: number) {
  return total === 0 ? 0 : Math.round((part / total) * 100);
}

export async function GET() {
  try {
    const { data: acts, error } = await supabaseAdmin
      .from("activities")
      .select("type, subtype, duration_sec, is_outdoor, time_of_day");
    if (error) throw error;

    if (!acts || acts.length === 0) {
      return NextResponse.json({ ok: true, insights: null });
    }

    const total = acts.length;
    const avgDuration =
      acts.reduce((sum, a) => sum + (a.duration_sec ?? 0), 0) / total;

    // most common type
    const typeCounts: Record<string, number> = {};
    acts.forEach((a) => {
      typeCounts[a.type] = (typeCounts[a.type] ?? 0) + 1;
    });
    const topType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

    // time of day distribution
    const timeCounts: Record<string, number> = {};
    acts.forEach((a) => {
      timeCounts[a.time_of_day] = (timeCounts[a.time_of_day] ?? 0) + 1;
    });
    const topTime = Object.entries(timeCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

    const outdoorPct = percent(
      acts.filter((a) => a.is_outdoor).length,
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
  } catch (e: any) {
    console.error("Insights error", e.message);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

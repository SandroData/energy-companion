"use client";

import { useEffect, useState } from "react";

type Insights = {
  total_activities: number;
  top_type: string | null;
  top_time_of_day: string | null;
  avg_duration_min: number;
  outdoor_pct: number;
};

type ApiResponse =
  | { ok: true; insights: Insights | null }
  | { ok: false; error: string };

export default function InsightsPage() {
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/insights")
      .then((res) => res.json() as Promise<ApiResponse>)
      .then((data) => {
        if ("ok" in data && data.ok) setInsights(data.insights ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8">Loading insights...</div>;
  if (!insights) return <div className="p-8">No activity data found.</div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Training Insights</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        <Card label="Total Activities" value={insights.total_activities} />
        <Card label="Avg Duration (min)" value={insights.avg_duration_min} />
        <Card label="Outdoor Sessions" value={`${insights.outdoor_pct}%`} />
        <Card label="Most Common Activity" value={insights.top_type ?? "—"} />
        <Card label="Favorite Time of Day" value={insights.top_time_of_day ?? "—"} />
      </div>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="p-4 bg-white border rounded-xl shadow-sm flex items-center justify-between">
      <span className="text-gray-600">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}


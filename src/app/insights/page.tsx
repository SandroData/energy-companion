"use client";

import { useEffect, useState } from "react";

export default function InsightsPage() {
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/insights")
      .then((res) => res.json())
      .then((data) => {
        setInsights(data.insights);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading insights:", err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-8">Loading insights...</div>;
  if (!insights) return <div className="p-8">No activity data found.</div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Training Insights</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        <div className="p-4 bg-blue-100 rounded-xl shadow">
          <p className="text-4xl font-bold">{insights.total_activities}</p>
          <p className="text-sm text-gray-700">Total Activities</p>
        </div>

        <div className="p-4 bg-green-100 rounded-xl shadow">
          <p className="text-4xl font-bold">{insights.avg_duration_min}</p>
          <p className="text-sm text-gray-700">Avg Duration (min)</p>
        </div>

        <div className="p-4 bg-yellow-100 rounded-xl shadow">
          <p className="text-4xl font-bold">{insights.outdoor_pct}%</p>
          <p className="text-sm text-gray-700">Outdoor Sessions</p>
        </div>

        <div className="p-4 bg-purple-100 rounded-xl shadow">
          <p className="text-2xl font-bold">{insights.top_type}</p>
          <p className="text-sm text-gray-700">Most Common Activity</p>
        </div>

        <div className="p-4 bg-pink-100 rounded-xl shadow">
          <p className="text-2xl font-bold">{insights.top_time_of_day}</p>
          <p className="text-sm text-gray-700">Favorite Time of Day</p>
        </div>
      </div>
    </div>
  );
}

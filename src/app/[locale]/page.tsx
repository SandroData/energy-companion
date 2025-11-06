// src/app/[locale]/page.tsx
import React from 'react'
import { headers } from 'next/headers'
import { getTranslations } from 'next-intl/server'
import SyncButton from '@/components/SyncButton'
import TimeOfDayBar from '@/components/TimeOfDayBar'
import { supabaseServer } from '@/lib/supabaseServer'
import { AuthStatus } from '@/components/AuthStatus'

export const dynamic = 'force-dynamic'

// --- Types ---
type SummaryResponse = {
  lastSync: string | null
  totals: { activities: number; avgDurationMin: number; outdoorPct: number; topType?: string }
  chart: { name: string; count: number }[]
}

type DetailResponse = {
  range: { sinceISO: string; days: number }
  totals: { activities: number; minutes: number; outdoorPct: number }
  typeDistribution: { name: string; count: number; pct: number }[]
  weekdayCounts: { name: string; count: number }[]
  timeOfDayCounts: { name: string; count: number }[]
  avgStartTime: string | null
  commonDurationBucket: 'short' | 'medium' | 'long' | null
  longestStreakDays: number
}

// --- Data loaders ---
// --- Data loaders ---
import { headers as nextHeaders } from 'next/headers';

// helper that builds absolute URL + forwards cookies to preserve session
async function apiFetch(path: string) {
  const h = await nextHeaders();
  const cookie = h.get('cookie') ?? '';
  const host = h.get('x-forwarded-host') ?? h.get('host');
  const proto = h.get('x-forwarded-proto') ?? (process.env.NODE_ENV === 'production' ? 'https' : 'http');
  const url = `${proto}://${host}${path}`;
  return fetch(url, {
    headers: { cookie },
    cache: 'no-store',
  });
}

async function getSummary(): Promise<Partial<SummaryResponse>> {
  try {
    const res = await apiFetch('/api/stats/summary');
    if (!res.ok) return {};
    return await res.json();
  } catch {
    return {};
  }
}

async function getDetail(): Promise<DetailResponse | null> {
  const res = await apiFetch('/api/stats/detail');
  if (!res.ok) return null;
  return res.json();
}


// --- Page ---
export default async function Page() {
  const t = await getTranslations('Dashboard');

  const supa = await supabaseServer();
  const { data: { user } } = await supa.auth.getUser();

  const summary = await getSummary();
  const detail = await getDetail();

  // ✅ safe defaults if API is missing fields
  const lastSync = summary?.lastSync ?? null;
  const totals = summary?.totals ?? { activities: 0, avgDurationMin: 0, outdoorPct: 0, topType: '—' };
  const chart = Array.isArray(summary?.chart)
    ? summary!.chart!
    : [
        { name: 'Morning', count: 0 },
        { name: 'Afternoon', count: 0 },
        { name: 'Evening', count: 0 },
      ];

  const stats = [
    { label: t('lastSync'), value: lastSync ? new Date(lastSync).toLocaleString() : '—' },
    { label: t('totalActivities'), value: String(totals.activities ?? 0) },
    { label: t('avgDuration'), value: String(totals.avgDurationMin ?? 0) },
    { label: t('outdoorPct'), value: `${totals.outdoorPct ?? 0}%` },
  ];

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
        <div className="flex items-center gap-4">
          <AuthStatus email={user?.email ?? null} />
          <SyncButton />
        </div>
      </header>

      {/* Core stats */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="p-4 bg-white border rounded-xl shadow-sm text-gray-900">
            <div className="text-sm text-gray-500">{s.label}</div>
            <div className="mt-1 text-2xl font-bold">{s.value}</div>
          </div>
        ))}
      </section>

      {/* Enriched stats */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white border rounded-xl shadow-sm text-gray-900">
          <div className="text-sm text-gray-500">{t('mostFrequentSport')}</div>
          <div className="mt-1 text-2xl font-bold">
            {detail?.typeDistribution?.[0]?.name ?? '—'}
          </div>
        </div>
        <div className="p-4 bg-white border rounded-xl shadow-sm text-gray-900">
          <div className="text-sm text-gray-500">{t('avgStartTime')}</div>
          <div className="mt-1 text-2xl font-bold">
            {detail?.avgStartTime ?? '—'}
          </div>
        </div>
        <div className="p-4 bg-white border rounded-xl shadow-sm text-gray-900">
          <div className="text-sm text-gray-500">{t('longestStreak')}</div>
          <div className="mt-1 text-2xl font-bold">
            {detail?.longestStreakDays ?? 0} {t('days')}
          </div>
        </div>
        <div className="p-4 bg-white border rounded-xl shadow-sm text-gray-900">
          <div className="text-sm text-gray-500">{t('preferredDuration')}</div>
          <div className="mt-1 text-2xl font-bold">
            {detail?.commonDurationBucket ?? '—'}
          </div>
        </div>
      </section>

      {/* Chart */}
      <section className="w-full">
        <TimeOfDayBar data={chart} />
      </section>
    </main>
  );
}

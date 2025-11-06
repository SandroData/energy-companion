'use client';
import * as React from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function SyncButton() {
  const supabase = createClientComponentClient();
  const [loading, setLoading] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  async function connectToStrava() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alert('Please log in first.');

    const siteUrl = window.location.origin; // ← never undefined in browser
    const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID ?? '183956';

    const state = encodeURIComponent(JSON.stringify({ u: user.id, r: '/dashboard' }));
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: `${siteUrl}/api/strava/oauth/callback`,
      response_type: 'code',
      scope: 'activity:read_all',
      state,
    });

    window.location.href = `https://www.strava.com/oauth/authorize?${params.toString()}`;
  }

  async function runSync() {
    setLoading(true); setMsg(null);
    try {
      const res = await fetch('/api/strava/sync', { method: 'POST' });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || 'Sync failed');
      setMsg(`Imported ${body.imported} activities`);
    } catch (e:any) {
      setMsg(`❌ ${e.message}`);
    } finally { setLoading(false); }
  }

  return (
    <div className="flex items-center gap-3">
      <button onClick={connectToStrava} className="px-3 py-1 rounded bg-orange-500 text-white text-sm">
        Connect Strava
      </button>
      <button onClick={runSync} className="px-3 py-1 rounded bg-gray-900 text-white text-sm">
        Sync Strava
      </button>
      {msg && <span className="text-xs text-gray-600">{msg}</span>}
    </div>
  );
}
